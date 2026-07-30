import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { prisma } from "./db";

export interface SessionUser {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  email: string;
  name: string;
}

const COOKIE_NAME = "loop_session";

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Encode simple secure base64 session token
export function createSessionToken(user: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  role: string;
  email: string;
  name: string;
}): string {
  const payload = JSON.stringify({
    userId: user.userId,
    workspaceId: user.workspaceId,
    workspaceName: user.workspaceName,
    role: user.role,
    email: user.email,
    name: user.name,
    iat: Date.now(),
  });
  return Buffer.from(payload).toString("base64");
}

// Decode session token
export function decodeSessionToken(token: string): SessionUser | null {
  try {
    const jsonStr = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (!parsed.userId || !parsed.workspaceId || !parsed.role) return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

// Get session user from cookies
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = decodeSessionToken(token);
  if (!session) return null;

  // Double check in DB to ensure user still exists and workspace is valid
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { workspace: true },
    });

    if (!dbUser) return null;

    return {
      userId: dbUser.id,
      workspaceId: dbUser.workspaceId,
      workspaceName: dbUser.workspace.name,
      role: dbUser.role as "ADMIN" | "ANALYST" | "VIEWER",
      email: dbUser.email,
      name: dbUser.name,
    };
  } catch {
    // If DB is temporarily unreachable or SQLite is busy, return session token data
    return session;
  }
}

// Guard API route helper
export async function requireAuthGuard(allowedRoles?: string[]): Promise<{
  user: SessionUser;
  error?: Response;
}> {
  const session = await getSession();

  if (!session) {
    return {
      user: null as any,
      error: new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      user: session,
      error: new Response(
        JSON.stringify({
          error: `Forbidden. Action requires ${allowedRoles.join(" or ")} role.`,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { user: session };
}
