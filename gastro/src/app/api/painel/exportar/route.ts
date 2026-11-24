import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { panelContextOrNull } from "@/lib/session";
import { audit } from "@/lib/audit";

// LGPD: portabilidade. Exporta os dados do próprio estabelecimento (sem senhas).
export async function GET() {
  const ctx = await panelContextOrNull();
  if (!ctx) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const t = ctx.tenant.id;
  const [tenant, users, categories, products, orders, subscription] = await Promise.all([
    db.tenant.findUnique({ where: { id: t } }),
    db.user.findMany({ where: { tenantId: t }, select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true } }),
    db.category.findMany({ where: { tenantId: t } }),
    db.product.findMany({ where: { tenantId: t }, include: { optionGroups: { include: { options: true } } } }),
    db.order.findMany({ where: { tenantId: t }, include: { items: true }, orderBy: { createdAt: "desc" } }),
    db.subscription.findUnique({ where: { tenantId: t }, include: { plan: { select: { name: true, code: true } }, payments: true } }),
  ]);
  await audit("lgpd.export", { actorId: ctx.user.id, tenantId: t });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), tenant, users, categories, products, orders, subscription }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="unlock-gastro-${ctx.tenant.slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
