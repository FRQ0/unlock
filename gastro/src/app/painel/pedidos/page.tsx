import type { Metadata } from "next";
import Link from "next/link";
import type { Order, OrderItem, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePanel } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { fmtDateTime, timeAgo } from "@/lib/dates";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/Feedback";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { setOrderStatusAction } from "./actions";
import { NewOrderAlert } from "./NewOrderAlert";

export const metadata: Metadata = { title: "Pedidos" };

const MODE: Record<string, string> = { DINE_IN: "Mesa", PICKUP: "Retirada", DELIVERY: "Entrega" };
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: "PREPARING", label: "Aceitar e preparar" },
  PREPARING: { status: "READY", label: "Marcar como pronto" },
  READY: { status: "COMPLETED", label: "Finalizar" },
};
const PAGE = 30;

type Full = Order & { items: OrderItem[] };

function OrderCard({ o }: { o: Full }) {
  const next = NEXT[o.status];
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-paper-line bg-white p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="label-mono text-ink-muted">#{String(o.number).padStart(4, "0")} · {MODE[o.mode]}{o.tableNumber ? ` ${o.tableNumber}` : ""}</span>
          <span className="font-semibold">{o.customerName}</span>
        </div>
        <span className="text-[13px] text-ink-muted" title={fmtDateTime(o.createdAt)}>{timeAgo(o.createdAt)}</span>
      </header>
      <ul className="flex flex-col gap-1.5 text-[15px]">
        {o.items.map((it) => {
          const opts = (it.options as { name: string }[]).map((x) => x.name);
          return (
            <li key={it.id}>
              <strong>{it.quantity}×</strong> {it.productName}
              {opts.length > 0 && <span className="block pl-6 text-[13px] text-ink-muted">{opts.join(", ")}</span>}
              {it.notes && <span className="block pl-6 text-[13px] font-medium text-[#9A2E0B]">Obs.: {it.notes}</span>}
            </li>
          );
        })}
      </ul>
      {o.notes && <p className="rounded-lg bg-[#FDF0C7] px-3 py-2 text-[13px] text-[#5C3F00]">Pedido: {o.notes}</p>}
      {o.mode !== "DINE_IN" && (
        <div className="flex flex-col gap-0.5 text-[13px] text-ink-muted">
          {o.customerPhone && <a href={`https://wa.me/55${o.customerPhone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brasa-ink underline">{o.customerPhone}</a>}
          {o.deliveryAddress && <span>{o.deliveryAddress}</span>}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-paper-line pt-3">
        <span className="font-bold tabular-nums">{formatBRL(o.totalCents)}</span>
        {(o.status === "COMPLETED" || o.status === "CANCELED") && <StatusBadge status={o.status} />}
      </div>
      {next && (
        <div className="flex gap-2">
          <form action={setOrderStatusAction} className="flex-1">
            <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={next.status} />
            <SubmitButton variant={o.status === "NEW" ? "dark" : "secondary"} className="w-full" pendingText="...">{next.label}</SubmitButton>
          </form>
          <form action={setOrderStatusAction}>
            <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="CANCELED" />
            <ConfirmButton size="md" message={`Cancelar o pedido #${o.number}?`}>Cancelar</ConfirmButton>
          </form>
        </div>
      )}
    </article>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ aba?: string; p?: string }> }) {
  const { tenant } = await requirePanel();
  const sp = await searchParams;
  const history = sp.aba === "historico";
  const page = Math.max(1, Number(sp.p) || 1);

  const tabs = (
    <nav className="flex gap-2" aria-label="Visualização">
      <Link href="/painel/pedidos" aria-current={!history ? "page" : undefined} className={`inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold ${!history ? "bg-grafite text-gelo" : "border border-paper-line-2"}`}>Agora</Link>
      <Link href="/painel/pedidos?aba=historico" aria-current={history ? "page" : undefined} className={`inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold ${history ? "bg-grafite text-gelo" : "border border-paper-line-2"}`}>Histórico</Link>
    </nav>
  );

  if (history) {
    const [orders, total] = await Promise.all([
      db.order.findMany({ where: { tenantId: tenant.id, status: { in: ["COMPLETED", "CANCELED"] } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { items: true } }),
      db.order.count({ where: { tenantId: tenant.id, status: { in: ["COMPLETED", "CANCELED"] } } }),
    ]);
    const pages = Math.max(1, Math.ceil(total / PAGE));
    return (
      <>
        <PageHeader kicker="Pedidos" title="Histórico" subtitle={`${total} pedidos finalizados ou cancelados.`} actions={tabs} />
        {orders.length === 0 ? <EmptyState icon="bag" title="Nenhum pedido no histórico" /> : (
          <div className="overflow-x-auto rounded-2xl border border-paper-line bg-white">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="border-b border-paper-line text-sm text-ink-muted">
                <tr><th className="px-4 py-3 font-medium">Pedido</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Itens</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-sm">#{String(o.number).padStart(4, "0")}</td>
                    <td className="px-4 py-3 text-sm">{fmtDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3">{o.customerName}<span className="block text-[13px] text-ink-muted">{MODE[o.mode]}{o.tableNumber ? ` ${o.tableNumber}` : ""}</span></td>
                    <td className="px-4 py-3 text-sm">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatBRL(o.totalCents)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="flex items-center justify-center gap-3" aria-label="Páginas">
            {page > 1 && <Link href={`/painel/pedidos?aba=historico&p=${page - 1}`} className="h-11 rounded-xl border border-paper-line-2 px-4 leading-[44px]">Anterior</Link>}
            <span className="text-sm text-ink-muted">Página {page} de {pages}</span>
            {page < pages && <Link href={`/painel/pedidos?aba=historico&p=${page + 1}`} className="h-11 rounded-xl border border-paper-line-2 px-4 leading-[44px]">Próxima</Link>}
          </nav>
        )}
      </>
    );
  }

  const active = await db.order.findMany({
    where: { tenantId: tenant.id, status: { in: ["NEW", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: { items: true },
    take: 200,
  });
  const cols: { status: OrderStatus; title: string }[] = [
    { status: "NEW", title: "Novos" }, { status: "PREPARING", title: "Em preparo" }, { status: "READY", title: "Prontos" },
  ];
  const newest = active.filter((o) => o.status === "NEW").at(-1);

  return (
    <>
      <AutoRefresh seconds={10} />
      <PageHeader kicker="Pedidos" title="Pedidos" subtitle="A tela se atualiza sozinha a cada 10 segundos." actions={<>{tabs}<NewOrderAlert newCount={active.filter((o) => o.status === "NEW").length} latestId={newest?.id ?? null} /></>} />
      {!tenant.acceptsOrders && <p className="rounded-xl border border-[#F1D98A] bg-[#FDF0C7] px-4 py-3 text-sm text-[#5C3F00]">O recebimento de pedidos pelo cardápio está desligado. Ligue em <Link href="/painel/configuracoes" className="font-semibold underline">Dados e horários</Link>.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => {
          const list = active.filter((o) => o.status === c.status);
          return (
            <section key={c.status} className="flex flex-col gap-3" aria-label={c.title}>
              <StatusBadge status={c.status} count={list.length} />
              {list.length === 0 ? <p className="rounded-2xl border border-dashed border-paper-line-2 p-5 text-center text-sm text-ink-muted">Nenhum pedido aqui.</p> : list.map((o) => <OrderCard key={o.id} o={o} />)}
            </section>
          );
        })}
      </div>
    </>
  );
}
