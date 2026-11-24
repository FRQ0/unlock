"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeNext(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : null;
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields = { email };
  if (!email || !password) return { error: "Informe e-mail e senha.", fields };

  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 20, 15 * 60_000) || !rateLimit(`login:${email}`, 8, 15 * 60_000)) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", fields };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Compara mesmo sem usuário para não revelar quais e-mails existem pelo tempo de resposta.
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok) return { error: "E-mail ou senha incorretos.", fields };
  if (!user.active) return { error: "Este acesso foi desativado. Fale com a Unlock.", fields };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ sub: user.id, role: user.role, tid: user.tenantId });
  await audit("auth.login", { actorId: user.id, tenantId: user.tenantId });

  const next = safeNext(form.get("next"));
  if (user.role === "MASTER") redirect(next?.startsWith("/master") ? next : "/master");
  redirect(next?.startsWith("/painel") ? next : user.role === "STAFF" ? "/painel/garcom" : "/painel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}
