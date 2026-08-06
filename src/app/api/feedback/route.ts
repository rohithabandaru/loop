import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";
import { logAuditEvent } from "@/lib/audit";
import { SingleFeedbackSchema } from "@/lib/validations/import";
import { z } from "zod";

export async function GET(req: Request) {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const channel = url.searchParams.get("channel") || "";
  const sentiment = url.searchParams.get("sentiment") || "";
  const themeId = url.searchParams.get("themeId") || "";
  const status = url.searchParams.get("status") || "";
  const priority = url.searchParams.get("priority") || "";
  const days = parseInt(url.searchParams.get("days") || "0", 10);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "15", 10);

  const where: any = {
    workspaceId: user.workspaceId,
  };

  if (search.trim() !== "") {
    where.OR = [
      { content: { contains: search } },
      { customerLabel: { contains: search } },
      { customerName: { contains: search } },
      { customerEmail: { contains: search } },
      { company: { contains: search } },
      { sourceRef: { contains: search } },
      { title: { contains: search } },
      { featureArea: { contains: search } },
    ];
  }

  if (channel && channel !== "ALL") {
    where.channel = channel;
  }

  if (sentiment && sentiment !== "ALL") {
    where.sentiment = sentiment;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority;
  }

  if (themeId && themeId !== "ALL") {
    where.feedbackThemes = {
      some: { themeId },
    };
  }

  if (days > 0) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);
    where.createdAt = { gte: minDate };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        feedbackThemes: {
          include: { theme: true },
        },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  const totalWorkspaceItems = await prisma.feedback.count({
    where: { workspaceId: user.workspaceId },
  });

  const negativeCount = await prisma.feedback.count({
    where: { workspaceId: user.workspaceId, sentiment: "NEGATIVE" },
  });

  const actionedCount = await prisma.feedback.count({
    where: { workspaceId: user.workspaceId, status: "ACTIONED" },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newThisWeek = await prisma.feedback.count({
    where: {
      workspaceId: user.workspaceId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  return NextResponse.json({
    items: items.map((f: any) => ({
      ...f,
      themes: f.feedbackThemes.map((ft: any) => ft.theme),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      total: totalWorkspaceItems,
      negativeRatio: totalWorkspaceItems > 0 ? (negativeCount / totalWorkspaceItems) * 100 : 0,
      actionedRatio: totalWorkspaceItems > 0 ? (actionedCount / totalWorkspaceItems) * 100 : 0,
      newThisWeek,
    },
  });
}

export async function POST(req: Request) {
  // Enforce role authorization: Admins and Analysts can ingest
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const body = await req.json();
    const validated = SingleFeedbackSchema.parse(body);

    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { name: true, id: true },
    });

    const themeNames = existingThemes.map((t: any) => t.name);

    // AI Classification Pipeline
    const classification = await classifyFeedback(validated.content, themeNames);

    let matchedTheme = existingThemes.find(
      (t: any) => t.name.toLowerCase() === classification.themeName.toLowerCase()
    );

    if (!matchedTheme) {
      const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      matchedTheme = await prisma.theme.create({
        data: {
          name: classification.themeName,
          description: `Auto-generated theme for ${classification.featureArea} feedback.`,
          color: randomColor,
          workspaceId: user.workspaceId,
        },
      });
    }

    const customerLabel =
      validated.customerLabel ||
      validated.customerName ||
      validated.customerEmail ||
      validated.company ||
      "Direct Submission";

    const ratingVal = validated.rating !== undefined ? Number(validated.rating) : null;
    const priorityVal = validated.priority || classification.priority || "MEDIUM";

    const feedback = await prisma.feedback.create({
      data: {
        content: validated.content,
        channel: validated.channel,
        sourceRef: validated.sourceRef || `SINGLE-${Date.now().toString().slice(-4)}`,
        customerLabel,
        customerName: validated.customerName || null,
        customerEmail: validated.customerEmail || null,
        company: validated.company || null,
        source: validated.source || "Manual Entry",
        rating: Number.isNaN(ratingVal) ? null : ratingVal,
        title: validated.title || null,
        product: validated.product || null,
        tags: validated.tags || null,
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
        themeId: matchedTheme.id,
        confidence: 0.95,
      },
    });

    const keywords = validated.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    await prisma.embedding.create({
      data: {
        feedbackId: feedback.id,
        vectorJson: JSON.stringify(keywords),
      },
    });

    await logAuditEvent({
      action: "SINGLE_FEEDBACK_INGEST",
      details: { feedbackId: feedback.id, channel: feedback.channel },
      userId: user.userId,
      workspaceId: user.workspaceId,
    });

    return NextResponse.json({
      success: true,
      feedback: {
        ...feedback,
        themes: [matchedTheme],
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || err.message || "Invalid input parameters." },
        { status: 400 }
      );
    }
    console.error("Create Feedback error:", err);
    return NextResponse.json({ error: "Failed to process single feedback entry." }, { status: 500 });
  }
}
