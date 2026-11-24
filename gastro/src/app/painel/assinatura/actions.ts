"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { gateway } from "@/lib/payments";
import { appUrl } from "@/lib/urls";
import { audit } from "@/lib/audit";

export type SubState = { error?: string } | undefined;

/** Enquanto a assinatura não foi paga, o dono pode trocar de plano livremente. */
export async function choosePlanAction(form: FormData) {
  const { user, tenant } = await requireOwnerPanel();
  const plan = await db.plan.findFirst({ where: { code: String(form.get("plan") ?? ""), active: true } });
  const sub = await db.subscription.findUnique({ where: { tenantId: tenant.id } });
  if (!plan || !sub || sub.status !== "PENDING") return;
  await db.subscription.update({ where: { id: sub.id }, data: { planId: plan.id } });
  await audit("subscription.change_plan", { actorId: user.id, tenantId: tenant.id, meta: { plan: plan.code } });
  revalidatePath("/painel", "layout");
}

export async function startCheckoutAction(_: SubState): Promise<SubState> {
  const { user, tenant } = await requireOwnerPanel();
  const gw = gateway();
  if (!gw) return { error: "O pagamento online ainda não está disponível. A Unlock vai combinar o pagamento com você." };
  const sub = await db.subscription.findUnique({ where: { tenantId: tenant.id }, include: { plan: true } });
  if (!sub) return { error: "Assinatura não encontrada." };
  if (sub.plan.priceCents == null) return { error: "O valor deste plano ainda não foi definido. Fale com a Unlock." };
  const owner = await db.user.findFirst({ where: { tenantId: tenant.id, role: "OWNER" } });
  const res = await gw.createCheckout({
    tenantId: tenant.id, subscriptionId: sub.id, planName: sub.plan.name, amountCents: sub.plan.priceCents,
    customer: { name: owner?.name ?? tenant.name, email: owner?.email ?? user.email }, returnUrl: `${appUrl()}/painel/assinatura`,
  });
  await db.subscription.update({ where: { id: sub.id }, data: { provider: gw.id, providerRef: res.providerRef } });
  await audit("subscription.checkout", { actorId: user.id, tenantId: tenant.id, meta: { provider: gw.id } });
  redirect(res.url);
}
