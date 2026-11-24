"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

export function PanelNav({ items, tenantName, published, userName }: { items: NavItem[]; tenantName: string; published: boolean | null; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/painel" || href === "/master" ? pathname === href : pathname.startsWith(href));

  const list = (
    <nav aria-label="Menu do painel" className="flex flex-col gap-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={isActive(it.href) ? "page" : undefined}
          className={`flex min-h-[46px] items-center gap-3 rounded-xl px-3.5 text-[15px] transition-colors ${isActive(it.href) ? "bg-line font-semibold text-gelo" : "text-[#C9CED6] hover:bg-carvao hover:text-gelo"}`}
        >
          <Icon name={it.icon} />
          {it.label}
          {it.badge ? <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brasa px-1.5 text-xs font-bold text-grafite">{it.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {published !== null && (
        <div className="flex items-center gap-2.5 px-1 text-[13px] text-muted">
          <span className={`h-2 w-2 rounded-full ${published ? "bg-limao" : "bg-line-2"}`} />
          {published ? "Cardápio publicado" : "Cardápio não publicado"}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="min-w-0 truncate text-[13px] text-muted">{userName}</span>
        <form action="/sair" method="post">
          <button type="submit" className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-[13px] text-[#C9CED6] hover:bg-carvao"><Icon name="logout" size={18} />Sair</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-grafite px-4 lg:hidden print:hidden">
        <Logo size={26} />
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} className="flex h-11 w-11 items-center justify-center rounded-xl text-gelo hover:bg-carvao">
          <Icon name="menu" size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col gap-6 overflow-y-auto bg-grafite p-5">
            <div className="flex items-center justify-between">
              <Logo size={26} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-gelo hover:bg-carvao"><Icon name="close" /></button>
            </div>
            <p className="truncate px-1 text-sm font-semibold text-gelo">{tenantName}</p>
            {list}
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-[264px] flex-none flex-col gap-6 overflow-y-auto bg-grafite px-4 py-7 lg:flex print:!hidden">
        <div className="px-2"><Logo size={28} /></div>
        <p className="truncate px-3 text-sm font-semibold text-gelo" title={tenantName}>{tenantName}</p>
        {list}
        <div className="mt-auto">{footer}</div>
      </aside>
    </>
  );
}
