"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnerPanel, tenantFeatures } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { urlBelongsToTenant } from "@/lib/storage";
import { audit } from "@/lib/audit";

export type ProductState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const optionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Toda opção precisa de nome.").max(60),
  price: z.string().max(20),
  available: z.boolean(),
});
const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Todo grupo precisa de nome.").max(40),
  type: z.enum(["SINGLE", "MULTIPLE"]),
  required: z.boolean(),
  maxSelect: z.number().int().min(0).max(50),
  options: z.array(optionSchema).min(1, "Cada grupo precisa de pelo menos uma opção.").max(60),
});
const groupsSchema = z.array(groupSchema).max(15);

function revalidate(slug: string, id?: string) {
  revalidatePath("/painel/produtos");
  if (id) revalidatePath(`/painel/produtos/${id}`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/feed`);
}

export async function saveProductAction(_: ProductState, form: FormData): Promise<ProductState> {
  const { user, tenant } = await requireOwnerPanel();
  const t = tenant.id;
  const id = String(form.get("id") ?? "") || null;
  const fieldErrors: Record<string, string> = {};

  const name = String(form.get("name") ?? "").trim();
  if (!name) fieldErrors.name = "Dê um nome ao produto.";
  if (name.length > 80) fieldErrors.name = "Nome muito longo (máx. 80).";
  const description = String(form.get("description") ?? "").trim();
  if (description.length > 600) fieldErrors.description = "Descrição muito longa (máx. 600).";
  const priceCents = parseBRL(String(form.get("price") ?? ""));
  if (priceCents == null || priceCents < 0) fieldErrors.price = "Informe o preço. Ex.: 32,90";
  else if (priceCents > 10_000_000) fieldErrors.price = "Preço alto demais.";

  const categoryId = String(form.get("categoryId") ?? "") || null;
  if (categoryId && !(await db.category.findFirst({ where: { id: categoryId, tenantId: t }, select: { id: true } }))) {
    fieldErrors.categoryId = "Categoria inválida.";
  }

  const imageUrl = String(form.get("imageUrl") ?? "") || null;
  const videoUrl = String(form.get("videoUrl") ?? "") || null;
  if (imageUrl && !urlBelongsToTenant(imageUrl, t)) fieldErrors.imageUrl = "Envie a foto novamente.";
  if (videoUrl && !urlBelongsToTenant(videoUrl, t)) fieldErrors.videoUrl = "Envie o vídeo novamente.";
  const features = await tenantFeatures(t);

  let groupsRaw: unknown;
  try { groupsRaw = JSON.parse(String(form.get("groups") ?? "[]")); } catch { groupsRaw = null; }
  const groups = groupsSchema.safeParse(groupsRaw);
  if (!groups.success) fieldErrors.groups = groups.error.issues[0]?.message ?? "Confira as variações e adicionais.";
  const parsedGroups = groups.success
    ? groups.data.map((g) => ({
        ...g,
        options: g.options.map((o) => ({ ...o, priceDeltaCents: o.price.trim() ? parseBRL(o.price) : 0 })),
      }))
    : [];
  if (parsedGroups.some((g) => g.options.some((o) => o.priceDeltaCents == null))) fieldErrors.groups = "Confira os valores das opções. Ex.: 4,00";

  if (Object.keys(fieldErrors).length) return { error: "Confira os campos destacados.", fieldErrors };

  const existing = id ? await db.product.findFirst({ where: { id, tenantId: t }, include: { optionGroups: { include: { options: true } } } }) : null;
  if (id && !existing) return { error: "Produto não encontrado." };
  if (!existing && features.maxProducts > 0 && (await db.product.count({ where: { tenantId: t } })) >= features.maxProducts) {
    return { error: `Seu plano permite até ${features.maxProducts} produtos.` };
  }
  // Sem o recurso de vídeo no plano, mantém o vídeo que já existia (ex.: enviado pela Unlock) e ignora novos.
  const finalVideo = features.videoFeed ? videoUrl : existing?.videoUrl ?? null;

  const base = {
    name, description: description || null, priceCents: priceCents!, categoryId, imageUrl, videoUrl: finalVideo,
    available: form.get("available") === "on", featured: form.get("featured") === "on",
  };

  const productId = await db.$transaction(async (tx) => {
    let pid: string;
    if (existing) {
      await tx.product.update({ where: { id: existing.id }, data: base });
      pid = existing.id;
    } else {
      const last = await tx.product.findFirst({ where: { tenantId: t, categoryId }, orderBy: { sortOrder: "desc" } });
      pid = (await tx.product.create({ data: { ...base, tenantId: t, sortOrder: (last?.sortOrder ?? 0) + 1 } })).id;
    }

    // Sincroniza grupos/opções preservando ids existentes (carrinhos abertos continuam válidos).
    const oldGroups = existing?.optionGroups ?? [];
    const keepGroupIds = new Set(parsedGroups.map((g) => g.id).filter((x): x is string => !!x && oldGroups.some((og) => og.id === x)));
    await tx.optionGroup.deleteMany({ where: { tenantId: t, productId: pid, id: { notIn: [...keepGroupIds] } } });

    for (const [gi, g] of parsedGroups.entries()) {
      const gData = { name: g.name, type: g.type, required: g.required, minSelect: g.required ? 1 : 0, maxSelect: g.type === "SINGLE" ? 1 : g.maxSelect, sortOrder: gi };
      const old = g.id && keepGroupIds.has(g.id) ? oldGroups.find((og) => og.id === g.id)! : null;
      const groupId = old
        ? (await tx.optionGroup.update({ where: { id: old.id }, data: gData })).id
        : (await tx.optionGroup.create({ data: { ...gData, tenantId: t, productId: pid } })).id;
      const keepOpt = new Set(g.options.map((o) => o.id).filter((x): x is string => !!x && !!old?.options.some((oo) => oo.id === x)));
      await tx.option.deleteMany({ where: { tenantId: t, groupId, id: { notIn: [...keepOpt] } } });
      for (const [oi, o] of g.options.entries()) {
        const oData = { name: o.name, priceDeltaCents: o.priceDeltaCents!, available: o.available, sortOrder: oi };
        if (o.id && keepOpt.has(o.id)) await tx.option.update({ where: { id: o.id }, data: oData });
        else await tx.option.create({ data: { ...oData, tenantId: t, groupId } });
      }
    }
    return pid;
  });

  await audit(existing ? "product.update" : "product.create", { actorId: user.id, tenantId: t, meta: { productId } });
  revalidate(tenant.slug, productId);
  redirect(`/painel/produtos?salvo=${encodeURIComponent(name)}`);
}

export async function deleteProductAction(form: FormData) {
  const { user, tenant } = await requireOwnerPanel();
  const id = String(form.get("id") ?? "");
  const r = await db.product.deleteMany({ where: { id, tenantId: tenant.id } });
  if (r.count) await audit("product.delete", { actorId: user.id, tenantId: tenant.id, meta: { productId: id } });
  revalidate(tenant.slug);
  if (form.get("from") === "edit") redirect("/painel/produtos");
}

export async function toggleProductAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  const field = form.get("field") === "featured" ? "featured" : "available";
  const p = await db.product.findFirst({ where: { id: String(form.get("id") ?? ""), tenantId: tenant.id } });
  if (!p) return;
  await db.product.update({ where: { id: p.id }, data: { [field]: !p[field] } });
  revalidate(tenant.slug);
}

export async function moveProductAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  const p = await db.product.findFirst({ where: { id: String(form.get("id") ?? ""), tenantId: tenant.id } });
  if (!p) return;
  const list = await db.product.findMany({ where: { tenantId: tenant.id, categoryId: p.categoryId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((x) => x.id === p.id);
  const j = i + (form.get("dir") === "up" ? -1 : 1);
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, idx) => db.product.update({ where: { id: x.id }, data: { sortOrder: idx + 1 } })));
  revalidate(tenant.slug);
}
