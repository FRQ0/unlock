"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";

export type CatState = { error?: string; ok?: boolean } | undefined;
const name = z.string().trim().min(1, "Dê um nome à categoria.").max(40, "Nome muito longo (máx. 40).");

function done(slug: string) {
  revalidatePath("/painel/categorias");
  revalidatePath("/painel/produtos");
  revalidatePath(`/${slug}`);
}

export async function createCategoryAction(_: CatState, form: FormData): Promise<CatState> {
  const { tenant } = await requireOwnerPanel();
  const p = name.safeParse(form.get("name"));
  if (!p.success) return { error: p.error.issues[0].message };
  const count = await db.category.count({ where: { tenantId: tenant.id } });
  if (count >= 60) return { error: "Limite de 60 categorias." };
  const last = await db.category.findFirst({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "desc" } });
  await db.category.create({ data: { tenantId: tenant.id, name: p.data, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  done(tenant.slug);
  return { ok: true };
}

export async function renameCategoryAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  const p = name.safeParse(form.get("name"));
  if (!p.success) return;
  await db.category.updateMany({ where: { id: String(form.get("id")), tenantId: tenant.id }, data: { name: p.data } });
  done(tenant.slug);
}

export async function toggleCategoryAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  const c = await db.category.findFirst({ where: { id: String(form.get("id")), tenantId: tenant.id } });
  if (!c) return;
  await db.category.update({ where: { id: c.id }, data: { active: !c.active } });
  done(tenant.slug);
}

export async function deleteCategoryAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  // deleteMany com tenantId: nunca apaga categoria de outro estabelecimento.
  await db.category.deleteMany({ where: { id: String(form.get("id")), tenantId: tenant.id } });
  done(tenant.slug);
}

export async function moveCategoryAction(form: FormData) {
  const { tenant } = await requireOwnerPanel();
  const dir = form.get("dir") === "up" ? -1 : 1;
  const list = await db.category.findMany({ where: { tenantId: tenant.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((c) => c.id === form.get("id"));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((c, idx) => db.category.update({ where: { id: c.id }, data: { sortOrder: idx + 1 } })));
  done(tenant.slug);
}
