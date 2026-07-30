import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  try {
    const themes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      include: {
        feedbackThemes: {
          include: {
            feedback: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const formatted = themes.map((t: any) => {
      const allFeedback = t.feedbackThemes.map((ft: any) => ft.feedback);
      const totalCount = allFeedback.length;

      const recentCount = allFeedback.filter(
        (f: any) => new Date(f.createdAt) >= sevenDaysAgo
      ).length;

      const previousCount = allFeedback.filter(
        (f: any) => new Date(f.createdAt) >= fourteenDaysAgo && new Date(f.createdAt) < sevenDaysAgo
      ).length;

      let spikePercentage = 0;
      if (previousCount > 0) {
        spikePercentage = Math.round(((recentCount - previousCount) / previousCount) * 100);
      } else if (recentCount > 0) {
        spikePercentage = recentCount * 50;
      }

      const negCount = allFeedback.filter((f: any) => f.sentiment === "NEGATIVE").length;
      const posCount = allFeedback.filter((f: any) => f.sentiment === "POSITIVE").length;

      const avgScore =
        totalCount > 0
          ? Number(
              (
                allFeedback.reduce((acc: number, curr: any) => acc + curr.sentimentScore, 0) / totalCount
              ).toFixed(2)
            )
          : 0.0;

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        createdAt: t.createdAt,
        totalCount,
        recentCount,
        previousCount,
        spikePercentage,
        isSpiking: spikePercentage > 25 || (recentCount >= 5 && spikePercentage > 0),
        negCount,
        posCount,
        avgScore,
        sampleItems: allFeedback.slice(0, 5),
      };
    });

    // Sort themes by total volume descending
    formatted.sort((a: any, b: any) => b.totalCount - a.totalCount);

    return NextResponse.json({ themes: formatted });
  } catch (err: any) {
    console.error("Themes API error:", err);
    return NextResponse.json({ error: "Failed to fetch themes." }, { status: 500 });
  }
}
