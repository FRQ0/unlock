import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Tenant, User } from "@prisma/client";
import { db } from "./db";
import { readActingTenant, readSession } from "./auth";
import { parseFeatures } from "./plans";

/** Usuário logado (conferido no banco a cada requisição: desativado = deslogado). */
export const currentUser = cache(async (): Promise<User | null> => {
  const s = await readSession();
  if (!s?.sub) return null;
  const user = await db.user.findUnique({ where: { id: s.sub } });
  if (!user || !user.active) return null;
  return user;
});

export type PanelContext = {
  user: User;
  tenant: Tenant;
  /** true quando é a equipe Unlock operando a conta do cliente */
  actingAsMaster: boolean;
};

/**
 * Contexto do painel do estabelecimento. É a ÚNICA fonte de `tenantId` para as
 * telas e ações do painel: nunca usar um tenantId vindo do formulário ou da URL.
 */
export const requirePanel = cache(async (): Promise<PanelContext> => {
  const user = await currentUser();
  if (!user) redirect("/entrar");

  if (user.role === "MASTER") {
    const tid = await readActingTenant(user.id);
    if (!tid) redirect("/master");
    const tenant = await db.tenant.findUnique({ where: { id: tid } });
    if (!tenant) redirect("/master");
    return { user, tenant, actingAsMaster: true };
  }

  if (!user.tenantId) redirect("/entrar");
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant || tenant.status === "CANCELED") redirect("/entrar?erro=conta");
  return { user, tenant, actingAsMaster: false };
});

/** Somente o dono (ou a Unlock) pode mexer em cardápio, aparência e assinatura. */
export async function requireOwnerPanel(): Promise<PanelContext> {
  const ctx = await requirePanel();
  if (ctx.user.role === "STAFF") redirect("/painel/garcom");
  return ctx;
}

export const requireMaster = cache(async (): Promise<User> => {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "MASTER") redirect("/painel");
  return user;
});

/** Versão sem redirecionamento, para rotas de API. */
export async function panelContextOrNull(): Promise<PanelContext | null> {
  const user = await currentUser();
  if (!user) return null;
  if (user.role === "MASTER") {
    const tid = await readActingTenant(user.id);
    const tenant = tid ? await db.tenant.findUnique({ where: { id: tid } }) : null;
    return tenant ? { user, tenant, actingAsMaster: true } : null;
  }
  if (!user.tenantId || user.role === "STAFF") return null;
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  return tenant && tenant.status !== "CANCELED" ? { user, tenant, actingAsMaster: false } : null;
}

export async function tenantFeatures(tenantId: string) {
  const sub = await db.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
  return { ...parseFeatures(sub?.plan.features), planName: sub?.plan.name ?? null, subscriptionStatus: sub?.status ?? null };
}
