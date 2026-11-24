import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { MenuData, MenuProduct } from "@/lib/menu";
import { formatBRL } from "@/lib/money";
import { themeVars } from "@/lib/theme";
import { WEEKDAYS } from "@/lib/hours";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";

/** Menor preço possível considerando escolhas obrigatórias. */
export function fromPrice(p: MenuProduct): { cents: number; from: boolean } {
  let cents = p.priceCents;
  let from = false;
  for (const g of p.groups) {
    const prices = g.options.filter((o) => o.available).map((o) => o.priceDeltaCents);
    if (!prices.length) continue;
    if (!g.required) continue; // adicionais opcionais não mudam o preço inicial
    if (new Set(prices).size > 1) from = true;
    cents += Math.min(...prices);
  }
  return { cents, from };
}

export function PriceTag({ p, className = "" }: { p: MenuProduct; className?: string }) {
  const { cents, from } = fromPrice(p);
  return (
    <span className={`tabular-nums ${className}`}>
      {from && <span className="mr-1 text-[12px] font-medium opacity-70">a partir de</span>}
      {formatBRL(cents)}
    </span>
  );
}

export function MenuShell({ data, children, className = "" }: { data: Pick<MenuData, "theme">; children: ReactNode; className?: string }) {
  return (
    <div style={themeVars(data.theme) as CSSProperties} className={`bg-[var(--m-bg)] text-[var(--m-ink)] ${className}`}>
      {children}
    </div>
  );
}

