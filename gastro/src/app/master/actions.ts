"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMaster } from "@/lib/session";
import { hashPassword, setActingTenant } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBRL } from "@/lib/money";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | undefined;

export async function startActingAction(form: FormData) {
  const master = await requireMaster();
  const tenantId = String(form.get("tenantId") ?? "");
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) redirect("/master/estabelecimentos");
  await setActingTenant(tenant.id, master.id);
  await audit("master.act_as_tenant", { actorId: master.id, tenantId: tenant.id });
  redirect(String(form.get("to") ?? "") === "produtos" ? "/painel/produtos" : "/painel");
}

export async function stopActingAction() {
  const master = await requireMaster();
  await setActingTenant(null, master.id);
  redirect("/master/estabelecimentos");
}

const STATUSES = ["PENDING_PAYMENT", "ACTIVE", "SUSPENDED", "CANCELED"] as const;

export async function setTenantStatusAction(form: FormData) {
  const master = await requireMaster();
  const tenantId = String(form.get("tenantId") ?? "");
  const status = z.enum(STATUSES).parse(form.get("status"));
  await db.tenant.update({ where: { id: tenantId }, data: { status } });
  await audit("master.tenant_status", { actorId: master.id, tenantId, meta: { status } });
  revalidatePath(`/master/estabelecimentos/${tenantId}`);
  revalidatePath("/master/estabelecimentos");
}

export async function changeTenantPlanAction(form: FormData) {
  const master = await requireMaster();
  const tenantId = String(form.get("tenantId") ?? "");
  const planId = String(form.get("planId") ?? "");
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) return;
  await db.subscription.upsert({
    where: { tenantId },
    update: { planId },
    create: { tenantId, planId, status: "PENDING", provider: "none" },
  });
  await audit("master.tenant_plan", { actorId: master.id, tenantId, meta: { plan: plan.code } });
  revalidatePath(`/master/estabelecimentos/${tenantId}`);
}

/**
 * Registra um pagamento RECEBIDO de verdade fora da plataforma (Pix, transferência...).
 * Não é simulação: fica marcado como "manual" com quem registrou e a observação.
 */
export async function recordManualPaymentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const tenantId = String(form.get("tenantId") ?? "");
  const amount = parseBRL(String(form.get("amount") ?? ""));
  const months = Math.min(12, Math.max(1, Number(form.get("months") ?? 1) || 1));
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  if (amount == null || amount <= 0) return { error: "Informe o valor recebido." };
  if (!note) return { error: "Descreva como o pagamento foi recebido (ex.: Pix em 24/11)." };
  const sub = await db.subscription.findUnique({ where: { tenantId } });
  if (!sub) return { error: "Este estabelecimento não tem assinatura." };

  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
  const periodEnd = new Date(base);
  periodEnd.setMonth(periodEnd.getMonth() + months);

  await db.$transaction([
    db.payment.create({
      data: { subscriptionId: sub.id, amountCents: amount, status: "PAID", provider: "manual", method: "manual", note: `${note} · registrado por ${master.email}`, paidAt: new Date() },
    }),
    db.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", provider: sub.provider === "none" ? "manual" : sub.provider, currentPeriodEnd: periodEnd } }),
    db.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } }),
  ]);
  await audit("master.manual_payment", { actorId: master.id, tenantId, meta: { amount, months, note } });
  revalidatePath(`/master/estabelecimentos/${tenantId}`);
  return { ok: true, message: "Pagamento registrado e assinatura ativada." };
}

const planSchema = z.object({
  name: z.string().trim().min(2).max(40),
  headline: z.string().trim().max(120),
  description: z.string().trim().max(400),
  highlights: z.string().max(2000),
  price: z.string(),
  videoFeed: z.boolean(),
  managedByUnlock: z.boolean(),
  maxProducts: z.coerce.number().int().min(0).max(10000),
  active: z.boolean(),
});

export async function updatePlanAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const id = String(form.get("id") ?? "");
  const p = planSchema.safeParse({
    name: form.get("name"), headline: form.get("headline") ?? "", description: form.get("description") ?? "",
    highlights: form.get("highlights") ?? "", price: String(form.get("price") ?? ""),
    videoFeed: form.get("videoFeed") === "on", managedByUnlock: form.get("managedByUnlock") === "on",
    maxProducts: form.get("maxProducts") ?? 0, active: form.get("active") === "on",
  });
  if (!p.success) return { error: "Confira os campos do plano." };
  const priceCents = p.data.price.trim() ? parseBRL(p.data.price) : null;
  if (p.data.price.trim() && (priceCents == null || priceCents < 0)) return { error: "Preço inválido. Use o formato 49,90." };
  const features: Prisma.InputJsonValue = { videoFeed: p.data.videoFeed, managedByUnlock: p.data.managedByUnlock, maxProducts: p.data.maxProducts };
  await db.plan.update({
    where: { id },
    data: {
      name: p.data.name, headline: p.data.headline || null, description: p.data.description || null, priceCents, features, active: p.data.active,
      highlights: p.data.highlights.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12),
    },
  });
  await audit("master.plan_update", { actorId: master.id, meta: { id, priceCents } });
  revalidatePath("/master/planos");
  revalidatePath("/");
  return { ok: true, message: "Plano salvo." };
}

const userSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(10).max(128),
  role: z.enum(["MASTER", "OWNER", "STAFF"]),
  tenantId: z.string().optional(),
});

export async function createUserAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const p = userSchema.safeParse({
    name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role"),
    tenantId: String(form.get("tenantId") ?? "") || undefined,
  });
  if (!p.success) return { error: "Confira os campos. A senha precisa ter 10+ caracteres." };
  if (p.data.role !== "MASTER" && !p.data.tenantId) return { error: "Escolha o estabelecimento deste usuário." };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "Já existe um usuário com esse e-mail." };
  if (p.data.tenantId && !(await db.tenant.findUnique({ where: { id: p.data.tenantId } }))) return { error: "Estabelecimento não encontrado." };
  const u = await db.user.create({
    data: {
      name: p.data.name, email: p.data.email, role: p.data.role, passwordHash: await hashPassword(p.data.password),
      tenantId: p.data.role === "MASTER" ? null : p.data.tenantId,
    },
  });
  await audit("master.user_create", { actorId: master.id, tenantId: u.tenantId, meta: { userId: u.id, role: u.role } });
  revalidatePath("/master/usuarios");
  return { ok: true, message: `Usuário ${u.email} criado.` };
}

export async function toggleUserActiveAction(form: FormData) {
  const master = await requireMaster();
  const id = String(form.get("userId") ?? "");
  if (id === master.id) return; // não se desativa sozinho
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return;
  await db.user.update({ where: { id }, data: { active: !u.active } });
  await audit("master.user_toggle", { actorId: master.id, tenantId: u.tenantId, meta: { userId: id, active: !u.active } });
  revalidatePath("/master/usuarios");
}

export async function resetUserPasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const id = String(form.get("userId") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "A nova senha precisa ter 10+ caracteres." };
  const u = await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } }).catch(() => null);
  if (!u) return { error: "Usuário não encontrado." };
  await audit("master.user_password_reset", { actorId: master.id, tenantId: u.tenantId, meta: { userId: id } });
  return { ok: true, message: "Senha redefinida. Envie a nova senha ao usuário por um canal seguro." };
}

const createTenantSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase(),
  businessType: z.string().trim().max(30),
  planId: z.string().min(1),
  ownerName: z.string().trim().min(2).max(80),
  ownerEmail: z.string().trim().toLowerCase().email().max(120),
  ownerPassword: z.string().min(10).max(128),
});

export async function createTenantByMasterAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const { slugify, validateSlug } = await import("@/lib/slug");
  const raw = Object.fromEntries(Object.keys(createTenantSchema.shape).map((k) => [k, String(form.get(k) ?? "")]));
  if (!raw.slug) raw.slug = slugify(raw.businessName);
  const p = createTenantSchema.safeParse(raw);
  if (!p.success) return { error: "Confira os campos. A senha inicial precisa ter 10+ caracteres." };
  const d = p.data;
  const slugErr = validateSlug(d.slug);
  if (slugErr) return { error: slugErr };
  if (await db.tenant.findUnique({ where: { slug: d.slug } })) return { error: "Esse endereço já está em uso." };
  if (await db.user.findUnique({ where: { email: d.ownerEmail } })) return { error: "Já existe um usuário com esse e-mail." };
  const plan = await db.plan.findUnique({ where: { id: d.planId } });
  if (!plan) return { error: "Plano inválido." };
  const passwordHash = await hashPassword(d.ownerPassword);
  const tenant = await db.$transaction(async (tx) => {
    const t = await tx.tenant.create({ data: { name: d.businessName, slug: d.slug, businessType: d.businessType || "restaurante", menuName: "Cardápio" } });
    await tx.subscription.create({ data: { tenantId: t.id, planId: plan.id, status: "PENDING", provider: "none" } });
    await tx.user.create({ data: { name: d.ownerName, email: d.ownerEmail, passwordHash, role: "OWNER", tenantId: t.id } });
    return t;
  });
  await audit("master.tenant_create", { actorId: master.id, tenantId: tenant.id, meta: { plan: plan.code } });
  redirect(`/master/estabelecimentos/${tenant.id}?criado=1`);
}

export async function updateTenantBasicsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const master = await requireMaster();
  const { validateSlug } = await import("@/lib/slug");
  const id = String(form.get("tenantId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 80) return { error: "Nome inválido." };
  const err = validateSlug(slug);
  if (err) return { error: err };
  const clash = await db.tenant.findFirst({ where: { slug, NOT: { id } } });
  if (clash) return { error: "Esse endereço já está em uso." };
  const before = await db.tenant.findUnique({ where: { id } });
  if (!before) return { error: "Estabelecimento não encontrado." };
  await db.tenant.update({ where: { id }, data: { name, slug } });
  await audit("master.tenant_update", { actorId: master.id, tenantId: id, meta: { slugFrom: before.slug, slugTo: slug } });
  revalidatePath(`/master/estabelecimentos/${id}`);
  return { ok: true, message: slug !== before.slug ? "Salvo. Atenção: o link mudou, QR Codes e etiquetas NFC antigas deixam de funcionar." : "Salvo." };
}
