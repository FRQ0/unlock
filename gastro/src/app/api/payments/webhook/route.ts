import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateway } from "@/lib/payments";
import { audit } from "@/lib/audit";

// Recebe avisos do gateway de pagamento recorrente.
// Enquanto PAYMENT_PROVIDER="none", responde 501 (não implementado) e não altera nada.
export async function POST(req: Request) {
  const gw = gateway();
  if (!gw) return NextResponse.json({ error: "Gateway de pagamento não configurado." }, { status: 501 });
  // parseWebhook DEVE validar a assinatura/segredo do gateway antes de devolver um evento.
  const event = await gw.parseWebhook(req);
  if (!event) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });

  const sub = await db.subscription.findFirst({ where: { provider: gw.id, providerRef: event.providerRef } });
  if (!sub) return NextResponse.json({ ok: true, ignored: true });

  if (event.type === "payment.paid") {
    const periodEnd = new Date(event.paidAt);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await db.$transaction([
      db.payment.create({ data: { subscriptionId: sub.id, amountCents: event.amountCents, status: "PAID", provider: gw.id, providerRef: event.providerRef, method: event.method, paidAt: event.paidAt } }),
      db.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", currentPeriodEnd: periodEnd } }),
      db.tenant.update({ where: { id: sub.tenantId }, data: { status: "ACTIVE" } }),
    ]);
  } else if (event.type === "payment.failed") {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
  } else if (event.type === "subscription.canceled") {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", canceledAt: new Date() } });
  }
  await audit(`payment.webhook.${event.type}`, { tenantId: sub.tenantId, meta: { provider: gw.id } });
  return NextResponse.json({ ok: true });
}
