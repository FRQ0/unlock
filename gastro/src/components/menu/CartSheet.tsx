"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MenuInfo } from "@/lib/menu";
import { formatBRL } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { placeOrderAction } from "@/app/[slug]/actions";
import { Sheet } from "./Sheet";
import { useCart } from "./cart";

type Mode = "DINE_IN" | "PICKUP" | "DELIVERY";
const MODE_LABEL: Record<Mode, string> = { DINE_IN: "Comer aqui", PICKUP: "Retirar", DELIVERY: "Entrega" };

const inputCls = "h-12 w-full border border-[var(--m-line)] bg-transparent px-4 text-[15px] focus:border-[var(--m-accent)] focus:outline-none";

export function CartSheet({ open, onClose, info, canOrder, closedReason }: { open: boolean; onClose: () => void; info: MenuInfo; canOrder: boolean; closedReason?: string | null }) {
  const cart = useCart();
  const router = useRouter();
  const modes = (["DINE_IN", "PICKUP", "DELIVERY"] as Mode[]).filter((m) => ({ DINE_IN: info.acceptsDineIn, PICKUP: info.acceptsPickup, DELIVERY: info.acceptsDelivery })[m]);
  const [mode, setMode] = useState<Mode>(modes[0] ?? "DINE_IN");
  const [form, setForm] = useState({ customerName: "", customerPhone: "", tableNumber: "", deliveryAddress: "", notes: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fee = mode === "DELIVERY" ? info.deliveryFeeCents : 0;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await placeOrderAction(info.slug, {
        mode, ...form, consent,
        lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds, notes: l.notes })),
      });
      if (!r.ok) return setError(r.error);
      cart.clear();
      onClose();
      router.push(`/${info.slug}/pedido/${r.token}`);
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label="Seu pedido">
      <form onSubmit={submit} className="flex flex-col gap-6 p-5 pt-6">
        <h2 className="pr-12 text-[22px] font-bold">Seu pedido</h2>
        {cart.lines.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--m-line)] p-6 text-center text-[var(--m-muted)]">Seu carrinho está vazio.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--m-line)]">
            {cart.lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-3">
                {l.imageUrl ? <img src={l.imageUrl} alt="" className="h-14 w-14 flex-none object-cover" style={{ borderRadius: "var(--m-radius-media)" }} /> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{l.name}</span>
                  {l.optionLabels.length > 0 && <span className="text-[13px] text-[var(--m-muted)]">{l.optionLabels.join(", ")}</span>}
                  {l.notes && <span className="text-[13px] italic text-[var(--m-muted)]">“{l.notes}”</span>}
                  <span className="mt-1 text-sm font-bold tabular-nums">{formatBRL(l.unitPriceCents * l.quantity)}</span>
                </div>
                <div className="flex h-10 items-center self-center rounded-full border border-[var(--m-line)]">
                  <button type="button" onClick={() => cart.setQty(l.key, l.quantity - 1)} aria-label={l.quantity === 1 ? `Remover ${l.name}` : `Diminuir ${l.name}`} className="flex h-10 w-10 items-center justify-center">{l.quantity === 1 ? <Icon name="trash" size={16} /> : <Icon name="minus" size={16} />}</button>
                  <span className="w-5 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                  <button type="button" onClick={() => cart.setQty(l.key, l.quantity + 1)} aria-label={`Aumentar ${l.name}`} className="flex h-10 w-10 items-center justify-center"><Icon name="plus" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {cart.lines.length > 0 && !canOrder && <p className="rounded-2xl bg-[var(--m-surface)] p-4 text-center text-sm text-[var(--m-muted)]">{closedReason ?? "Pedidos pelo cardápio estão desativados. Mostre esta lista ao atendente."}</p>}

        {cart.lines.length > 0 && canOrder && (
          <>
            {modes.length > 1 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-bold">Como você quer receber?</legend>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
                  {modes.map((m) => (
                    <label key={m} className={`flex h-12 cursor-pointer items-center justify-center border text-sm font-semibold ${mode === m ? "border-[var(--m-button)] bg-[var(--m-button)] text-[var(--m-on-button)]" : "border-[var(--m-line)]"}`} style={{ borderRadius: "var(--m-radius-button)" }}>
                      <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />{MODE_LABEL[m]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Seu nome</span><input required maxLength={60} autoComplete="name" value={form.customerName} onChange={set("customerName")} className={inputCls} style={{ borderRadius: "var(--m-radius-button)" }} /></label>
              {mode === "DINE_IN" && <label className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Número da mesa</span><input required maxLength={10} inputMode="numeric" value={form.tableNumber} onChange={set("tableNumber")} className={inputCls} style={{ borderRadius: "var(--m-radius-button)" }} /></label>}
              {mode !== "DINE_IN" && <label className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Telefone (WhatsApp)</span><input required maxLength={20} inputMode="tel" autoComplete="tel" value={form.customerPhone} onChange={set("customerPhone")} placeholder="(00) 00000-0000" className={inputCls} style={{ borderRadius: "var(--m-radius-button)" }} /></label>}
              {mode === "DELIVERY" && <label className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Endereço de entrega</span><textarea required maxLength={240} rows={2} autoComplete="street-address" value={form.deliveryAddress} onChange={set("deliveryAddress")} placeholder="Rua, número, bairro e complemento" className={`${inputCls} h-auto resize-none py-3`} style={{ borderRadius: "var(--m-radius-button)" }} /></label>}
              <label className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Observação do pedido <span className="font-normal text-[var(--m-muted)]">(opcional)</span></span><input maxLength={280} value={form.notes} onChange={set("notes")} placeholder="Ex.: troco para R$ 100" className={inputCls} style={{ borderRadius: "var(--m-radius-button)" }} /></label>
            </div>

            <dl className="flex flex-col gap-1.5 text-[15px]">
              <div className="flex justify-between"><dt className="text-[var(--m-muted)]">Subtotal</dt><dd className="tabular-nums">{formatBRL(cart.subtotalCents)}</dd></div>
              {mode === "DELIVERY" && <div className="flex justify-between"><dt className="text-[var(--m-muted)]">Taxa de entrega</dt><dd className="tabular-nums">{fee ? formatBRL(fee) : "Grátis"}</dd></div>}
              <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatBRL(cart.subtotalCents + fee)}</dd></div>
              {mode === "DELIVERY" && info.minOrderCents > 0 && cart.subtotalCents < info.minOrderCents && <p className="text-sm text-[#E5484D]">Pedido mínimo para entrega: {formatBRL(info.minOrderCents)}.</p>}
              <p className="text-[13px] text-[var(--m-muted)]">Pagamento combinado no local. O valor final é confirmado pelo estabelecimento.</p>
            </dl>

            <label className="flex items-start gap-3 text-[13px] leading-relaxed text-[var(--m-muted)]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none" style={{ accentColor: "var(--m-button)" }} />
              <span>Autorizo {info.name} a usar meu nome{mode !== "DINE_IN" ? ", telefone" : ""}{mode === "DELIVERY" ? " e endereço" : ""} apenas para preparar e entregar este pedido. <Link href="/privacidade" target="_blank" className="underline">Privacidade</Link></span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-[#E5484D]/10 p-3 text-sm font-medium text-[#E5484D]">{error}</p>}

            <button type="submit" disabled={pending || !consent} className="flex h-14 items-center justify-between gap-2 bg-[var(--m-button)] px-5 font-bold text-[var(--m-on-button)] disabled:opacity-50" style={{ borderRadius: "var(--m-radius-button)" }}>
              <span>{pending ? "Enviando..." : "Enviar pedido"}</span><span className="tabular-nums">{formatBRL(cart.subtotalCents + fee)}</span>
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
}
