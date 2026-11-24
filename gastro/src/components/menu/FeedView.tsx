"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuData, MenuProduct } from "@/lib/menu";
import { Icon } from "@/components/ui/Icon";
import { CartProvider, useCart } from "./cart";
import { MenuShell, PriceTag, fromPrice } from "./MenuView";
import { ProductSheet, trackView } from "./ProductSheet";
import { CartSheet } from "./CartSheet";
import { orderingState } from "./MenuApp";

type Item = MenuProduct & { categoryName: string | null };

export function FeedApp({ data, items, startId }: { data: MenuData; items: Item[]; startId?: string }) {
  return (
    <CartProvider slug={data.info.slug}>
      <MenuShell data={data}>
        <Feed data={data} items={items} startId={startId} />
      </MenuShell>
    </CartProvider>
  );
}

function Feed({ data, items, startId }: { data: MenuData; items: Item[]; startId?: string }) {
  const cart = useCart();
  const { canOrder, reason } = orderingState(data.info);
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [sheet, setSheet] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  // Começa no produto pedido pelo link (?p=)
  useEffect(() => {
    const i = startId ? items.findIndex((x) => x.id === startId) : -1;
    if (i > 0) scroller.current?.children[i]?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    const t = setTimeout(() => setHint(false), 3500);
    return () => clearTimeout(t);
  }, [startId, items]);

  // Descobre qual vídeo está na tela
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: [0.6] },
    );
    Array.from(root.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length]);

  // Toca só o vídeo visível; pausa os outros
  useEffect(() => {
    setPaused(false);
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) { v.currentTime = 0; v.play().catch(() => setPaused(true)); }
      else v.pause();
    });
    if (active > 0) setHint(false);
    const id = items[active]?.id;
    const t = id ? setTimeout(() => trackView(id), 1500) : null;
    return () => { if (t) clearTimeout(t); };
  }, [active, items]);

  useEffect(() => { videos.current.forEach((v) => { if (v) v.muted = muted; }); }, [muted]);

  const togglePlay = () => {
    const v = videos.current[active];
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  const go = useCallback((d: number) => {
    const root = scroller.current;
    const next = Math.max(0, Math.min(items.length - 1, active + d));
    root?.children[next]?.scrollIntoView({ behavior: "smooth" });
  }, [active, items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || cartOpen) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const quickAdd = (p: Item) => {
    if (!canOrder) return setSheet(p);
    if (p.groups.length) return setSheet(p);
    cart.add({ productId: p.id, name: p.name, imageUrl: p.imageUrl, quantity: 1, optionIds: [], optionLabels: [], unitPriceCents: fromPrice(p).cents, notes: "" });
    setToast(`${p.name} adicionado`);
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain" aria-label="Feed de vídeos dos produtos">
        {items.map((p, i) => (
          <section key={p.id} data-index={i} className="relative flex h-dvh w-full snap-start snap-always items-center justify-center" aria-roledescription="vídeo" aria-label={p.name}>
            <video
              ref={(el) => { videos.current[i] = el; }}
              src={p.videoUrl!}
              poster={p.imageUrl ?? undefined}
              className="absolute inset-0 h-full w-full object-cover sm:mx-auto sm:max-w-[480px]"
              loop muted playsInline
              preload={Math.abs(i - active) <= 1 ? "auto" : "metadata"}
              onClick={togglePlay}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[480px] flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <span className="label-mono self-start rounded-full bg-white/15 px-3 py-1.5 !text-[11px] backdrop-blur">{p.featured ? "Destaque da casa" : p.categoryName ?? "Cardápio"}</span>
              <h2 className="display text-[28px] leading-[1.02] [text-shadow:0_2px_12px_rgba(0,0,0,.4)]">{p.name}</h2>
              {p.description && <p className="line-clamp-2 text-[15px] leading-snug text-white/85">{p.description}</p>}
              <PriceTag p={p} className="text-xl font-bold" />
              <div className="flex gap-2.5">
                <button type="button" onClick={() => quickAdd(p)} className="flex h-[54px] flex-1 items-center justify-center gap-2 bg-[var(--m-button)] font-bold text-[var(--m-on-button)]" style={{ borderRadius: "var(--m-radius-button)" }}>
                  <Icon name="plus" />{canOrder ? "Adicionar ao pedido" : "Ver produto"}
                </button>
                <button type="button" onClick={() => setSheet(p)} className="flex h-[54px] items-center justify-center border border-white/35 bg-black/30 px-5 font-semibold backdrop-blur" style={{ borderRadius: "var(--m-radius-button)" }}>
                  Detalhes
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Barra superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-[480px] items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href={`/${data.info.slug}`} aria-label="Voltar ao cardápio" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 backdrop-blur"><Icon name="back" /></Link>
        <span className="flex flex-col items-center">
          <span className="text-[15px] font-bold">{data.info.name}</span>
          <span className="label-mono !text-[10px] text-white/70">{active + 1} / {items.length}</span>
        </span>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Ativar som" : "Desativar som"} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 backdrop-blur"><Icon name={muted ? "mute" : "sound"} /></button>
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Ver pedido (${cart.count} itens)`} className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 backdrop-blur">
            <Icon name="bag" />
            {cart.count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--m-button)] px-1 text-[11px] font-bold text-[var(--m-on-button)]">{cart.count}</span>}
          </button>
        </div>
      </div>

      {/* Navegação lateral (desktop e acessibilidade) */}
      <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button type="button" onClick={() => go(-1)} disabled={active === 0} aria-label="Vídeo anterior" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur disabled:opacity-30"><Icon name="chevronUp" /></button>
        <button type="button" onClick={() => go(1)} disabled={active === items.length - 1} aria-label="Próximo vídeo" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur disabled:opacity-30"><Icon name="chevronDown" /></button>
      </div>

      {paused && (
        <button type="button" onClick={togglePlay} aria-label="Continuar vídeo" className="absolute left-1/2 top-[42%] flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 backdrop-blur">
          <Icon name="play" size={32} />
        </button>
      )}
      {hint && items.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-[30%] flex animate-bounce flex-col items-center gap-1 text-sm font-semibold text-white/90">
          <Icon name="chevronUp" size={28} />Deslize para o próximo prato
        </div>
      )}
      {toast && <div role="status" className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg">{toast}</div>}

      <ProductSheet product={sheet} onClose={() => setSheet(null)} canOrder={canOrder} closedReason={reason} onAdded={() => { setToast("Adicionado ao pedido"); setTimeout(() => setToast(null), 1800); }} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} info={data.info} canOrder={canOrder} closedReason={reason} />
    </div>
  );
}
