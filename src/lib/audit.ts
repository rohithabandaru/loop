import { prisma } from "@/lib/db";

export async function logAuditEvent(params: {
  action: string;
  details: Record<string, unknown> | string;
  userId?: string;
  workspaceId: string;
}) {
  try {
    const detailsStr =
      typeof params.details === "string" ? params.details : JSON.stringify(params.details);

    await prisma.auditLog.create({
      data: {
        action: params.action,
        details: detailsStr,
        userId: params.userId || null,
        workspaceId: params.workspaceId,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err);
  }
}
