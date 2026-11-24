import "server-only";
import { cache } from "react";
import { db } from "./db";
import { parseFeatures } from "./plans";
import { isOpenNow, parseHours, todayLabel, type OpeningHours } from "./hours";
import type { MenuTheme } from "./theme";

export type MenuOption = { id: string; name: string; priceDeltaCents: number; available: boolean };
export type MenuGroup = { id: string; name: string; type: "SINGLE" | "MULTIPLE"; required: boolean; minSelect: number; maxSelect: number; options: MenuOption[] };
export type MenuProduct = {
  id: string; name: string; description: string | null; priceCents: number; imageUrl: string | null; videoUrl: string | null;
  featured: boolean; categoryId: string | null; groups: MenuGroup[];
};
export type MenuCategory = { id: string; name: string; products: MenuProduct[] };
export type MenuInfo = {
  slug: string; name: string; menuName: string | null; tagline: string | null; description: string | null;
  logoUrl: string | null; coverUrl: string | null; phone: string | null; whatsapp: string | null; instagram: string | null;
  address: string | null; hours: OpeningHours | null; openNow: boolean | null; todayHours: string | null;
  acceptsOrders: boolean; acceptsDineIn: boolean; acceptsPickup: boolean; acceptsDelivery: boolean;
  deliveryFeeCents: number; minOrderCents: number;
};
export type MenuData = { info: MenuInfo; theme: MenuTheme; categories: MenuCategory[]; featured: MenuProduct[]; videoFeed: boolean; videoCount: number };

export function formatAddress(t: { addressLine: string | null; addressCity: string | null; addressState: string | null }) {
  const cityState = [t.addressCity, t.addressState].filter(Boolean).join(" - ");
  return [t.addressLine, cityState].filter(Boolean).join(", ") || null;
}

/**
 * Carrega o cardápio público. `allowUnpublished` é usado só na prévia do dono.
 * Retorna null quando o estabelecimento não existe ou não está no ar.
 */
export const getMenu = cache(async (slug: string, opts: { allowUnpublished?: boolean } = {}): Promise<MenuData | null> => {
  const tenant = await db.tenant.findUnique({
    where: { slug },
    include: {
      subscription: { include: { plan: true } },
      categories: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      products: {
        where: { available: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
  if (!tenant) return null;
  const live = tenant.status === "ACTIVE" && tenant.published;
  if (!live && !opts.allowUnpublished) return null;

  const features = parseFeatures(tenant.subscription?.plan.features);
  const hours = parseHours(tenant.openingHours);
  const activeCats = new Set(tenant.categories.map((c) => c.id));
  const products: MenuProduct[] = tenant.products
    .filter((p) => !p.categoryId || activeCats.has(p.categoryId))
    .map((p) => ({
      id: p.id, name: p.name, description: p.description, priceCents: p.priceCents, imageUrl: p.imageUrl,
      videoUrl: features.videoFeed ? p.videoUrl : null, featured: p.featured, categoryId: p.categoryId,
      groups: p.optionGroups.map((g) => ({
        id: g.id, name: g.name, type: g.type, required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect,
        options: g.options.map((o) => ({ id: o.id, name: o.name, priceDeltaCents: o.priceDeltaCents, available: o.available })),
      })),
    }));

  const categories: MenuCategory[] = tenant.categories
    .map((c) => ({ id: c.id, name: c.name, products: products.filter((p) => p.categoryId === c.id) }))
    .filter((c) => c.products.length);
  const loose = products.filter((p) => !p.categoryId);
  if (loose.length) categories.push({ id: "outros", name: "Outros", products: loose });

  return {
    info: {
      slug: tenant.slug, name: tenant.name, menuName: tenant.menuName, tagline: tenant.tagline, description: tenant.description,
      logoUrl: tenant.logoUrl, coverUrl: tenant.coverUrl, phone: tenant.phone, whatsapp: tenant.whatsapp, instagram: tenant.instagram,
      address: formatAddress(tenant), hours, openNow: isOpenNow(hours), todayHours: todayLabel(hours),
      acceptsOrders: tenant.acceptsOrders && live, acceptsDineIn: tenant.acceptsDineIn, acceptsPickup: tenant.acceptsPickup,
      acceptsDelivery: tenant.acceptsDelivery, deliveryFeeCents: tenant.deliveryFeeCents, minOrderCents: tenant.minOrderCents,
    },
    theme: { primaryColor: tenant.primaryColor, secondaryColor: tenant.secondaryColor, buttonColor: tenant.buttonColor, cardStyle: tenant.cardStyle, appearance: tenant.appearance },
    categories,
    featured: products.filter((p) => p.featured),
    videoFeed: features.videoFeed,
    videoCount: products.filter((p) => p.videoUrl).length,
  };
});
