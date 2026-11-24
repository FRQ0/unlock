"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { WEEKDAYS } from "@/lib/hours";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { daysAgo } from "@/lib/dates";

export type SettingsState = { ok?: boolean; error?: string; message?: string } | undefined;

const s = (max: number) => z.string().trim().max(max);
const schema = z.object({
  phone: s(20), whatsapp: s(20), instagram: s(40),
  addressLine: s(140), addressCity: s(60), addressState: s(2), addressZip: s(10),
});
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveSettingsAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { user, tenant } = await requireOwnerPanel();
  const p = schema.safeParse(Object.fromEntries(Object.keys(schema.shape).map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: "Confira os dados de contato e endereço." };
  const d = p.data;
  if (d.whatsapp && d.whatsapp.replace(/\D/g, "").length < 10) return { error: "WhatsApp inválido. Use DDD + número." };

  const hours: Record<string, { closed: boolean; open: string; close: string }> = {};
  for (const { key, label } of WEEKDAYS) {
    const closed = form.get(`${key}_open`) !== "on";
    const open = String(form.get(`${key}_from`) ?? "");
    const close = String(form.get(`${key}_to`) ?? "");
    if (!closed && (!TIME.test(open) || !TIME.test(close))) return { error: `Horário inválido em ${label}.` };
    hours[key] = { closed, open: open || "18:00", close: close || "23:00" };
  }

  const acceptsDineIn = form.get("acceptsDineIn") === "on";
  const acceptsPickup = form.get("acceptsPickup") === "on";
  const acceptsDelivery = form.get("acceptsDelivery") === "on";
  const deliveryFee = String(form.get("deliveryFee") ?? "").trim() ? parseBRL(String(form.get("deliveryFee"))) : 0;
  const minOrder = String(form.get("minOrder") ?? "").trim() ? parseBRL(String(form.get("minOrder"))) : 0;
  if (deliveryFee == null || deliveryFee < 0) return { error: "Taxa de entrega inválida." };
  if (minOrder == null || minOrder < 0) return { error: "Pedido mínimo inválido." };
  const acceptsOrders = form.get("acceptsOrders") === "on";
  if (acceptsOrders && !acceptsDineIn && !acceptsPickup && !acceptsDelivery) return { error: "Escolha pelo menos uma forma de atendimento." };

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      phone: d.phone || null, whatsapp: d.whatsapp || null, instagram: d.instagram.replace(/^@/, "") || null,
      addressLine: d.addressLine || null, addressCity: d.addressCity || null, addressState: d.addressState.toUpperCase() || null, addressZip: d.addressZip || null,
      openingHours: hours, acceptsOrders, acceptsDineIn, acceptsPickup, acceptsDelivery, deliveryFeeCents: deliveryFee, minOrderCents: minOrder,
    },
  });
  await audit("tenant.settings", { actorId: user.id, tenantId: tenant.id });
  revalidatePath("/painel", "layout");
  revalidatePath(`/${tenant.slug}`, "layout");
  return { ok: true, message: "Dados salvos." };
}

export async function changePasswordAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { user, actingAsMaster } = await requireOwnerPanel();
  if (actingAsMaster) return { error: "No modo Unlock, redefina a senha pelo Painel Master." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Senha atual incorreta." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit("auth.password_change", { actorId: user.id, tenantId: user.tenantId });
  return { ok: true, message: "Senha alterada." };
}

/** LGPD: remove nome, telefone e endereço de clientes em pedidos antigos. */
export async function anonymizeOrdersAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { user, tenant } = await requireOwnerPanel();
  const days = Math.max(30, Math.min(3650, Number(form.get("days") ?? 90) || 90));
  const r = await db.order.updateMany({
    where: { tenantId: tenant.id, createdAt: { lt: daysAgo(new Date(), days) }, customerName: { not: "Cliente anonimizado" } },
    data: { customerName: "Cliente anonimizado", customerPhone: null, deliveryAddress: null, notes: null },
  });
  await audit("lgpd.anonymize_orders", { actorId: user.id, tenantId: tenant.id, meta: { days, count: r.count } });
  return { ok: true, message: r.count ? `${r.count} pedidos anonimizados.` : "Nenhum pedido antigo para anonimizar." };
}
