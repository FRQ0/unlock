"use server";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { priceCart, PricingError } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { isOpenNow, parseHours } from "@/lib/hours";
import { formatBRL } from "@/lib/money";

const input = z.object({
  mode: z.enum(["DINE_IN", "PICKUP", "DELIVERY"]),
  customerName: z.string().trim().min(2, "Informe seu nome.").max(60),
  customerPhone: z.string().trim().max(20).optional().default(""),
  tableNumber: z.string().trim().max(10).optional().default(""),
  deliveryAddress: z.string().trim().max(240).optional().default(""),
  notes: z.string().trim().max(280).optional().default(""),
  consent: z.literal(true, { message: "Para enviar, aceite o uso dos seus dados para este pedido." }),
  lines: z.array(z.object({
    productId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(50),
    optionIds: z.array(z.string().max(40)).max(60),
    notes: z.string().max(280).optional(),
  })).min(1, "O carrinho está vazio.").max(60),
});

export type PlaceOrderResult = { ok: true; token: string } | { ok: false; error: string };

export async function placeOrderAction(slug: string, raw: unknown): Promise<PlaceOrderResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`order:${ip}`, 8, 10 * 60_000)) return { ok: false, error: "Muitos pedidos seguidos. Aguarde alguns minutos." };

  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Pedido inválido." };
  const d = parsed.data;

  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "ACTIVE" || !tenant.published) return { ok: false, error: "Este cardápio não está recebendo pedidos." };
  if (!tenant.acceptsOrders) return { ok: false, error: "Os pedidos pelo cardápio estão desativados. Fale com o atendente." };
  if (isOpenNow(parseHours(tenant.openingHours)) === false) return { ok: false, error: "Estamos fechados agora. Confira o horário de funcionamento." };

  const modeOk = { DINE_IN: tenant.acceptsDineIn, PICKUP: tenant.acceptsPickup, DELIVERY: tenant.acceptsDelivery }[d.mode];
  if (!modeOk) return { ok: false, error: "Essa forma de atendimento não está disponível." };
  if (d.mode === "DINE_IN" && !d.tableNumber) return { ok: false, error: "Informe o número da mesa." };
  if (d.mode !== "DINE_IN" && d.customerPhone.replace(/\D/g, "").length < 10) return { ok: false, error: "Informe um telefone com DDD." };
  if (d.mode === "DELIVERY" && d.deliveryAddress.length < 8) return { ok: false, error: "Informe o endereço completo para entrega." };

  // Só produtos DESTE estabelecimento entram no cálculo.
  const ids = [...new Set(d.lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, OR: [{ categoryId: null }, { category: { active: true } }] },
    include: { optionGroups: { include: { options: true } } },
  });

  let priced;
  try {
    priced = priceCart(
      products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, available: p.available, optionGroups: p.optionGroups })),
      d.lines.map((l) => ({ ...l, notes: l.notes ?? "" })),
      d.mode === "DELIVERY" ? tenant.deliveryFeeCents : 0,
    );
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, error: `${e.message} Atualize o carrinho e tente de novo.` };
    throw e;
  }
  if (d.mode === "DELIVERY" && tenant.minOrderCents && priced.subtotalCents < tenant.minOrderCents) {
    return { ok: false, error: `O pedido mínimo para entrega é ${formatBRL(tenant.minOrderCents)}.` };
  }

  const token = crypto.randomBytes(18).toString("base64url");
  await db.$transaction(async (tx) => {
    const { orderSeq } = await tx.tenant.update({ where: { id: tenant.id }, data: { orderSeq: { increment: 1 } }, select: { orderSeq: true } });
    await tx.order.create({
      data: {
        tenantId: tenant.id, number: orderSeq, publicToken: token, mode: d.mode,
        customerName: d.customerName, customerPhone: d.customerPhone || null, tableNumber: d.mode === "DINE_IN" ? d.tableNumber : null,
        deliveryAddress: d.mode === "DELIVERY" ? d.deliveryAddress : null, notes: d.notes || null,
        subtotalCents: priced.subtotalCents, deliveryFeeCents: priced.deliveryFeeCents, totalCents: priced.totalCents, consentAt: new Date(),
        items: {
          create: priced.lines.map((l) => ({
            tenantId: tenant.id, productId: l.productId, productName: l.productName, unitPriceCents: l.unitPriceCents,
            quantity: l.quantity, options: l.options, notes: l.notes, totalCents: l.totalCents,
          })),
        },
      },
    });
  });
  return { ok: true, token };
}