function MediaThumb({ p, className }: { p: MenuProduct; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--m-surface)] ${className}`} style={{ borderRadius: "var(--m-radius-media)" }}>
      {p.imageUrl ? (
        <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--m-muted)]"><Icon name="cutlery" size={26} /></div>
      )}
      {p.videoUrl && (
        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white" aria-label="Tem vídeo" role="img">
          <Icon name="play" size={11} />
        </span>
      )}
    </div>
  );
}

type ViewProps = {
  data: MenuData;
  onOpenProduct?: (p: MenuProduct) => void;
  onQuickAdd?: (p: MenuProduct) => void;
  preview?: boolean;
  feedHref?: string;
};

export function MenuView({ data, onOpenProduct, onQuickAdd, preview, feedHref }: ViewProps) {
  const { info, categories, featured } = data;
  const open = (p: MenuProduct) => onOpenProduct?.(p);
  const showFeed = data.videoFeed && data.videoCount > 0;
  const wa = info.whatsapp?.replace(/\D/g, "");

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col pb-32">
      <div className="relative h-48 w-full overflow-hidden bg-[var(--m-secondary)] sm:h-56">
        {info.coverUrl ? (
          <img src={info.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "radial-gradient(circle at 70% 30%, var(--m-primary), var(--m-secondary) 70%)", opacity: 0.85 }} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--m-bg)] to-transparent" />
      </div>

      <header className="relative -mt-12 flex flex-col gap-4 px-5">
        <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden border-4 border-[var(--m-bg)] bg-[var(--m-primary)]" style={{ borderRadius: "calc(var(--m-radius-card) + 4px)" }}>
          {info.logoUrl ? <img src={info.logoUrl} alt={`Logotipo ${info.name}`} className="h-full w-full object-cover" /> : <span className="display text-[26px] text-[var(--m-on-button)]">{info.name.slice(0, 2)}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="display text-[26px] leading-[1.05]">{info.name}</h1>
          {info.tagline && <p className="text-[15px] text-[var(--m-muted)]">{info.tagline}</p>}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--m-muted)]">
            {info.openNow != null && (
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${info.openNow ? "bg-[#7DB100]" : "bg-[#D93A48]"}`} />
                <strong className="font-semibold text-[var(--m-ink)]">{info.openNow ? "Aberto agora" : "Fechado agora"}</strong>
              </span>
            )}
            {info.todayHours && <span>· {info.todayHours}</span>}
          </p>
        </div>

        <div className={`grid gap-2.5 ${showFeed ? "grid-cols-2" : "grid-cols-1"}`}>
          {showFeed && (
            <Link href={preview ? "#" : feedHref ?? `/${info.slug}/feed`} aria-disabled={preview} tabIndex={preview ? -1 : undefined}
              className="flex h-[52px] items-center justify-center gap-2 bg-[var(--m-button)] font-bold text-[var(--m-on-button)]" style={{ borderRadius: "var(--m-radius-button)" }}>
              <Icon name="video" />Ver em vídeo
            </Link>
          )}
          <a href="#cardapio" className="flex h-[52px] items-center justify-center gap-2 border border-[var(--m-line)] font-semibold" style={{ borderRadius: "var(--m-radius-button)" }}>
            <Icon name="list" />{info.menuName || "Cardápio"}
          </a>
        </div>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Categorias" className="no-scrollbar sticky top-0 z-10 mt-5 flex gap-2 overflow-x-auto bg-[var(--m-bg)] px-5 py-3">
          {featured.length > 0 && <a href="#destaques" className="flex h-10 flex-none items-center rounded-full bg-[var(--m-ink)] px-4 text-sm font-semibold text-[var(--m-bg)]">Destaques</a>}
          {categories.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`} className="flex h-10 flex-none items-center rounded-full border border-[var(--m-line)] px-4 text-sm">{c.name}</a>
          ))}
        </nav>
      )}

      {featured.length > 0 && (
        <section id="destaques" className="mt-3 flex scroll-mt-16 flex-col gap-3">
          <h2 className="label-mono px-5 text-[var(--m-accent)]">{"// Destaques da casa"}</h2>
          <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pb-1">
            {featured.map((p) => (
              <button key={p.id} type="button" onClick={() => open(p)} className="flex w-[220px] flex-none snap-start flex-col overflow-hidden bg-[var(--m-surface)] text-left" style={{ borderRadius: "var(--m-radius-card)" }}>
                <MediaThumb p={p} className="aspect-[4/3] w-full !rounded-none" />
                <span className="flex flex-col gap-1 p-3.5">
                  <span className="line-clamp-1 font-semibold">{p.name}</span>
                  <PriceTag p={p} className="text-[15px] font-bold" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div id="cardapio" className="flex scroll-mt-16 flex-col">
        {categories.length === 0 && (
          <p className="mx-5 mt-8 rounded-2xl border border-dashed border-[var(--m-line)] p-6 text-center text-[15px] text-[var(--m-muted)]">
            {preview ? "Seus produtos aparecem aqui assim que você cadastrar." : "O cardápio está sendo preparado. Volte em breve!"}
          </p>
        )}
        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="mt-7 flex scroll-mt-16 flex-col gap-3 px-5">
            <h2 className="text-lg font-bold">{c.name}</h2>
            <ul className="flex flex-col gap-3">
              {c.products.map((p) => (
                <li key={p.id} className="flex gap-3.5 bg-[var(--m-surface)] p-2.5" style={{ borderRadius: "var(--m-radius-card)" }}>
                  <button type="button" onClick={() => open(p)} className="flex min-w-0 flex-1 gap-3.5 text-left">
                    <MediaThumb p={p} className="h-24 w-24 flex-none" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                      <span className="font-semibold leading-snug">{p.name}</span>
                      {p.description && <span className="line-clamp-2 text-[13px] leading-snug text-[var(--m-muted)]">{p.description}</span>}
                      <PriceTag p={p} className="mt-auto text-[15px] font-bold" />
                    </span>
                  </button>
                  {info.acceptsOrders && (
                    <button type="button" onClick={() => (onQuickAdd ?? open)(p)} aria-label={`Adicionar ${p.name}`}
                      className="flex h-11 w-11 flex-none items-center justify-center self-end bg-[var(--m-button)] text-[var(--m-on-button)]" style={{ borderRadius: "var(--m-radius-button)" }}>
                      <Icon name="plus" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {(info.description || info.address || info.hours || wa || info.phone || info.instagram) && (
      <section className="mx-5 mt-10 flex flex-col gap-4 border-t border-[var(--m-line)] pt-6 text-[14px]">
        <h2 className="text-base font-bold">Sobre {info.name}</h2>
        {info.description && <p className="leading-relaxed text-[var(--m-muted)]">{info.description}</p>}
        {info.address && <p className="flex items-start gap-2 text-[var(--m-muted)]"><Icon name="pin" size={18} />{info.address}</p>}
        {info.hours && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[var(--m-muted)]">
            {WEEKDAYS.map((d) => (
              <div key={d.key} className="contents">
                <dt>{d.label}</dt>
                <dd className="text-right tabular-nums">{info.hours![d.key].closed ? "Fechado" : `${info.hours![d.key].open} – ${info.hours![d.key].close}`}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          {wa && <a href={`https://wa.me/${wa.length <= 11 ? "55" + wa : wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--m-line)] px-4"><Icon name="whatsapp" size={18} />WhatsApp</a>}
          {info.phone && <a href={`tel:${info.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--m-line)] px-4"><Icon name="phone" size={18} />Ligar</a>}
          {info.instagram && <a href={`https://instagram.com/${info.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--m-line)] px-4">@{info.instagram.replace(/^@/, "")}</a>}
        </div>
      </section>
      )}

      <footer className="mt-10 flex flex-col items-center gap-2 px-5 text-[12px] text-[var(--m-muted)]">
        <Link href="/" className="inline-flex items-center gap-1.5">Feito com <LogoMark tone={data.theme.appearance === "DARK" ? "light" : "dark"} size={14} /> <strong className="font-semibold">Unlock Gastro</strong></Link>
        <Link href="/privacidade" className="underline">Privacidade</Link>
      </footer>
    </div>
  );
}
