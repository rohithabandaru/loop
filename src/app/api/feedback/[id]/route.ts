import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  const { id } = await params;

  // Check item existence and tenant workspace isolation
  const existing = await prisma.feedback.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, reclassify } = body;

    // Handle status workflow update (NEW -> REVIEWED -> ACTIONED)
    if (status && ["NEW", "REVIEWED", "ACTIONED"].includes(status)) {
      const updated = await prisma.feedback.update({
        where: { id },
        data: { status },
        include: {
          feedbackThemes: { include: { theme: true } },
        },
      });

      return NextResponse.json({
        success: true,
        feedback: {
          ...updated,
          themes: updated.feedbackThemes.map((ft: any) => ft.theme),
        },
      });
    }

    // Handle manual re-classify action
    if (reclassify) {
      const existingThemes = await prisma.theme.findMany({
        where: { workspaceId: user.workspaceId },
        select: { id: true, name: true },
      });

      const themeNames = existingThemes.map((t: any) => t.name);
      const classification = await classifyFeedback(existing.content, themeNames);

      let themeId = existingThemes.find(
        (t: any) => t.name.toLowerCase() === classification.themeName.toLowerCase()
      )?.id;

      if (!themeId) {
        const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
        const newTheme = await prisma.theme.create({
          data: {
            name: classification.themeName,
            description: `Theme created during reclassification of ${classification.featureArea}.`,
            color: colors[Math.floor(Math.random() * colors.length)],
            workspaceId: user.workspaceId,
          },
        });
        themeId = newTheme.id;
      }

      // Update feedback record
      const updated = await prisma.feedback.update({
        where: { id },
        data: {
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
          featureArea: classification.featureArea,
          rationale: `Manually re-classified by ${user.name}: ${classification.rationale}`,
        },
      });

      // Update join table
      await prisma.feedbackTheme.deleteMany({ where: { feedbackId: id } });
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: id,
          themeId,
          confidence: 0.98,
        },
      });

      const fullUpdated = await prisma.feedback.findUnique({
        where: { id },
        include: { feedbackThemes: { include: { theme: true } } },
      });

      return NextResponse.json({
        success: true,
        feedback: {
          ...fullUpdated,
          themes: fullUpdated?.feedbackThemes.map((ft: any) => ft.theme) || [],
        },
      });
    }

    return NextResponse.json({ error: "Invalid patch body." }, { status: 400 });
  } catch (err: any) {
    console.error("Patch feedback error:", err);
    return NextResponse.json({ error: "Failed to update feedback item." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Enforce ADMIN role for deletion
  const { user, error } = await requireAuthGuard(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.feedback.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
  }

  try {
    await prisma.feedback.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("Delete feedback error:", err);
    return NextResponse.json({ error: "Failed to delete feedback item." }, { status: 500 });
  }
}
