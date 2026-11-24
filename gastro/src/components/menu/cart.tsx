"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  optionIds: string[];
  optionLabels: string[];
  /** Só para exibição. O preço válido é recalculado no servidor. */
  unitPriceCents: number;
  notes: string;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const storageKey = `ug_cart_${slug}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.productId === "string").slice(0, 60));
      }
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(storageKey, JSON.stringify(lines)); } catch {}
  }, [lines, loaded, storageKey]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    setLines((ls) => {
      const sig = `${line.productId}|${[...line.optionIds].sort().join(",")}|${line.notes.trim()}`;
      const existing = ls.find((l) => `${l.productId}|${[...l.optionIds].sort().join(",")}|${l.notes.trim()}` === sig);
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l));
      return [...ls, { ...line, key: Math.random().toString(36).slice(2) }];
    });
  }, []);
  const setQty = useCallback((key: string, qty: number) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l)))), []);
  const remove = useCallback((key: string) => setLines((ls) => ls.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines, add, setQty, remove, clear,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotalCents: lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0),
    }),
    [lines, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}
