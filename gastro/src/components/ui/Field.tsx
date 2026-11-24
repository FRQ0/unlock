import type { ComponentProps, ReactNode } from "react";

const inputBase =
  "w-full rounded-xl border border-paper-line-2 bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-muted/70 focus:border-brasa focus:outline-none focus:ring-2 focus:ring-brasa/25 disabled:bg-gelo";

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; className?: string };

export function Field({ label, hint, error, className = "", ...props }: Common & ComponentProps<"input">) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <input className={`${inputBase} h-12`} aria-invalid={error ? true : undefined} {...props} />
      {error ? <span className="text-sm text-red-700">{error}</span> : hint ? <span className="text-[13px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, hint, error, className = "", ...props }: Common & ComponentProps<"textarea">) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <textarea className={`${inputBase} min-h-24 py-3`} aria-invalid={error ? true : undefined} {...props} />
      {error ? <span className="text-sm text-red-700">{error}</span> : hint ? <span className="text-[13px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Select({ label, hint, error, className = "", children, ...props }: Common & ComponentProps<"select">) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <select className={`${inputBase} h-12`} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
      {error ? <span className="text-sm text-red-700">{error}</span> : hint ? <span className="text-[13px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

/** Interruptor liga/desliga acessível (é um checkbox de verdade). */
export function Toggle({ label, hint, className = "", ...props }: { label: ReactNode; hint?: ReactNode; className?: string } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-paper-line bg-white px-4 py-3 ${className}`}>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium text-ink">{label}</span>
        {hint && <span className="text-[13px] text-ink-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex h-7 w-12 flex-none">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="absolute inset-0 rounded-full bg-paper-line-2 transition-colors peer-checked:bg-[#7DB100] peer-focus-visible:ring-2 peer-focus-visible:ring-brasa" />
        <span className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
