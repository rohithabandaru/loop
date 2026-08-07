import { NextResponse } from "next/server";
import { requireAuthGuard } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { apiKey: true, slackWebhookUrl: true, name: true },
  });

  return NextResponse.json({
    apiKey: workspace?.apiKey || null,
    slackWebhookUrl: workspace?.slackWebhookUrl || "",
    workspaceName: workspace?.name || "",
  });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { action, slackWebhookUrl } = body;

    if (action === "GENERATE_KEY") {
      const newKey = `loop_live_${crypto.randomBytes(16).toString("hex")}`;
      const updated = await prisma.workspace.update({
        where: { id: user.workspaceId },
        data: { apiKey: newKey },
      });
      return NextResponse.json({ apiKey: updated.apiKey });
    }

    if (action === "UPDATE_SLACK") {
      const updated = await prisma.workspace.update({
        where: { id: user.workspaceId },
        data: { slackWebhookUrl: slackWebhookUrl || null },
      });
      return NextResponse.json({ slackWebhookUrl: updated.slackWebhookUrl });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "Failed to update integration settings." }, { status: 500 });
  }
}
