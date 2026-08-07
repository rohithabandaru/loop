import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { generateVoCReportNarrative } from "@/lib/ai";

export async function GET() {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  try {
    const reports = await prisma.report.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        generatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (err: unknown) {
    console.error("Fetch reports error:", err);
    return NextResponse.json({ error: "Failed to fetch reports." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const days = parseInt(body.days || "30", 10);
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    // Query feedback items in date range for this workspace
    const items = await prisma.feedback.findMany({
      where: {
        workspaceId: user.workspaceId,
        createdAt: { gte: periodStart },
      },
      include: {
        feedbackThemes: { include: { theme: true } },
      },
    });

    const posCount = items.filter((i) => i.sentiment === "POSITIVE").length;
    const negCount = items.filter((i) => i.sentiment === "NEGATIVE").length;

    // Theme frequency counts
    const themeCounts: Record<string, number> = {};
    items.forEach((item) => {
      item.feedbackThemes.forEach((ft) => {
        themeCounts[ft.theme.name] = (themeCounts[ft.theme.name] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const spikingTheme = topThemes[0]?.name || "Onboarding & Setup";

    // Compute real WoW spike for the top theme
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const topThemeFeedback = items.filter((item) =>
      item.feedbackThemes.some((ft) => ft.theme.name === spikingTheme)
    );
    const recentCount = topThemeFeedback.filter(
      (f) => new Date(f.createdAt) >= sevenDaysAgo
    ).length;
    const previousCount = topThemeFeedback.filter(
      (f) => new Date(f.createdAt) >= fourteenDaysAgo && new Date(f.createdAt) < sevenDaysAgo
    ).length;

    let spikePercentage = 0;
    if (previousCount > 0) {
      spikePercentage = Math.round(((recentCount - previousCount) / previousCount) * 100);
    } else if (recentCount > 0) {
      spikePercentage = recentCount * 50;
    }

    const sampleQuotes = items.map((i) => i.content).slice(0, 6);

    const periodLabel = days === 7 ? "Past 7 Days" : days === 30 ? "Past 30 Days" : "Past 90 Days";

    // Call AI to generate narrative
    const narrative = await generateVoCReportNarrative({
      periodLabel,
      totalFeedback: items.length,
      posCount,
      negCount,
      topThemes,
      spikingTheme,
      spikePercentage,
      sampleQuotes,
    });

    const reportTitle = `Voice of Customer Digest (${periodLabel} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;

    const report = await prisma.report.create({
      data: {
        title: reportTitle,
        periodStart,
        periodEnd,
        contentJson: JSON.stringify(narrative),
        workspaceId: user.workspaceId,
        generatedById: user.userId,
      },
      include: {
        generatedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    console.error("Generate report error:", err);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
