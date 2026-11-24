import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/menu";
import { RESERVED_SLUGS } from "@/lib/slug";
import { MenuApp } from "@/components/menu/MenuApp";

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

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const menu = await getMenu(slug);
  if (!menu) notFound();
  return <MenuApp data={menu} />;
}
