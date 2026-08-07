import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { z } from "zod";

const BulkFeedbackSchema = z.object({
  ids: z.array(z.string()).min(1, "Must specify at least one feedback ID."),
  action: z.enum(["UPDATE_STATUS", "DELETE"]),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = BulkFeedbackSchema.parse(body);

    if (validated.action === "DELETE") {
      // Admin only permission required for bulk delete
      const { user, error } = await requireAuthGuard(["ADMIN"]);
      if (error) return error;

      await prisma.feedback.deleteMany({
        where: {
          id: { in: validated.ids },
          workspaceId: user.workspaceId,
        },
      });

      return NextResponse.json({
        success: true,
        count: validated.ids.length,
        message: `Successfully deleted ${validated.ids.length} feedback item(s).`,
      });
    }

    if (validated.action === "UPDATE_STATUS") {
      // Admins & Analysts can update status
      const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
      if (error) return error;

      if (!validated.status) {
        return NextResponse.json({ error: "Target status required for status update." }, { status: 400 });
      }

      const updated = await prisma.feedback.updateMany({
        where: {
          id: { in: validated.ids },
          workspaceId: user.workspaceId,
        },
        data: {
          status: validated.status,
        },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `Successfully updated ${updated.count} item(s) to status '${validated.status}'.`,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || "Invalid payload." },
        { status: 400 }
      );
    }
    console.error("Bulk feedback operation error:", err);
    return NextResponse.json({ error: "Failed to perform bulk operation." }, { status: 500 });
  }
}
