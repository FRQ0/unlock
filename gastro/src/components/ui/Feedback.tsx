import type { ReactNode } from "react";
import type { OrderStatus } from "@prisma/client";
import { Icon, type IconName } from "./Icon";

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const styles = {
    info: "bg-white border-paper-line text-ink",
    error: "bg-red-50 border-red-200 text-red-900",
    success: "bg-[#E9F8C4] border-[#C9E68A] text-[#2F4700]",
    warning: "bg-[#FDF0C7] border-[#F1D98A] text-[#5C3F00]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; bg: string; fg: string; dot: string }> = {
  NEW: { label: "Novo", bg: "#FFE3D8", fg: "#9A2E0B", dot: "#FF6A3D" },
  PREPARING: { label: "Em preparo", bg: "#FDF0C7", fg: "#7A5300", dot: "#E8A80C" },
  READY: { label: "Pronto", bg: "#E9F8C4", fg: "#3B5A00", dot: "#7DB100" },
  COMPLETED: { label: "Finalizado", bg: "#E6E8EB", fg: "#3A4250", dot: "#7C8592" },
  CANCELED: { label: "Cancelado", bg: "#F9DADD", fg: "#8E1B26", dot: "#D93A48" },
};

export function StatusBadge({ status, count }: { status: OrderStatus; count?: number }) {
  const s = ORDER_STATUS[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.dot }} />
      {s.label}
      {count != null && ` · ${count}`}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brasa" | "green" | "amber" | "red" }) {
  const t = {
    neutral: "bg-[#E6E8EB] text-[#3A4250]",
    brasa: "bg-brasa-soft text-[#9A2E0B]",
    green: "bg-[#E9F8C4] text-[#3B5A00]",
    amber: "bg-[#FDF0C7] text-[#7A5300]",
    red: "bg-[#F9DADD] text-[#8E1B26]",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${t}`}>{children}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-paper-line-2 bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gelo text-ink-muted"><Icon name={icon} size={24} /></span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-md text-[15px] text-ink-muted">{children}</p>}
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-paper-line bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {kicker && <span className="label-mono text-ink-muted">{`// ${kicker}`}</span>}
        <h1 className="display text-[26px] sm:text-[32px]">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
