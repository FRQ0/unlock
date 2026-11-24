"use client";
import { useEffect, useMemo, useState } from "react";
import type { MenuProduct } from "@/lib/menu";
import { formatBRL } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "./Sheet";
import { useCart } from "./cart";

export function trackView(productId: string) {
  try {
    const body = JSON.stringify({ productId });
    if (!navigator.sendBeacon?.("/api/views", new Blob([body], { type: "application/json" }))) {
      fetch("/api/views", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {}
}

export function ProductSheet({ product, onClose, canOrder, closedReason, onAdded }: { product: MenuProduct | null; onClose: () => void; canOrder: boolean; closedReason?: string | null; onAdded?: () => void }) {
  const cart = useCart();
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQty(1); setNotes(""); setTried(false);
    // Pré-seleciona a primeira opção disponível em grupos obrigatórios de escolha única.
    const init: Record<string, string[]> = {};
    for (const g of product.groups) {
      const first = g.options.find((o) => o.available);
      init[g.id] = g.type === "SINGLE" && g.required && first ? [first.id] : [];
    }
    setPicked(init);
    trackView(product.id);
  }, [product]);

  const { unit, errors, labels } = useMemo(() => {
    if (!product) return { unit: 0, errors: {} as Record<string, string>, labels: [] as string[] };
    let u = product.priceCents;
    const errs: Record<string, string> = {};
    const lbl: string[] = [];
    for (const g of product.groups) {
      const sel = picked[g.id] ?? [];
      const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
      if (sel.length < min) errs[g.id] = g.type === "SINGLE" ? "Escolha uma opção." : `Escolha pelo menos ${min}.`;
      for (const id of sel) {
        const o = g.options.find((x) => x.id === id);
        if (o) { u += o.priceDeltaCents; lbl.push(o.name); }
      }
    }
    return { unit: u, errors: errs, labels: lbl };
  }, [product, picked]);

  if (!product) return null;
  const valid = Object.keys(errors).length === 0;

  const toggle = (gid: string, oid: string, type: "SINGLE" | "MULTIPLE", max: number) =>
    setPicked((s) => {
      const cur = s[gid] ?? [];
      if (type === "SINGLE") return { ...s, [gid]: [oid] };
      if (cur.includes(oid)) return { ...s, [gid]: cur.filter((x) => x !== oid) };
      if (max > 0 && cur.length >= max) return s;
      return { ...s, [gid]: [...cur, oid] };
    });

  const submit = () => {
    setTried(true);
    if (!valid || !canOrder) return;
    cart.add({ productId: product.id, name: product.name, imageUrl: product.imageUrl, quantity: qty, optionIds: Object.values(picked).flat(), optionLabels: labels, unitPriceCents: unit, notes: notes.trim().slice(0, 280) });
    onAdded?.();
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      label={product.name}
      footer={
        canOrder ? (
          <div className="flex items-center gap-3">
            <div className="flex h-[52px] items-center rounded-full border border-[var(--m-line)]">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade" className="flex h-[52px] w-12 items-center justify-center"><Icon name="minus" /></button>
              <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Aumentar quantidade" className="flex h-[52px] w-12 items-center justify-center"><Icon name="plus" /></button>
            </div>
            <button type="button" onClick={submit} className="flex h-[52px] flex-1 items-center justify-between gap-2 bg-[var(--m-button)] px-5 font-bold text-[var(--m-on-button)]" style={{ borderRadius: "var(--m-radius-button)" }}>
              <span>Adicionar</span><span className="tabular-nums">{formatBRL(unit * qty)}</span>
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-[var(--m-muted)]">{closedReason ?? "Pedidos pelo cardápio estão desativados. Peça ao atendente."}</p>
        )
      }
    >
      <div className="aspect-[4/3] w-full bg-[var(--m-surface)]">
        {product.videoUrl ? (
          <video src={product.videoUrl} poster={product.imageUrl ?? undefined} className="h-full w-full object-cover" autoPlay muted loop playsInline />
        ) : product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--m-muted)]"><Icon name="cutlery" size={40} /></div>
        )}
      </div>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] font-bold leading-tight">{product.name}</h2>
          {product.description && <p className="text-[15px] leading-relaxed text-[var(--m-muted)]">{product.description}</p>}
          <p className="text-lg font-bold tabular-nums text-[var(--m-accent)]">{formatBRL(product.priceCents)}</p>
        </div>

        {product.groups.map((g) => {
          const sel = picked[g.id] ?? [];
          const max = g.type === "SINGLE" ? 1 : g.maxSelect;
          return (
            <fieldset key={g.id} className="flex flex-col gap-2">
              <legend className="mb-2 flex w-full items-center justify-between gap-2">
                <span className="font-bold">{g.name}</span>
                <span className="rounded-full bg-[var(--m-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--m-muted)]">
                  {g.required ? "Obrigatório" : "Opcional"}{g.type === "MULTIPLE" && max > 0 ? ` · até ${max}` : ""}
                </span>
              </legend>
              {g.options.map((o) => {
                const checked = sel.includes(o.id);
                const blocked = !o.available || (!checked && g.type === "MULTIPLE" && max > 0 && sel.length >= max);
                return (
                  <label key={o.id} className={`flex min-h-[52px] cursor-pointer items-center gap-3 border border-[var(--m-line)] px-4 ${checked ? "border-[var(--m-accent)]" : ""} ${blocked ? "opacity-45" : ""}`} style={{ borderRadius: "var(--m-radius-button)" }}>
                    <input type={g.type === "SINGLE" ? "radio" : "checkbox"} name={`g-${g.id}`} checked={checked} disabled={blocked} onChange={() => toggle(g.id, o.id, g.type, max)} className="h-5 w-5 flex-none" style={{ accentColor: "var(--m-button)" }} />
                    <span className="flex-1">{o.name}{!o.available && " (esgotado)"}</span>
                    {o.priceDeltaCents !== 0 && <span className="text-sm tabular-nums text-[var(--m-muted)]">{o.priceDeltaCents > 0 ? "+ " : "− "}{formatBRL(Math.abs(o.priceDeltaCents))}</span>}
                  </label>
                );
              })}
              {tried && errors[g.id] && <span role="alert" className="text-sm font-medium text-[#E5484D]">{errors[g.id]}</span>}
            </fieldset>
          );
        })}

        {canOrder && (
          <label className="flex flex-col gap-2">
            <span className="font-bold">Observações</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} rows={2} placeholder="Ex.: sem cebola, molho à parte" className="w-full resize-none border border-[var(--m-line)] bg-transparent px-4 py-3 text-[15px] focus:border-[var(--m-accent)] focus:outline-none" style={{ borderRadius: "var(--m-radius-button)" }} />
          </label>
        )}
      </div>
    </Sheet>
  );
}
