"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function setPublishedAction(form: FormData) {
  const { user, tenant } = await requireOwnerPanel();
  const published = form.get("published") === "1";
  await db.tenant.update({ where: { id: tenant.id }, data: { published } });
  await audit(published ? "menu.publish" : "menu.unpublish", { actorId: user.id, tenantId: tenant.id });
  revalidatePath("/painel", "layout");
  revalidatePath(`/${tenant.slug}`);
}
