import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import { parse } from "csv-parse/sync";

const CHANNELS_ALLOWED = [
  "SUPPORT_TICKET",
  "APP_STORE_REVIEW",
  "NPS_SURVEY",
  "SALES_NOTE",
  "COMMUNITY_POST",
] as const;

/** Normalize header keys so "Customer Label", "customer_label", "customerLabel" all match. */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Pick the most likely delimiter from the header line. */
function detectDelimiter(csvText: string): string {
  const firstLine = csvText.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  // Ignore commas/semicolons inside quotes when counting
  const stripQuoted = firstLine.replace(/"[^"]*"/g, "");
  const counts: Record<string, number> = {
    ",": (stripQuoted.match(/,/g) || []).length,
    ";": (stripQuoted.match(/;/g) || []).length,
    "\t": (stripQuoted.match(/\t/g) || []).length,
    "|": (stripQuoted.match(/\|/g) || []).length,
  };
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : ",";
}

/** Case/space/underscore-insensitive column lookup. */
function getValue(row: Record<string, unknown>, candidateKeys: string[]): string {
  const normalizedRow = new Map<string, unknown>();
  for (const [rk, rv] of Object.entries(row)) {
    normalizedRow.set(normalizeKey(rk), rv);
  }
  for (const key of candidateKeys) {
    const val = normalizedRow.get(normalizeKey(key));
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return "";
}

/** Map free-form channel labels to allowed enum values. */
function normalizeChannel(raw: string): string {
  if (!raw) return "SUPPORT_TICKET";

  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if ((CHANNELS_ALLOWED as readonly string[]).includes(upper)) return upper;

  const compact = normalizeKey(raw);
  const aliases: Record<string, string> = {
    support: "SUPPORT_TICKET",
    supportticket: "SUPPORT_TICKET",
    ticket: "SUPPORT_TICKET",
    zendesk: "SUPPORT_TICKET",
    appstore: "APP_STORE_REVIEW",
    appstorereview: "APP_STORE_REVIEW",
    review: "APP_STORE_REVIEW",
    appreview: "APP_STORE_REVIEW",
    nps: "NPS_SURVEY",
    npssurvey: "NPS_SURVEY",
    survey: "NPS_SURVEY",
    surveymonkey: "NPS_SURVEY",
    sales: "SALES_NOTE",
    salesnote: "SALES_NOTE",
    salescall: "SALES_NOTE",
    hubspot: "SALES_NOTE",
    community: "COMMUNITY_POST",
    communitypost: "COMMUNITY_POST",
    forum: "COMMUNITY_POST",
    slack: "COMMUNITY_POST",
  };

  return aliases[compact] || "SUPPORT_TICKET";
}

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    let csvText = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (file && typeof file === "object" && "text" in file && typeof (file as File).text === "function") {
        csvText = await (file as File).text();
      }

      // Prefer file contents; fall back to pasted text field
      if (!csvText.trim()) {
        csvText = String(formData.get("csvText") || "");
      }
    } else {
      const body = await req.json().catch(() => ({} as { csvText?: string }));
      csvText = body.csvText || "";
    }

    // Strip UTF-8 BOM and trim outer whitespace (keep internal newlines)
    csvText = csvText.replace(/^\uFEFF/, "").trim();

    if (!csvText) {
      return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
    }

    // Guard: if someone pasted a single blob without newlines/headers, fail clearly
    if (!csvText.includes("\n") && !csvText.includes(",")) {
      return NextResponse.json(
        { error: "CSV appears to be a single line without columns. Expected headers like content, channel, customerLabel." },
        { status: 400 }
      );
    }

    const delimiter = detectDelimiter(csvText);

    let records: Record<string, unknown>[] = [];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        relax_quotes: true,
        delimiter,
        // Skip duplicate header rows that sometimes appear mid-file
        on_record: (record: Record<string, unknown>) => {
          const values = Object.values(record).map((v) => String(v ?? "").trim().toLowerCase());
          const keys = Object.keys(record).map((k) => k.trim().toLowerCase());
          // Drop rows that merely repeat the header labels
          if (values.length > 0 && values.every((v, i) => v === keys[i])) {
            return null;
          }
          return record;
        },
      }) as Record<string, unknown>[];
    } catch (parseErr: unknown) {
      const message = parseErr instanceof Error ? parseErr.message : "Invalid CSV formatting.";
      return NextResponse.json({ error: `CSV Syntax Error: ${message}` }, { status: 400 });
    }

    // csv-parse may leave nulls from on_record filters
    records = (records || []).filter((r) => r && typeof r === "object");

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or missing headers (e.g. content, channel, customerLabel)." },
        { status: 400 }
      );
    }

    // Validate that at least one recognized content column exists on the first data row
    const sampleContent = getValue(records[0], [
      "content",
      "feedback",
      "text",
      "message",
      "description",
      "comment",
      "review",
      "notes",
      "body",
    ]);
    if (!sampleContent) {
      const headers = Object.keys(records[0] || {}).join(", ");
      return NextResponse.json(
        {
          error: `Could not find a feedback content column. Found headers: [${headers}]. Expected one of: content, feedback, text, message, comment.`,
        },
        { status: 400 }
      );
    }

    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    // Map lowercase name → id, and keep original names for the classifier prompt
    const themeMap: Record<string, string> = {};
    const themeNames: string[] = [];
    existingThemes.forEach((t: { id: string; name: string }) => {
      themeMap[t.name.toLowerCase()] = t.id;
      themeNames.push(t.name);
    });

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const importedPreview: Array<{
      content: string;
      channel: string;
      customerLabel: string;
      sourceRef: string;
      sentiment: string;
      themeName: string;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const content = getValue(row, [
        "content",
        "feedback",
        "text",
        "message",
        "description",
        "comment",
        "review",
        "notes",
        "body",
      ]);

      if (!content || content.length < 3) {
        failedCount++;
        errors.push(`Row #${i + 1}: Missing or invalid 'content' field.`);
        continue;
      }

      // Avoid re-importing a whole CSV blob as a single cell
      if (content.includes("\n") && /content/i.test(content) && /channel/i.test(content)) {
        failedCount++;
        errors.push(
          `Row #${i + 1}: Content looks like a full CSV document. Use Bulk CSV Upload with proper row/column formatting.`
        );
        continue;
      }

      const rawChannel = getValue(row, ["channel", "source", "type", "medium", "origin"]);
      const channel = normalizeChannel(rawChannel);

      const customerLabel =
        getValue(row, [
          "customerlabel",
          "customer_label",
          "customer label",
          "customer",
          "user",
          "email",
          "client",
          "name",
          "company",
          "account",
        ]) || "CSV Upload";

      const sourceRef =
        getValue(row, ["sourceref", "source_ref", "source ref", "ref", "id", "ticket", "ticketid", "ticket_id"]) ||
        `CSV-${Date.now().toString().slice(-4)}-${i + 1}`;

      try {
        const classification = await classifyFeedback(content, themeNames);

        let themeId = themeMap[classification.themeName.toLowerCase()];
        if (!themeId) {
          // Fuzzy match: theme name contained in either direction
          const lowerTheme = classification.themeName.toLowerCase();
          const fuzzy = Object.keys(themeMap).find(
            (name) => name.includes(lowerTheme) || lowerTheme.includes(name)
          );
          themeId = fuzzy ? themeMap[fuzzy] : "";
        }

        if (!themeId) {
          const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
          const newTheme = await prisma.theme.create({
            data: {
              name: classification.themeName,
              description: `Auto-created from CSV import for ${classification.featureArea}.`,
              color: colors[Math.floor(Math.random() * colors.length)],
              workspaceId: user.workspaceId,
            },
          });
          themeId = newTheme.id;
          themeMap[classification.themeName.toLowerCase()] = newTheme.id;
          themeNames.push(classification.themeName);
        }

        const feedback = await prisma.feedback.create({
          data: {
            content,
            channel,
            sourceRef,
            customerLabel,
            sentiment: classification.sentiment,
            sentimentScore: classification.sentimentScore,
            status: "NEW",
            featureArea: classification.featureArea,
            rationale: classification.rationale,
            workspaceId: user.workspaceId,
          },
        });

        await prisma.feedbackTheme.create({
          data: {
            feedbackId: feedback.id,
            themeId,
            confidence: 0.9,
          },
        });

        const keywords = content
          .toLowerCase()
          .split(/\W+/)
          .filter((w: string) => w.length > 3);
        await prisma.embedding.create({
          data: {
            feedbackId: feedback.id,
            vectorJson: JSON.stringify(keywords),
          },
        });

        importedCount++;
        if (importedPreview.length < 5) {
          importedPreview.push({
            content: content.length > 120 ? content.slice(0, 117) + "…" : content,
            channel,
            customerLabel,
            sourceRef,
            sentiment: classification.sentiment,
            themeName: classification.themeName,
          });
        }
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : "Failed to process item.";
        errors.push(`Row #${i + 1}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: records.length,
        importedCount,
        failedCount,
        delimiter: delimiter === "\t" ? "tab" : delimiter,
        errors: errors.slice(0, 8),
        preview: importedPreview,
      },
    });
  } catch (error: unknown) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV file. Ensure valid headers (content, channel, customerLabel)." },
      { status: 500 }
    );
  }
}
