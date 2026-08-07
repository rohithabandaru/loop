import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import {
  parseCsvWithPapa,
  parseExcelBuffer,
  detectFileType,
  validateAndProcessRows,
  RawRowData,
  ParsedFeedbackRow,
  SupportedFileType,
} from "@/lib/importer";

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    let rawRows: RawRowData[] = [];
    let fileType: string = "csv";
    let preValidatedRows: ParsedFeedbackRow[] | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        fileType = detectFileType(file);
        const fileName = file.name || "";

        if (fileType === "xlsx" || fileType === "xls" || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          rawRows = parseExcelBuffer(Buffer.from(buffer));
        } else {
          const text = await file.text();
          const cleanText = text.replace(/^\uFEFF/, "").trim();
          rawRows = parseCsvWithPapa(cleanText);
        }
      }

      // Fallback if file upload empty but csvText present
      if (rawRows.length === 0) {
        const csvText = String(formData.get("csvText") || "").trim();
        if (csvText) {
          rawRows = parseCsvWithPapa(csvText);
          fileType = "csv";
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.validatedRows)) {
        preValidatedRows = body.validatedRows;
      } else if (body.csvText && typeof body.csvText === "string") {
        const cleanText = body.csvText.replace(/^\uFEFF/, "").trim();
        rawRows = parseCsvWithPapa(cleanText);
        fileType = "csv";
      }
    }

    // Process raw rows if preValidatedRows were not supplied
    const summary = preValidatedRows
      ? {
          totalRows: preValidatedRows.length,
          validRowsCount: preValidatedRows.filter((r) => r.isValid && !r.isDuplicate).length,
          invalidRowsCount: preValidatedRows.filter((r) => !r.isValid).length,
          duplicateRowsCount: preValidatedRows.filter((r) => r.isDuplicate).length,
          rows: preValidatedRows,
        }
      : validateAndProcessRows(rawRows, fileType as SupportedFileType);

    if (!summary.rows || summary.rows.length === 0) {
      return NextResponse.json(
        { error: "File is empty or missing headers (required: content, channel, customerLabel)." },
        { status: 400 }
      );
    }

    // Get existing workspace feedback content & sourceRef for database duplicate detection
    const existingFeedback = await prisma.feedback.findMany({
      where: { workspaceId: user.workspaceId },
      select: { content: true, sourceRef: true },
    });

    const dbContentSet = new Set(existingFeedback.map((f) => f.content.trim().toLowerCase()));
    const dbSourceRefSet = new Set(
      existingFeedback.map((f) => (f.sourceRef ? f.sourceRef.trim().toLowerCase() : "")).filter(Boolean)
    );

    // Existing themes for classifier prompt & matching
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    const themeMap: Record<string, string> = {};
    const themeNames: string[] = [];
    existingThemes.forEach((t) => {
      themeMap[t.name.toLowerCase()] = t.id;
      themeNames.push(t.name);
    });

    let importedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const importedPreview: Array<{
      content: string;
      channel: string;
      customerLabel: string;
      sourceRef: string;
      sentiment: string;
      themeName: string;
    }> = [];

    for (let i = 0; i < summary.rows.length; i++) {
      const item = summary.rows[i];
      const rowNum = item.rowNumber || i + 2;

      // Skip invalid client-flagged rows
      if (!item.isValid) {
        skippedCount++;
        const msg = item.validationErrors.join("; ") || "Invalid row format.";
        errors.push(`Row #${rowNum}: ${msg}`);
        continue;
      }

      // Check intra-file duplicate flag
      if (item.isDuplicate) {
        duplicateCount++;
        skippedCount++;
        errors.push(`Row #${rowNum}: Skipped duplicate content within file (matches Row #${item.duplicateOfRow || "earlier"}).`);
        continue;
      }

      // Database duplicate check
      const normContent = item.content.trim().toLowerCase();
      if (dbContentSet.has(normContent)) {
        duplicateCount++;
        skippedCount++;
        errors.push(`Row #${rowNum}: Skipped duplicate content (already exists in workspace database).`);
        continue;
      }

      if (item.sourceRef && dbSourceRefSet.has(item.sourceRef.trim().toLowerCase())) {
        duplicateCount++;
        skippedCount++;
        errors.push(`Row #${rowNum}: Skipped duplicate sourceRef '${item.sourceRef}' (already exists in database).`);
        continue;
      }

      // Formulate customerLabel from customerLabel + customerName if both exist
      let finalCustomerLabel = item.customerLabel || "Imported Customer";
      if (item.customerName && item.customerLabel && !item.customerLabel.toLowerCase().includes(item.customerName.toLowerCase())) {
        finalCustomerLabel = `${item.customerName} (${item.customerLabel})`;
      } else if (item.customerName && !item.customerLabel) {
        finalCustomerLabel = item.customerName;
      }

      // Compile optional metadata into rationale/annotation
      const optionalDetails: string[] = [];
      if (item.rating) optionalDetails.push(`Rating: ${item.rating}`);
      if (item.reviewTitle) optionalDetails.push(`Title: "${item.reviewTitle}"`);
      if (item.product) optionalDetails.push(`Product: ${item.product}`);
      if (item.reviewDate) optionalDetails.push(`Date: ${item.reviewDate}`);
      if (item.verifiedPurchase !== undefined) optionalDetails.push(`Verified: ${item.verifiedPurchase}`);

      const metadataSuffix = optionalDetails.length > 0 ? ` [Metadata: ${optionalDetails.join(", ")}]` : "";

      try {
        const classification = await classifyFeedback(item.content, themeNames);
        let themeId = themeMap[classification.themeName.toLowerCase()];

        if (!themeId) {
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
              description: `Auto-created from batch import for ${classification.featureArea}.`,
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
            content: item.content,
            channel: item.channel,
            sourceRef: item.sourceRef || `IMP-${Date.now().toString().slice(-4)}-${rowNum}`,
            customerLabel: finalCustomerLabel,
            sentiment: classification.sentiment,
            sentimentScore: classification.sentimentScore,
            status: "NEW",
            featureArea: classification.featureArea,
            rationale: (classification.rationale + metadataSuffix).trim(),
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

        const keywords = item.content
          .toLowerCase()
          .split(/\W+/)
          .filter((w: string) => w.length > 3);

        await prisma.embedding.create({
          data: {
            feedbackId: feedback.id,
            vectorJson: JSON.stringify(keywords),
          },
        });

        // Add to db content set so sub-sequent rows in same batch don't re-insert
        dbContentSet.add(normContent);
        if (item.sourceRef) dbSourceRefSet.add(item.sourceRef.trim().toLowerCase());

        importedCount++;

        if (importedPreview.length < 5) {
          importedPreview.push({
            content: item.content.length > 120 ? item.content.slice(0, 117) + "…" : item.content,
            channel: item.channel,
            customerLabel: finalCustomerLabel,
            sourceRef: feedback.sourceRef || "",
            sentiment: classification.sentiment,
            themeName: classification.themeName,
          });
        }
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : "Failed to process item.";
        errors.push(`Row #${rowNum}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: summary.rows.length,
        importedCount,
        skippedCount,
        duplicateCount,
        failedCount,
        errors: errors.slice(0, 15),
        preview: importedPreview,
      },
    });
  } catch (error: unknown) {
    console.error("Importer route error:", error);
    return NextResponse.json(
      { error: "Failed to parse file. Ensure valid columns (content, channel, customerLabel)." },
      { status: 500 }
    );
  }
}
