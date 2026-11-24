import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import { gateway } from "@/lib/payments";
import { parseFeatures } from "@/lib/plans";
import { Alert, Card, PageHeader, Pill } from "@/components/ui/Feedback";
import { SubmitButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { choosePlanAction } from "./actions";
import { CheckoutButton } from "./CheckoutButton";

export const metadata: Metadata = { title: "Assinatura" };

const SUB_STATUS = {
  PENDING: { label: "Aguardando pagamento", tone: "amber" },
  ACTIVE: { label: "Ativa", tone: "green" },
  PAST_DUE: { label: "Pagamento atrasado", tone: "red" },
  CANCELED: { label: "Cancelada", tone: "neutral" },
} as const;

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { tenant } = await requireOwnerPanel();
  const { bemvindo } = await searchParams;
  const [sub, plans] = await Promise.all([
    db.subscription.findUnique({ where: { tenantId: tenant.id }, include: { plan: true, payments: { orderBy: { createdAt: "desc" }, take: 24 } } }),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const gw = gateway();
  const whatsapp = process.env.NEXT_PUBLIC_UNLOCK_WHATSAPP?.replace(/\D/g, "");
  const st = sub ? SUB_STATUS[sub.status] : null;

  return (
    <>
      <PageHeader kicker="Assinatura" title="Assinatura" subtitle="Seu plano, situação do pagamento e histórico." />
      {bemvindo && <Alert tone="success">Conta criada! Agora é só montar o cardápio. Ele vai ao ar quando a assinatura for ativada.</Alert>}

      {sub && st && (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Plano atual</span>
              <span className="display text-[26px]">{sub.plan.name}</span>
              <span className="text-[15px] text-ink-muted">{sub.plan.priceCents != null ? `${formatBRL(sub.plan.priceCents)} por mês` : "Valor a combinar com a Unlock"}</span>
            </div>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
          {sub.currentPeriodEnd && sub.status === "ACTIVE" && <p className="text-[15px]">Pago até <strong>{fmtDate(sub.currentPeriodEnd)}</strong>.</p>}
          {sub.status === "PENDING" && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#F1D98A] bg-[#FDF0C7] p-4 text-[15px] text-[#5C3F00]">
              {gw ? (
                <p>Finalize o pagamento para colocar seu cardápio no ar.</p>
              ) : (
                <>
                  <p><strong>Pagamento online pendente de integração.</strong> Ainda não cobramos pelo site. A equipe Unlock vai combinar o pagamento com você (Pix ou boleto) e ativar sua conta. Nenhuma cobrança foi feita.</p>
                  {whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero ativar o Unlock Gastro de ${tenant.name} (${tenant.slug}).`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 self-start rounded-xl bg-grafite px-4 font-semibold text-gelo"><Icon name="whatsapp" size={18} />Falar com a Unlock</a>}
                </>
              )}
            </div>
          )}
          <CheckoutButton available={Boolean(gw) && sub.status !== "ACTIVE"} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {sub.plan.highlights.map((h) => <li key={h} className="flex items-start gap-2 text-[15px]"><Icon name="check" size={18} className="mt-0.5 text-[#3B5A00]" />{h}</li>)}
          </ul>
        </Card>
      )}

      {sub?.status === "PENDING" && plans.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Trocar de plano</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => {
              const f = parseFeatures(p.features);
              const current = p.id === sub.planId;
              return (
                <Card key={p.id} className={`flex flex-col gap-3 ${current ? "!border-brasa ring-2 ring-brasa/25" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2"><span className="text-lg font-semibold">{p.name}</span><span className="font-semibold">{p.priceCents != null ? `${formatBRL(p.priceCents)}/mês` : "Sob consulta"}</span></div>
                  {p.headline && <p className="text-[15px] text-ink-muted">{p.headline}</p>}
                  <div className="flex flex-wrap gap-1.5">{f.managedByUnlock && <Pill tone="brasa">Unlock faz tudo</Pill>}{f.videoFeed && <Pill>Feed de vídeos</Pill>}</div>
                  {current ? <Pill tone="green">Plano escolhido</Pill> : (
                    <form action={choosePlanAction}><input type="hidden" name="plan" value={p.code} /><SubmitButton variant="secondary" pendingText="...">Escolher {p.name}</SubmitButton></form>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Pagamentos</h2>
        {sub?.payments.length ? (
          <ul className="flex flex-col divide-y divide-paper-line">
            {sub.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[15px]">
                <span>{fmtDate(p.paidAt ?? p.createdAt)} · {p.provider === "manual" ? "Confirmado pela Unlock" : p.provider}</span>
                <span className="flex items-center gap-2"><strong className="tabular-nums">{formatBRL(p.amountCents)}</strong><Pill tone={p.status === "PAID" ? "green" : p.status === "PENDING" ? "amber" : "red"}>{p.status === "PAID" ? "Pago" : p.status === "PENDING" ? "Pendente" : p.status === "FAILED" ? "Falhou" : "Estornado"}</Pill></span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[15px] text-ink-muted">Nenhum pagamento registrado ainda.</p>}
      </Card>
    </>
  );
}
