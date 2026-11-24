"use client";
import { formatBRL } from "@/lib/money";
import { useCart } from "./cart";

export function CartBar({ onOpen, overlay }: { onOpen: () => void; overlay?: boolean }) {
  const { count, subtotalCents } = useCart();
  if (!count) return null;
  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${overlay ? "" : "bg-gradient-to-t from-[var(--m-bg)] via-[var(--m-bg)]/80 to-transparent pt-6"}`}>
      <button type="button" onClick={onOpen} className="pointer-events-auto flex h-[60px] w-full max-w-[536px] items-center justify-between gap-3 bg-[var(--m-button)] px-4 font-bold text-[var(--m-on-button)] shadow-xl" style={{ borderRadius: "calc(var(--m-radius-button) + 4px)" }}>
        <span className="flex items-center gap-3">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-black/20 px-1.5 text-sm tabular-nums">{count}</span>
          Ver pedido
        </span>
        <span className="tabular-nums">{formatBRL(subtotalCents)}</span>
      </button>
    </div>
  );
}
