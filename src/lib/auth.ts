import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
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

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("NEXTAUTH_SECRET must be set and at least 16 characters.");
  }
  return secret;
}

// HMAC-SHA256 sign a payload string
function signPayload(payloadBase64: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payloadBase64)
    .digest("hex");
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create HMAC-SHA256 signed session token (format: base64payload.hexsignature)
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
  const payloadBase64 = Buffer.from(payload).toString("base64");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

// Decode and verify HMAC-signed session token
export function decodeSessionToken(token: string): SessionUser | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payloadBase64 = token.substring(0, dotIndex);
    const signature = token.substring(dotIndex + 1);

    // Verify HMAC signature using timing-safe comparison
    const expectedSignature = signPayload(payloadBase64);
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const jsonStr = Buffer.from(payloadBase64, "base64").toString("utf-8");
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

  // Verify user still exists in DB — do NOT trust token alone if DB check fails
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
    // DB unreachable — reject session for safety instead of trusting unsigned data
    return null;
  }
}

// Guard API route helper
export async function requireAuthGuard(allowedRoles?: string[]): Promise<
  | { user: SessionUser; error?: undefined }
  | { user: null; error: Response }
> {
  const session = await getSession();

  if (!session) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      user: null,
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
