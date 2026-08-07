import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard, hashPassword } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  try {
    const members = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (err: unknown) {
    console.error("Fetch members error:", err);
    return NextResponse.json({ error: "Failed to fetch members." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Enforce ADMIN role
  const { user, error } = await requireAuthGuard(["ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required." }, { status: 400 });
    }

    if (!["ADMIN", "ANALYST", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Role must be ADMIN, ANALYST, or VIEWER." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password || "password123");

    const newMember = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, member: newMember });
  } catch (err: unknown) {
    console.error("Invite member error:", err);
    return NextResponse.json({ error: "Failed to create member." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { memberId, role } = body;

    if (!memberId || !role || !["ADMIN", "ANALYST", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Valid memberId and role required." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, workspaceId: user.workspaceId },
    });

    if (!target) {
      return NextResponse.json({ error: "Member not found in workspace." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: unknown) {
    console.error("Update member role error:", err);
    return NextResponse.json({ error: "Failed to update member role." }, { status: 500 });
  }
}
