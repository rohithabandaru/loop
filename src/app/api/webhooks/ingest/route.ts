import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";
import { sendSlackAlert } from "@/app/api/integrations/slack/route";
import { z } from "zod";

const WebhookIngestSchema = z.object({
  content: z.string().min(3, "Content must be at least 3 characters."),
  channel: z
    .enum(["SUPPORT_TICKET", "APP_STORE_REVIEW", "NPS_SURVEY", "SALES_NOTE", "COMMUNITY_POST"])
    .optional()
    .default("SUPPORT_TICKET"),
  sourceRef: z.string().optional(),
  customerLabel: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate via API Key Header (x-api-key or Bearer token)
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized. Missing 'x-api-key' or Bearer token header." },
        { status: 401 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { apiKey },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    // 2. Parse & Validate Payload
    const body = await req.json();
    const validated = WebhookIngestSchema.parse(body);

    // 3. Get existing themes for matching
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: workspace.id },
      select: { name: true, id: true },
    });
    const themeNames = existingThemes.map((t) => t.name);

    // 4. Run AI classification
    const classification = await classifyFeedback(validated.content, themeNames);

    // 5. Match or create theme
    let matchedTheme = existingThemes.find(
      (t) => t.name.toLowerCase() === classification.themeName.toLowerCase()
    );

    if (!matchedTheme) {
      const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      matchedTheme = await prisma.theme.create({
        data: {
          name: classification.themeName,
          description: `Auto-generated theme for ${classification.featureArea} feedback.`,
          color: randomColor,
          workspaceId: workspace.id,
        },
      });
    }

    // 6. Create Feedback Item
    const feedback = await prisma.feedback.create({
      data: {
        content: validated.content,
        channel: validated.channel,
        sourceRef: validated.sourceRef || `WEBHOOK-${Date.now().toString().slice(-4)}`,
        customerLabel: validated.customerLabel || "Webhook Integration",
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        status: "NEW",
        featureArea: classification.featureArea,
        rationale: classification.rationale,
        workspaceId: workspace.id,
      },
    });

    // 7. Join theme & create vector embedding
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

    // 8. Outbound Slack Alert for Negative Sentiment items
    if (classification.sentiment === "NEGATIVE" && workspace.slackWebhookUrl) {
      await sendSlackAlert(workspace.slackWebhookUrl, {
        title: `🚨 Negative Feedback Ingested (${validated.channel})`,
        text: `"${validated.content}"\n*Feature Area*: ${classification.featureArea} | *Customer*: ${validated.customerLabel || "Unknown"}`,
        color: "#EF4444",
      });
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      sentiment: feedback.sentiment,
      theme: matchedTheme.name,
      message: "Feedback ingested and classified successfully.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || "Invalid payload." },
        { status: 400 }
      );
    }
    console.error("Webhook ingest error:", err);
    return NextResponse.json({ error: "Failed to process webhook feedback payload." }, { status: 500 });
  }
}
