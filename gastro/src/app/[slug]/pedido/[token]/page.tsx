import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { fmtTime } from "@/lib/dates";
import { themeVars } from "@/lib/theme";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acompanhe seu pedido", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#0D0F12" };

const STEPS = [
  { key: "NEW", label: "Recebido", text: "O estabelecimento recebeu seu pedido." },
  { key: "PREPARING", label: "Em preparo", text: "Seu pedido está sendo preparado." },
  { key: "READY", label: "Pronto", text: "Seu pedido está pronto!" },
  { key: "COMPLETED", label: "Finalizado", text: "Pedido entregue. Bom apetite!" },
] as const;

export default async function OrderStatusPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const order = await db.order.findUnique({ where: { publicToken: token }, include: { items: true, tenant: true } });
  if (!order || order.tenant.slug !== slug) notFound();
  const t = order.tenant;
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const canceled = order.status === "CANCELED";
  const readyText = order.mode === "DELIVERY" ? "Seu pedido saiu ou vai sair para entrega." : order.mode === "PICKUP" ? "Pode retirar no balcão!" : "Já vai chegar na sua mesa.";

  return (
    <div style={themeVars(t) as CSSProperties} className="min-h-dvh bg-[var(--m-bg)] text-[var(--m-ink)]">
      {!canceled && order.status !== "COMPLETED" && <AutoRefresh seconds={8} />}
      <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-5 py-8">
        <Link href={`/${t.slug}`} className="inline-flex items-center gap-2 self-start text-sm font-semibold"><Icon name="back" size={18} />Voltar ao cardápio</Link>
        <div className="flex flex-col gap-2">
          <span className="label-mono text-[var(--m-accent)]">{`// Pedido #${String(order.number).padStart(4, "0")}`}</span>
          <h1 className="display text-[28px] leading-tight">{canceled ? "Pedido cancelado" : STEPS[idx]?.label ?? "Recebido"}</h1>
          <p className="text-[15px] text-[var(--m-muted)]">{canceled ? "O estabelecimento cancelou este pedido. Fale com o atendente." : order.status === "READY" ? readyText : STEPS[idx]?.text}</p>
        </div>

        {!canceled && (
          <ol className="flex flex-col gap-0" aria-label="Andamento do pedido">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 py-2" aria-current={i === idx ? "step" : undefined}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${i <= idx ? "border-[var(--m-button)] bg-[var(--m-button)] text-[var(--m-on-button)]" : "border-[var(--m-line)] text-[var(--m-muted)]"}`}>
                  {i < idx ? <Icon name="check" size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                </span>
                <span className={i <= idx ? "font-semibold" : "text-[var(--m-muted)]"}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <section className="flex flex-col gap-3 bg-[var(--m-surface)] p-5" style={{ borderRadius: "var(--m-radius-card)" }}>
          <h2 className="font-bold">{t.name}</h2>
          <ul className="flex flex-col gap-2 text-[15px]">
            {order.items.map((it) => {
              const opts = (it.options as { name: string }[]).map((o) => o.name);
              return (
                <li key={it.id} className="flex justify-between gap-3">
                  <span><strong>{it.quantity}×</strong> {it.productName}{opts.length > 0 && <span className="block text-[13px] text-[var(--m-muted)]">{opts.join(", ")}</span>}{it.notes && <span className="block text-[13px] italic text-[var(--m-muted)]">“{it.notes}”</span>}</span>
                  <span className="tabular-nums">{formatBRL(it.totalCents)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-[var(--m-line)] pt-3 text-[15px]">
            {order.deliveryFeeCents > 0 && <div className="flex justify-between"><dt className="text-[var(--m-muted)]">Entrega</dt><dd className="tabular-nums">{formatBRL(order.deliveryFeeCents)}</dd></div>}
            <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatBRL(order.totalCents)}</dd></div>
          </dl>
          <p className="text-[13px] text-[var(--m-muted)]">
            {order.mode === "DINE_IN" ? `Mesa ${order.tableNumber}` : order.mode === "PICKUP" ? "Retirada no balcão" : "Entrega"} · feito às {fmtTime(order.createdAt)} · pagamento no local
          </p>
        </section>
        <p className="text-center text-[13px] text-[var(--m-muted)]">Guarde este link para acompanhar o pedido. Esta página se atualiza sozinha.</p>
      </main>
    </div>
  );
}
