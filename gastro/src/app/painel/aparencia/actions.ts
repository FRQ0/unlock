"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { isHexColor } from "@/lib/theme";
import { urlBelongsToTenant } from "@/lib/storage";
import { audit } from "@/lib/audit";

export type AppearanceState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do estabelecimento.").max(80),
  menuName: z.string().trim().max(40),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(600),
  primaryColor: z.string().refine(isHexColor, "Cor principal inválida."),
  secondaryColor: z.string().refine(isHexColor, "Cor secundária inválida."),
  buttonColor: z.string().refine(isHexColor, "Cor dos botões inválida."),
  cardStyle: z.enum(["ROUNDED", "SQUARE", "PILL"]),
  appearance: z.enum(["DARK", "LIGHT"]),
  logoUrl: z.string(),
  coverUrl: z.string(),
});

export async function saveAppearanceAction(_: AppearanceState, form: FormData): Promise<AppearanceState> {
  const { user, tenant } = await requireOwnerPanel();
  const p = schema.safeParse(Object.fromEntries(Object.keys(schema.shape).map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  for (const u of [d.logoUrl, d.coverUrl]) if (u && !urlBelongsToTenant(u, tenant.id)) return { error: "Envie as imagens novamente." };
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      name: d.name, menuName: d.menuName || null, tagline: d.tagline || null, description: d.description || null,
      primaryColor: d.primaryColor.toUpperCase(), secondaryColor: d.secondaryColor.toUpperCase(), buttonColor: d.buttonColor.toUpperCase(),
      cardStyle: d.cardStyle, appearance: d.appearance, logoUrl: d.logoUrl || null, coverUrl: d.coverUrl || null,
    },
  });
  await audit("menu.appearance", { actorId: user.id, tenantId: tenant.id });
  revalidatePath("/painel", "layout");
  revalidatePath(`/${tenant.slug}`, "layout");
  return { ok: true };
}
