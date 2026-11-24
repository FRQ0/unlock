import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBRL, centsToInput } from "@/lib/money";
import { fmtDate, fmtDateTime, daysAgo } from "@/lib/dates";
import { parseFeatures } from "@/lib/plans";
import { menuUrl } from "@/lib/urls";
import { Alert, Card, PageHeader, Pill } from "@/components/ui/Feedback";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Icon } from "@/components/ui/Icon";
import { changeTenantPlanAction, setTenantStatusAction, startActingAction } from "../../actions";
import { SubStatusPill, TenantStatusPill } from "../../ui";
import { BasicsForm, DeleteTenantForm, ManualPaymentForm } from "./Forms";

export const metadata: Metadata = { title: "Estabelecimento" };

export default async function TenantDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { id } = await params;
  const { criado } = await searchParams;
  const t = await db.tenant.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      subscription: { include: { plan: true, payments: { orderBy: { createdAt: "desc" }, take: 20 } } },
      _count: { select: { products: true, categories: true, orders: true } },
    },
  });
  if (!t) notFound();
  const [plans, orders30, logs] = await Promise.all([
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.order.count({ where: { tenantId: t.id, createdAt: { gte: daysAgo(new Date(), 30) } } }),
    db.auditLog.findMany({ where: { tenantId: t.id }, orderBy: { createdAt: "desc" }, take: 15, include: { actor: { select: { email: true } } } }),
  ]);
  const sub = t.subscription;
  const features = parseFeatures(sub?.plan.features);

  return (
    <>
      <PageHeader
        kicker="Estabelecimento"
        title={t.name}
        subtitle={<span className="flex flex-wrap items-center gap-2">/{t.slug} <TenantStatusPill status={t.status} /> {sub && <SubStatusPill status={sub.status} />} {features.managedByUnlock && <Pill tone="brasa">Unlock gerencia</Pill>}</span>}
        actions={
          <>
            <a href={menuUrl(t.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-paper-line-2 px-4 font-semibold hover:bg-black/5"><Icon name="eye" />Ver cardápio</a>
            <form action={startActingAction}><input type="hidden" name="tenantId" value={t.id} /><SubmitButton pendingText="Abrindo..."><Icon name="edit" />Gerenciar cardápio</SubmitButton></form>
          </>
        }
      />
      {criado && <Alert tone="success">Estabelecimento criado. Envie o acesso ao dono e registre o pagamento quando receber.</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Produtos", t._count.products], ["Categorias", t._count.categories], ["Pedidos (30 dias)", orders30], ["Pedidos no total", t._count.orders]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-paper-line bg-white p-4"><span className="text-sm text-ink-muted">{l}</span><p className="display mt-1 text-[24px] tabular-nums">{v}</p></div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Assinatura</h2>
          {sub ? (
            <>
              <p className="text-[15px]">Plano <strong>{sub.plan.name}</strong> · {sub.plan.priceCents != null ? `${formatBRL(sub.plan.priceCents)}/mês` : "sem preço definido"}{sub.currentPeriodEnd && <> · pago até <strong>{fmtDate(sub.currentPeriodEnd)}</strong></>}</p>
              <p className="text-[13px] text-ink-muted">Gateway: {sub.provider === "none" ? "nenhum (pagamento online pendente de integração)" : sub.provider}</p>
              <form action={changeTenantPlanAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="tenantId" value={t.id} />
                <label className="flex flex-col gap-1.5 text-sm font-medium">Trocar plano
                  <select name="planId" defaultValue={sub.planId} className="h-11 rounded-xl border border-paper-line-2 bg-white px-3">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </label>
                <SubmitButton variant="secondary" size="sm" pendingText="...">Aplicar</SubmitButton>
              </form>
              <div className="border-t border-paper-line pt-4"><ManualPaymentForm tenantId={t.id} suggested={sub.plan.priceCents != null ? centsToInput(sub.plan.priceCents) : ""} /></div>
              {sub.payments.length > 0 && (
                <ul className="flex flex-col divide-y divide-paper-line border-t border-paper-line pt-2 text-sm">
                  {sub.payments.map((p) => (
                    <li key={p.id} className="flex flex-col gap-0.5 py-2">
                      <span className="flex justify-between gap-2"><span>{fmtDateTime(p.paidAt ?? p.createdAt)} · {p.provider}</span><strong className="tabular-nums">{formatBRL(p.amountCents)}</strong></span>
                      {p.note && <span className="text-[13px] text-ink-muted">{p.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : <p className="text-[15px] text-ink-muted">Sem assinatura.</p>}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Situação da conta</h2>
            <p className="text-[15px] text-ink-muted">Suspenso ou cancelado, o cardápio sai do ar na hora. Os dados são mantidos.</p>
            <div className="flex flex-wrap gap-2">
              {t.status !== "ACTIVE" && <form action={setTenantStatusAction}><input type="hidden" name="tenantId" value={t.id} /><input type="hidden" name="status" value="ACTIVE" /><SubmitButton variant="dark" size="sm" pendingText="...">Ativar</SubmitButton></form>}
              {t.status !== "SUSPENDED" && <form action={setTenantStatusAction}><input type="hidden" name="tenantId" value={t.id} /><input type="hidden" name="status" value="SUSPENDED" /><ConfirmButton message={`Suspender ${t.name}? O cardápio sai do ar.`}>Suspender</ConfirmButton></form>}
              {t.status !== "CANCELED" && <form action={setTenantStatusAction}><input type="hidden" name="tenantId" value={t.id} /><input type="hidden" name="status" value="CANCELED" /><ConfirmButton message={`Cancelar a conta de ${t.name}? O dono perde o acesso ao painel.`}>Cancelar conta</ConfirmButton></form>}
            </div>
            <p className="text-[13px] text-ink-muted">Ativar sem registrar pagamento libera o cardápio, mas a assinatura continua como pendente.</p>
          </Card>
          {t.status === "CANCELED" && (
            <Card className="flex flex-col gap-4 !border-red-200"><h2 className="text-lg font-semibold">Excluir definitivamente</h2><DeleteTenantForm tenantId={t.id} slug={t.slug} /></Card>
          )}
          <Card className="flex flex-col gap-4"><h2 className="text-lg font-semibold">Dados básicos</h2><BasicsForm tenantId={t.id} name={t.name} slug={t.slug} /></Card>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Usuários</h2><Link href={`/master/usuarios?tenant=${t.id}`} className="text-sm font-semibold text-brasa-ink">Gerenciar</Link></div>
            <ul className="flex flex-col divide-y divide-paper-line text-[15px]">
              {t.users.map((u) => <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{u.name}<span className="block text-[13px] text-ink-muted">{u.email}</span></span><span className="flex gap-1.5"><Pill>{u.role === "OWNER" ? "Dono" : "Garçom"}</Pill>{!u.active && <Pill tone="red">Desativado</Pill>}</span></li>)}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Atividade recente</h2>
        {logs.length === 0 ? <p className="text-[15px] text-ink-muted">Sem registros.</p> : (
          <ul className="flex flex-col divide-y divide-paper-line text-sm">
            {logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-mono">{l.action}</span><span className="text-ink-muted">{l.actor?.email ?? "sistema"} · {fmtDateTime(l.createdAt)}</span></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
