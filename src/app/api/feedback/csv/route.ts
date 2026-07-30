import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import { parse } from "csv-parse/sync";

export async function POST(req: Request) {
  // Enforce role guard: ADMIN or ANALYST
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let csvText = "";

    if (file) {
      csvText = await file.text();
    } else {
      const body = await req.json().catch(() => ({}));
      csvText = body.csvText || "";
    }

    if (!csvText || csvText.trim() === "") {
      return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
    }

    // Parse CSV rows
    const records: Record<string, any>[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or missing headers." }, { status: 400 });
    }

    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    const themeMap: Record<string, string> = {};
    existingThemes.forEach((t: any) => (themeMap[t.name.toLowerCase()] = t.id));

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const channelsAllowed = [
      "SUPPORT_TICKET",
      "APP_STORE_REVIEW",
      "NPS_SURVEY",
      "SALES_NOTE",
      "COMMUNITY_POST",
    ];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const content = row.content || row.Content || row.text || row.Text || row.feedback || row.Feedback;

      if (!content || typeof content !== "string" || content.trim().length < 3) {
        failedCount++;
        errors.push(`Row #${i + 1}: Missing or invalid 'content' field.`);
        continue;
      }

      let rawChannel = (row.channel || row.Channel || "SUPPORT_TICKET").toUpperCase().replace(/\s+/g, "_");
      if (!channelsAllowed.includes(rawChannel)) {
        rawChannel = "SUPPORT_TICKET";
      }

      const customerLabel = row.customerLabel || row.customer_label || row.customer || row.user || "CSV Upload";
      const sourceRef = row.sourceRef || row.source_ref || `CSV-${Date.now().toString().slice(-4)}-${i + 1}`;

      try {
        const classification = await classifyFeedback(content, Object.keys(themeMap));

        let themeId = themeMap[classification.themeName.toLowerCase()];
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
        }

        const feedback = await prisma.feedback.create({
          data: {
            content: content.trim(),
            channel: rawChannel,
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

        const keywords = content.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
        await prisma.embedding.create({
          data: {
            feedbackId: feedback.id,
            vectorJson: JSON.stringify(keywords),
          },
        });

        importedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Row #${i + 1}: ${err?.message || "Failed to process item."}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: records.length,
        importedCount,
        failedCount,
        errors: errors.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV file. Ensure valid headers (content, channel, customerLabel)." },
      { status: 500 }
    );
  }
}
