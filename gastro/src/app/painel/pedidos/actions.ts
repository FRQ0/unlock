"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePanel } from "@/lib/session";
import { audit } from "@/lib/audit";

const FLOW: Record<string, string[]> = {
  NEW: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

// Funcionários (STAFF) também podem mudar o status dos pedidos.
export async function setOrderStatusAction(form: FormData) {
  const { user, tenant } = await requirePanel();
  const id = String(form.get("id") ?? "");
  const status = z.enum(["PREPARING", "READY", "COMPLETED", "CANCELED"]).parse(form.get("status"));
  const order = await db.order.findFirst({ where: { id, tenantId: tenant.id } });
  if (!order || !FLOW[order.status].includes(status)) return;
  await db.order.update({ where: { id: order.id }, data: { status } });
  if (status === "CANCELED") await audit("order.cancel", { actorId: user.id, tenantId: tenant.id, meta: { orderId: id } });
  revalidatePath("/painel/pedidos");
  revalidatePath("/painel", "layout");
}
