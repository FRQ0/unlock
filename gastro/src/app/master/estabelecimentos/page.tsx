import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, TenantStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { Alert, EmptyState, PageHeader, Pill } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SubStatusPill, TenantStatusPill, TENANT_STATUS_LABEL } from "../ui";

export const metadata: Metadata = { title: "Estabelecimentos" };
const STATUSES: TenantStatus[] = ["ACTIVE", "PENDING_PAYMENT", "SUSPENDED", "CANCELED"];

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; excluido?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const status = STATUSES.includes(sp.status as TenantStatus) ? (sp.status as TenantStatus) : undefined;
  const where: Prisma.TenantWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { users: { some: { email: { contains: q, mode: "insensitive" } } } }] } : {}),
  };
  const tenants = await db.tenant.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    include: { subscription: { include: { plan: { select: { name: true } } } }, _count: { select: { products: true, orders: true } } },
  });

  return (
    <>
      <PageHeader kicker="Master" title="Estabelecimentos" subtitle={`${tenants.length} resultado(s).`} actions={<LinkButton href="/master/estabelecimentos/novo"><Icon name="plus" />Criar estabelecimento</LinkButton>} />
      {sp.excluido && <Alert tone="success">Estabelecimento excluído definitivamente.</Alert>}
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nome, endereço ou e-mail do dono" className="h-12 flex-1 rounded-xl border border-paper-line-2 bg-white px-3.5 focus:border-brasa focus:outline-none" />
        <label htmlFor="status" className="sr-only">Situação</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="h-12 rounded-xl border border-paper-line-2 bg-white px-3">
          <option value="">Todas as situações</option>
          {STATUSES.map((s) => <option key={s} value={s}>{TENANT_STATUS_LABEL[s]}</option>)}
        </select>
        <button type="submit" className="h-12 rounded-xl bg-grafite px-5 font-semibold text-gelo">Filtrar</button>
      </form>
      {tenants.length === 0 ? <EmptyState icon="store" title="Nenhum estabelecimento encontrado" /> : (
        <div className="overflow-x-auto rounded-2xl border border-paper-line bg-white">
          <table className="w-full min-w-[820px] text-left text-[15px]">
            <thead className="border-b border-paper-line text-sm text-ink-muted">
              <tr><th className="px-4 py-3 font-medium">Estabelecimento</th><th className="px-4 py-3 font-medium">Plano</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3 font-medium">Pagamento</th><th className="px-4 py-3 font-medium">Produtos / pedidos</th><th className="px-4 py-3 font-medium">Desde</th></tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gelo/60">
                  <td className="px-4 py-3"><Link href={`/master/estabelecimentos/${t.id}`} className="font-semibold hover:underline">{t.name}</Link><span className="block text-[13px] text-ink-muted">/{t.slug} {t.published ? "" : "· não publicado"}</span></td>
                  <td className="px-4 py-3">{t.subscription ? <Pill>{t.subscription.plan.name}</Pill> : "—"}</td>
                  <td className="px-4 py-3"><TenantStatusPill status={t.status} /></td>
                  <td className="px-4 py-3">{t.subscription ? <SubStatusPill status={t.subscription.status} /> : "—"}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{t._count.products} / {t._count.orders}</td>
                  <td className="px-4 py-3 text-sm">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
