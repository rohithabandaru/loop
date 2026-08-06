import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import { logAuditEvent } from "@/lib/audit";
import {
  parseCsvWithPapa,
  parseExcelBuffer,
  parseJsonContent,
  smartSplitPastedFeedback,
  detectFileType,
  validateAndProcessRows,
  RawRowData,
  ParsedFeedbackRow,
} from "@/lib/importer";
import mammoth from "mammoth";

export async function POST(req: Request) {
  const startTime = Date.now();

  // Enforce RBAC guard: Admin & Analyst can import; Viewers are read-only
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
        } else if (fileType === "json" || fileName.endsWith(".json")) {
          const text = await file.text();
          rawRows = parseJsonContent(text);
        } else if (fileType === "txt" || fileName.endsWith(".txt")) {
          const text = await file.text();
          rawRows = smartSplitPastedFeedback(text);
        } else if (fileType === "docx" || fileName.endsWith(".docx")) {
          const buffer = await file.arrayBuffer();
          const docxResult = await mammoth.extractRawText({ arrayBuffer: buffer });
          rawRows = smartSplitPastedFeedback(docxResult.value || "");
        } else if (fileType === "pdf" || fileName.endsWith(".pdf")) {
          const buffer = await file.arrayBuffer();
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse");
          const pdfResult = await pdfParse(Buffer.from(buffer));
          rawRows = smartSplitPastedFeedback(pdfResult.text || "");
        } else {
          const text = await file.text();
          const cleanText = text.replace(/^\uFEFF/, "").trim();
          rawRows = parseCsvWithPapa(cleanText);
        }
      }

      if (rawRows.length === 0) {
        const pasteText = String(formData.get("pasteText") || formData.get("csvText") || "").trim();
        if (pasteText) {
          rawRows = smartSplitPastedFeedback(pasteText);
          fileType = "paste";
        }
      }
    } else {
      const body = await req.json().catch(() => ({} as any));
      if (Array.isArray(body.validatedRows)) {
        preValidatedRows = body.validatedRows;
      } else if (Array.isArray(body.items)) {
        rawRows = body.items;
        fileType = "json";
      } else if (body.pasteText || body.csvText) {
        const text = String(body.pasteText || body.csvText).trim();
        rawRows = smartSplitPastedFeedback(text);
        fileType = "paste";
      }
    }

    const summary = preValidatedRows
      ? {
          totalRows: preValidatedRows.length,
          validRowsCount: preValidatedRows.filter((r) => r.isValid && !r.isDuplicate).length,
          invalidRowsCount: preValidatedRows.filter((r) => !r.isValid).length,
          duplicateRowsCount: preValidatedRows.filter((r) => r.isDuplicate).length,
          rows: preValidatedRows,
        }
      : validateAndProcessRows(rawRows, fileType as any);

    if (!summary.rows || summary.rows.length === 0) {
      return NextResponse.json(
        { error: "Import payload contains no readable feedback records." },
        { status: 400 }
      );
    }

    // Tenant-isolated database duplicate check
    const existingFeedback = await prisma.feedback.findMany({
      where: { workspaceId: user.workspaceId },
      select: { content: true, sourceRef: true },
    });

    const dbContentSet = new Set(existingFeedback.map((f) => f.content.trim().toLowerCase()));
    const dbSourceRefSet = new Set(
      existingFeedback.map((f) => (f.sourceRef ? f.sourceRef.trim().toLowerCase() : "")).filter(Boolean)
    );

    // Get workspace themes for classification mapping
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
    const validationErrors: string[] = [];

    const importedPreview: Array<{
      id: string;
      content: string;
      channel: string;
      customerLabel: string;
      customerName?: string;
      sentiment: string;
      priority: string;
      themeName: string;
    }> = [];

    for (let i = 0; i < summary.rows.length; i++) {
      const item = summary.rows[i];
      const rowNum = item.rowNumber || i + 1;

      if (!item.isValid) {
        skippedCount++;
        const msg = item.validationErrors.join("; ") || "Invalid row parameters.";
        validationErrors.push(`Row #${rowNum}: ${msg}`);
        continue;
      }

      if (item.isDuplicate) {
        duplicateCount++;
        skippedCount++;
        validationErrors.push(`Row #${rowNum}: Skipped duplicate content within import payload.`);
        continue;
      }

      const normContent = item.content.trim().toLowerCase();
      if (dbContentSet.has(normContent)) {
        duplicateCount++;
        skippedCount++;
        validationErrors.push(`Row #${rowNum}: Skipped duplicate content (already stored in workspace database).`);
        continue;
      }

      if (item.sourceRef && dbSourceRefSet.has(item.sourceRef.trim().toLowerCase())) {
        duplicateCount++;
        skippedCount++;
        validationErrors.push(`Row #${rowNum}: Skipped duplicate source reference ID '${item.sourceRef}'.`);
        continue;
      }

      try {
        // Run AI Classification Pipeline
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
              description: `Auto-created theme for ${classification.featureArea}.`,
              color: colors[Math.floor(Math.random() * colors.length)],
              workspaceId: user.workspaceId,
            },
          });
          themeId = newTheme.id;
          themeMap[classification.themeName.toLowerCase()] = newTheme.id;
          themeNames.push(classification.themeName);
        }

        const ratingVal = item.rating !== undefined ? Number(item.rating) : null;
        const priorityVal = item.priority || classification.priority || "MEDIUM";

        // Save Feedback record with tenant workspaceId
        const feedback = await prisma.feedback.create({
          data: {
            content: item.content,
            channel: item.channel,
            sourceRef: item.sourceRef || `IMP-${Date.now().toString().slice(-4)}-${rowNum}`,
            customerLabel: item.customerLabel || item.customerName || "Imported Feedback",
            customerName: item.customerName || null,
            customerEmail: item.customerEmail || null,
            company: item.company || null,
            source: item.source || fileType,
            rating: Number.isNaN(ratingVal) ? null : ratingVal,
            title: item.title || null,
            product: item.product || null,
            tags: item.tags || null,
            priority: priorityVal,
            language: classification.language || "en",
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

        dbContentSet.add(normContent);
        if (item.sourceRef) dbSourceRefSet.add(item.sourceRef.trim().toLowerCase());

        importedCount++;

        if (importedPreview.length < 5) {
          importedPreview.push({
            id: feedback.id,
            content: item.content.length > 120 ? item.content.slice(0, 117) + "…" : item.content,
            channel: item.channel,
            customerLabel: feedback.customerLabel || "Customer",
            customerName: item.customerName,
            sentiment: classification.sentiment,
            priority: priorityVal,
            themeName: classification.themeName,
          });
        }
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : "Failed to insert feedback.";
        validationErrors.push(`Row #${rowNum}: ${message}`);
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Log Audit Event
    await logAuditEvent({
      action: "FEEDBACK_INGEST_IMPORT",
      details: {
        fileType,
        totalProcessed: summary.rows.length,
        importedCount,
        skippedCount,
        duplicateCount,
        failedCount,
        processingTimeMs,
      },
      userId: user.userId,
      workspaceId: user.workspaceId,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: summary.rows.length,
        importedCount,
        skippedCount,
        duplicateCount,
        failedCount,
        processingTimeMs,
        validationErrors: validationErrors.slice(0, 20),
        preview: importedPreview,
      },
    });
  } catch (error: unknown) {
    console.error("Enterprise import API error:", error);
    return NextResponse.json(
      { error: "Failed to process import pipeline request." },
      { status: 500 }
    );
  }
}
