"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** O garçom digita a mesa e abre o cardápio já com a mesa preenchida. */
export function TableOrder({ slug, disabled }: { slug: string; disabled?: boolean }) {
  const router = useRouter();
  const [table, setTable] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (table.trim()) router.push(`/${slug}?mesa=${encodeURIComponent(table.trim())}&garcom=1`); }}
      className="flex gap-2"
    >
      <label htmlFor="mesa" className="sr-only">Número da mesa</label>
      <input id="mesa" value={table} onChange={(e) => setTable(e.target.value.slice(0, 10))} inputMode="numeric" placeholder="Mesa nº" disabled={disabled} className="h-14 w-32 rounded-2xl border border-paper-line-2 bg-white px-4 text-lg font-semibold focus:border-brasa focus:outline-none" />
      <button type="submit" disabled={disabled || !table.trim()} className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brasa px-5 text-base font-semibold text-grafite disabled:opacity-50">
        <Icon name="plus" />Fazer pedido
      </button>
    </form>
  );
}
