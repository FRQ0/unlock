import type { Metadata } from "next";
import type { Order, OrderItem } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePanel } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { timeAgo } from "@/lib/dates";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Alert, Card, PageHeader, StatusBadge } from "@/components/ui/Feedback";
import { SubmitButton } from "@/components/ui/Button";
import { setOrderStatusAction } from "../pedidos/actions";
import { NewOrderAlert } from "../pedidos/NewOrderAlert";
import { TableOrder } from "./TableOrder";

export const metadata: Metadata = { title: "Garçom" };

type Full = Order & { items: OrderItem[] };
const where = (o: Full) => (o.mode === "DINE_IN" ? `Mesa ${o.tableNumber}` : o.mode === "PICKUP" ? "Retirada" : "Entrega");

function Items({ o }: { o: Full }) {
  return (
    <ul className="flex flex-col gap-1 text-[15px]">
      {o.items.map((it) => {
        const opts = (it.options as { name: string }[]).map((x) => x.name);
        return <li key={it.id}><strong>{it.quantity}×</strong> {it.productName}{opts.length > 0 && <span className="text-[13px] text-ink-muted"> · {opts.join(", ")}</span>}</li>;
      })}
    </ul>
  );
}

export default async function WaiterPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { tenant } = await requirePanel();
  const { enviado } = await searchParams;
  const active = await db.order.findMany({
    where: { tenantId: tenant.id, status: { in: ["NEW", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: { items: true },
    take: 200,
  });
  const ready = active.filter((o) => o.status === "READY");
  const tables = new Map<string, Full[]>();
  for (const o of active.filter((o) => o.mode === "DINE_IN" && o.status !== "READY")) {
    const k = o.tableNumber ?? "?";
    tables.set(k, [...(tables.get(k) ?? []), o]);
  }
  const live = tenant.status === "ACTIVE" && tenant.published && tenant.acceptsOrders;

  return (
    <>
      <AutoRefresh seconds={10} />
      <PageHeader
        kicker="Garçom"
        title="Garçom"
        subtitle="Pedidos prontos para servir e mesas em andamento. Atualiza sozinho."
        actions={<NewOrderAlert newCount={ready.length} latestId={ready.at(-1)?.id ?? null} title="Prontos para servir" idleTitle="Garçom" storageKey="ug_waiter_sound" offLabel="Avisar quando ficar pronto" />}
      />

      {enviado && <Alert tone="success">Pedido enviado para a cozinha.</Alert>}
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Fazer pedido para uma mesa</h2>
        <TableOrder slug={tenant.slug} disabled={!live} />
        <p className="text-[13px] text-ink-muted">{live ? "Abre o cardápio com a mesa já preenchida. O pedido cai na cozinha como qualquer outro." : "O cardápio precisa estar publicado e recebendo pedidos."}</p>
      </Card>

      <section className="flex flex-col gap-3" aria-label="Prontos para servir">
        <StatusBadge status="READY" count={ready.length} />
        {ready.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-paper-line-2 p-5 text-center text-sm text-ink-muted">Nada pronto agora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ready.map((o) => (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl border-2 border-[#C9E68A] bg-white p-4">
                <header className="flex items-baseline justify-between gap-2">
                  <span className="display text-[26px]">{where(o)}</span>
                  <span className="text-[13px] text-ink-muted">#{String(o.number).padStart(4, "0")} · {timeAgo(o.createdAt)}</span>
                </header>
                <span className="text-sm text-ink-muted">{o.customerName}</span>
                <Items o={o} />
                <form action={setOrderStatusAction}>
                  <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="COMPLETED" />
                  <SubmitButton variant="dark" size="lg" className="w-full" pendingText="...">{o.mode === "DINE_IN" ? "Servido" : "Entregue"}</SubmitButton>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Mesas em andamento">
        <h2 className="text-lg font-semibold">Mesas em andamento</h2>
        {tables.size === 0 ? (
          <p className="rounded-2xl border border-dashed border-paper-line-2 p-5 text-center text-sm text-ink-muted">Nenhuma mesa com pedido em andamento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...tables.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true })).map(([table, list]) => (
              <article key={table} className="flex flex-col gap-3 rounded-2xl border border-paper-line bg-white p-4">
                <header className="flex items-center justify-between gap-2">
                  <span className="display text-[22px]">Mesa {table}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(list.reduce((s, o) => s + o.totalCents, 0))}</span>
                </header>
                {list.map((o) => (
                  <div key={o.id} className="flex flex-col gap-2 border-t border-paper-line pt-2">
                    <div className="flex items-center justify-between gap-2"><StatusBadge status={o.status} /><span className="text-[13px] text-ink-muted">{timeAgo(o.createdAt)}</span></div>
                    <Items o={o} />
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
