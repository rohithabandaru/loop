import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, companyName } = body;

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Name, email, password, and company name are required." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create Workspace & Admin User in transaction
    const { workspace, user } = await prisma.$transaction(async (tx: any) => {
      const ws = await tx.workspace.create({
        data: { name: companyName },
      });

      const u = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: "ADMIN",
          workspaceId: ws.id,
        },
      });

      return { workspace: ws, user: u };
    });

    const token = createSessionToken({
      userId: user.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      },
    });

    response.cookies.set("loop_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Signup API error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
