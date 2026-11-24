import Link from "next/link";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { fmtDate, daysAgo } from "@/lib/dates";
import { Card, PageHeader, Pill } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TenantStatusPill } from "./ui";

export default async function MasterHome() {
  const monthAgo = daysAgo(new Date(), 30);
  const [byStatus, subs, recent, orders30, pastDue] = await Promise.all([
    db.tenant.groupBy({ by: ["status"], _count: true }),
    db.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: { select: { priceCents: true, name: true } } } }),
    db.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { subscription: { include: { plan: { select: { name: true } } } } } }),
    db.order.count({ where: { createdAt: { gte: monthAgo }, status: { not: "CANCELED" } } }),
    db.subscription.count({ where: { status: "PAST_DUE" } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const total = byStatus.reduce((a, b) => a + b._count, 0);
  const mrr = subs.reduce((a, s) => a + (s.plan.priceCents ?? 0), 0);
  const unpriced = subs.filter((s) => s.plan.priceCents == null).length;

  return (
    <>
      <PageHeader kicker="Master" title="Visão geral" subtitle="Toda a plataforma Unlock Gastro em um lugar." actions={<LinkButton href="/master/estabelecimentos/novo"><Icon name="plus" />Criar estabelecimento</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Clientes ativos" value={String(count("ACTIVE"))} note={`${total} estabelecimentos no total`} />
        <Kpi label="Aguardando pagamento" value={String(count("PENDING_PAYMENT"))} note={`${count("SUSPENDED")} suspensos · ${count("CANCELED")} cancelados`} />
        <Kpi label="Receita mensal (assinaturas ativas)" value={formatBRL(mrr)} note={unpriced ? `${unpriced} assinatura(s) com plano sem preço definido` : `${subs.length} assinaturas ativas`} />
        <Kpi label="Pedidos (30 dias)" value={String(orders30)} note={pastDue ? `${pastDue} assinatura(s) em atraso` : "nenhuma assinatura em atraso"} />
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Últimos cadastros</h2><Link href="/master/estabelecimentos" className="text-sm font-semibold text-brasa-ink">Ver todos</Link></div>
        {recent.length === 0 ? <p className="text-[15px] text-ink-muted">Nenhum estabelecimento cadastrado ainda.</p> : (
          <ul className="flex flex-col divide-y divide-paper-line">
            {recent.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link href={`/master/estabelecimentos/${t.id}`} className="min-w-0 flex-1 font-semibold hover:underline">{t.name}<span className="block text-[13px] font-normal text-ink-muted">/{t.slug} · {fmtDate(t.createdAt)}</span></Link>
                {t.subscription && <Pill>{t.subscription.plan.name}</Pill>}
                <TenantStatusPill status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-paper-line bg-white p-5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="display text-[26px] tabular-nums sm:text-[30px]">{value}</span>
      <span className="text-[13px] text-ink-muted">{note}</span>
    </div>
  );
}
