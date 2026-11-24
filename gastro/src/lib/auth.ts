import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "ug_session";
export const ACTING_COOKIE = "ug_acting_tenant";
const SESSION_DAYS = 7;

export type SessionPayload = { sub: string; role: Role; tid: string | null };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: Record<string, unknown>, expires: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expires).sign(secret());
}

export async function verifyToken<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

const cookieBase = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

export async function createSession(p: SessionPayload) {
  const token = await signToken(p, `${SESSION_DAYS}d`);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase(), maxAge: SESSION_DAYS * 86400 });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ACTING_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  return verifyToken<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Master da Unlock "entra" no painel de um estabelecimento (plano Completo, suporte). */
export async function setActingTenant(tenantId: string | null, masterId: string) {
  const jar = await cookies();
  if (!tenantId) return jar.delete(ACTING_COOKIE);
  const token = await signToken({ tid: tenantId, by: masterId }, "8h");
  jar.set(ACTING_COOKIE, token, { ...cookieBase(), maxAge: 8 * 3600 });
}

export async function readActingTenant(masterId: string): Promise<string | null> {
  const p = await verifyToken<{ tid: string; by: string }>((await cookies()).get(ACTING_COOKIE)?.value);
  return p && p.by === masterId ? p.tid : null;
}
