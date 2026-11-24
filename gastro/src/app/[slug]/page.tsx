import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/menu";
import { RESERVED_SLUGS } from "@/lib/slug";
import { MenuApp } from "@/components/menu/MenuApp";
import { panelContextOrNull, currentUser } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const menu = RESERVED_SLUGS.has(slug) ? null : await getMenu(slug);
  if (!menu) return { title: "Cardápio não encontrado" };
  return {
    title: { absolute: `${menu.info.name} · Cardápio` },
    description: menu.info.tagline ?? `Cardápio digital de ${menu.info.name}`,
    openGraph: { title: menu.info.name, description: menu.info.tagline ?? undefined, images: menu.info.coverUrl ? [menu.info.coverUrl] : undefined },
  };
}

export default async function MenuPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mesa?: string; garcom?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const table = sp.mesa?.trim().slice(0, 10).replace(/[^\w -]/g, "") || undefined;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const menu = await getMenu(slug);
  if (!menu) notFound();
  // Modo garçom só para a equipe logada DESTE estabelecimento (não basta o parâmetro na URL).
  let waiter = false;
  if (sp.garcom === "1" && table) {
    const user = await currentUser();
    if (user?.role === "MASTER") waiter = (await panelContextOrNull())?.tenant.slug === slug;
    else if (user?.tenantId) waiter = await belongsTo(user.tenantId, slug);
  }
  return <MenuApp data={menu} table={table} waiter={waiter} />;
}

async function belongsTo(tenantId: string, slug: string) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  return t?.slug === slug;
}
