import { NextResponse } from "next/server";
import { requireAuthGuard } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Outbound Slack webhook notification helper
export async function sendSlackAlert(webhookUrl: string, message: { title: string; text: string; color?: string }) {
  if (!webhookUrl) return;

  try {
    const payload = {
      attachments: [
        {
          color: message.color || "#6366F1",
          title: message.title,
          text: message.text,
          footer: "Project LOOP • AI Feedback Intelligence",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Slack alert delivery error:", err);
  }
}

// Test Slack Webhook endpoint
export async function POST() {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });

    if (!workspace?.slackWebhookUrl) {
      return NextResponse.json(
        { error: "No Slack Webhook URL configured for this workspace." },
        { status: 400 }
      );
    }

    await sendSlackAlert(workspace.slackWebhookUrl, {
      title: "⚡ Project LOOP Integration Connected!",
      text: `Test alert sent by ${user.name} (${user.role}) for workspace '${workspace.name}'. Inbound & outbound webhooks are active.`,
      color: "#10B981",
    });

    return NextResponse.json({ success: true, message: "Slack test alert sent successfully!" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "Failed to dispatch Slack alert." }, { status: 500 });
  }
}
