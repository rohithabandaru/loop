import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import { logAuditEvent } from "@/lib/audit";
import { generateSimulatedChannelFeedback } from "@/lib/importer";

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const sourceKey = body.source || "zendesk";

    const simulatedRows = generateSimulatedChannelFeedback(sourceKey);

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

    for (const item of simulatedRows) {
      const content = String(item.content || "");
      if (!content || content.length < 3) continue;

      const classification = await classifyFeedback(content, themeNames);

      let themeId = themeMap[classification.themeName.toLowerCase()];
      if (!themeId) {
        const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
        const newTheme = await prisma.theme.create({
          data: {
            name: classification.themeName,
            description: `Auto-created from channel simulation for ${classification.featureArea}.`,
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
          channel: String(item.channel || "SUPPORT_TICKET"),
          sourceRef: String(item.sourceRef || `SIM-${Date.now()}`),
          customerLabel: String(item.customerName || item.customerLabel || "Simulated Customer"),
          customerName: item.customerName ? String(item.customerName) : null,
          customerEmail: item.customerEmail ? String(item.customerEmail) : null,
          company: item.company ? String(item.company) : null,
          source: String(item.source || "Channel Simulation"),
          rating: item.rating ? Number(item.rating) : null,
          title: item.title ? String(item.title) : null,
          tags: item.tags ? String(item.tags) : null,
          priority: item.priority ? String(item.priority) : classification.priority,
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
          confidence: 0.95,
        },
      });

      const keywords = content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      await prisma.embedding.create({
        data: {
          feedbackId: feedback.id,
          vectorJson: JSON.stringify(keywords),
        },
      });

      importedCount++;
    }

    await logAuditEvent({
      action: "CHANNEL_SIMULATION",
      details: { sourceKey, importedCount },
      userId: user.userId,
      workspaceId: user.workspaceId,
    });

    return NextResponse.json({
      success: true,
      imported: importedCount,
      source: sourceKey,
    });
  } catch (err: any) {
    console.error("Simulate API error:", err);
    return NextResponse.json({ error: "Failed to simulate channel sync." }, { status: 500 });
  }
}
