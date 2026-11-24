"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { slugify, validateSlug } from "@/lib/slug";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; fields?: Record<string, string>; fieldErrors?: Record<string, string> } | undefined;

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
  redirect(next?.startsWith("/painel") ? next : "/painel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}

const BUSINESS_TYPES = ["hamburgueria", "pizzaria", "restaurante", "bar", "cafeteria", "acaiteria", "lanchonete", "doceria", "outro"] as const;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(120),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128),
  businessName: z.string().trim().min(2, "Informe o nome do estabelecimento.").max(80),
  businessType: z.enum(BUSINESS_TYPES, { message: "Escolha o tipo de estabelecimento." }),
  slug: z.string().trim().toLowerCase(),
  plan: z.string().min(1, "Escolha um plano."),
  terms: z.literal("on", { message: "Você precisa aceitar os termos e a política de privacidade." }),
});

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(["name", "email", "password", "businessName", "businessType", "slug", "plan", "terms"].map((k) => [k, String(form.get(k) ?? "")]));
  const { password: _pw, ...fields } = raw;
  void _pw;
  if (!raw.slug) raw.slug = slugify(raw.businessName);

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Confira os campos destacados.", fields, fieldErrors };
  }
  const d = parsed.data;
  const slugError = validateSlug(d.slug);
  if (slugError) return { error: "Confira os campos destacados.", fields, fieldErrors: { slug: slugError } };

  if (!rateLimit(`signup:${await clientIp()}`, 5, 60 * 60_000)) return { error: "Muitos cadastros seguidos. Tente mais tarde.", fields };

  const [emailTaken, slugTaken, plan] = await Promise.all([
    db.user.findUnique({ where: { email: d.email }, select: { id: true } }),
    db.tenant.findUnique({ where: { slug: d.slug }, select: { id: true } }),
    db.plan.findFirst({ where: { code: d.plan, active: true } }),
  ]);
  if (emailTaken) return { error: "Já existe uma conta com esse e-mail. Faça login.", fields, fieldErrors: { email: "E-mail já cadastrado." } };
  if (slugTaken) return { error: "Esse endereço já está em uso.", fields, fieldErrors: { slug: "Endereço já em uso. Tente outro." } };
  if (!plan) return { error: "Plano indisponível.", fields, fieldErrors: { plan: "Escolha um plano." } };

  const passwordHash = await hashPassword(d.password);
  const user = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: d.businessName, slug: d.slug, businessType: d.businessType, menuName: "Cardápio" },
    });
    await tx.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: "PENDING", provider: "none" } });
    return tx.user.create({
      data: { name: d.name, email: d.email, passwordHash, role: "OWNER", tenantId: tenant.id, termsAcceptedAt: new Date() },
    });
  });

  await createSession({ sub: user.id, role: user.role, tid: user.tenantId });
  await audit("tenant.signup", { actorId: user.id, tenantId: user.tenantId, meta: { plan: plan.code } });
  redirect("/painel/assinatura?bemvindo=1");
}

export async function checkSlugAction(slug: string): Promise<{ ok: boolean; message: string }> {
  const s = slugify(slug);
  const err = validateSlug(s);
  if (err) return { ok: false, message: err };
  const taken = await db.tenant.findUnique({ where: { slug: s }, select: { id: true } });
  return taken ? { ok: false, message: "Endereço já em uso." } : { ok: true, message: "Endereço disponível!" };
}
