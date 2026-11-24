"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/** Gaveta de baixo para cima (celular) / modal central (desktop). Fecha com Esc e clique fora. */
export function Sheet({ open, onClose, label, children, footer }: { open: boolean; onClose: () => void; label: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Fechar" tabIndex={-1} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="relative flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden bg-[var(--m-bg)] text-[var(--m-ink)] shadow-2xl outline-none sm:rounded-[28px]" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"><Icon name="close" /></button>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-[var(--m-line)] bg-[var(--m-bg)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
