import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMenu } from "@/lib/menu";
import { RESERVED_SLUGS } from "@/lib/slug";
import { FeedApp } from "@/components/menu/FeedView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const menu = RESERVED_SLUGS.has(slug) ? null : await getMenu(slug);
  return { title: menu ? { absolute: `${menu.info.name} · Vídeos` } : "Cardápio não encontrado" };
}

export default async function FeedPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> }) {
  const { slug } = await params;
  const { p } = await searchParams;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const menu = await getMenu(slug);
  if (!menu) notFound();
  // Featured primeiro, depois na ordem do cardápio.
  const all = menu.categories.flatMap((c) => c.products.map((pr) => ({ ...pr, categoryName: c.id === "outros" ? null : c.name })));
  const items = [...all.filter((x) => x.featured), ...all.filter((x) => !x.featured)].filter((x) => x.videoUrl);
  if (!menu.videoFeed || items.length === 0) redirect(`/${slug}`);
  return <FeedApp data={menu} items={items} startId={p} />;
}
