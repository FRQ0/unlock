import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { todayDateBR } from "@/lib/dates";

// Contador de visualizações por produto/dia. Não guarda nenhum dado do visitante.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const body = await req.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.slice(0, 40) : null;
  if (!productId) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`view:${ip}:${productId}`, 1, 30 * 60_000) || !rateLimit(`views:${ip}`, 120, 10 * 60_000)) return new NextResponse(null, { status: 204 });

  const product = await db.product.findFirst({ where: { id: productId, tenant: { status: "ACTIVE", published: true } }, select: { id: true, tenantId: true } });
  if (!product) return new NextResponse(null, { status: 204 });
  const day = todayDateBR();
  await db.$transaction([
    db.productViewDay.upsert({
      where: { productId_day: { productId: product.id, day } },
      update: { count: { increment: 1 } },
      create: { productId: product.id, tenantId: product.tenantId, day, count: 1 },
    }),
    db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }),
  ]);
  return new NextResponse(null, { status: 204 });
}
