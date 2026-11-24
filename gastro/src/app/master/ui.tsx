import type { SubscriptionStatus, TenantStatus } from "@prisma/client";
import { Pill } from "@/components/ui/Feedback";

const T: Record<TenantStatus, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  ACTIVE: { label: "Ativo", tone: "green" },
  PENDING_PAYMENT: { label: "Aguardando pagamento", tone: "amber" },
  SUSPENDED: { label: "Suspenso", tone: "red" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
};
const S: Record<SubscriptionStatus, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  ACTIVE: { label: "Em dia", tone: "green" },
  PENDING: { label: "Pendente", tone: "amber" },
  PAST_DUE: { label: "Em atraso", tone: "red" },
  CANCELED: { label: "Cancelada", tone: "neutral" },
};

export function TenantStatusPill({ status }: { status: TenantStatus }) {
  return <Pill tone={T[status].tone}>{T[status].label}</Pill>;
}
export function SubStatusPill({ status }: { status: SubscriptionStatus }) {
  return <Pill tone={S[status].tone}>{S[status].label}</Pill>;
}
export const TENANT_STATUS_LABEL = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.label])) as Record<TenantStatus, string>;
