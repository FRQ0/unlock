import type { Metadata } from "next";
import { requireOwnerPanel } from "@/lib/session";
import { parseHours } from "@/lib/hours";
import { centsToInput } from "@/lib/money";
import { PageHeader } from "@/components/ui/Feedback";
import { SettingsForm, PasswordForm, PrivacyTools } from "./SettingsForm";

export const metadata: Metadata = { title: "Dados e horários" };

export default async function SettingsPage() {
  const { tenant, actingAsMaster } = await requireOwnerPanel();
  return (
    <>
      <PageHeader kicker="Configurações" title="Dados e horários" subtitle="Contato, endereço, horário de funcionamento e formas de atendimento." />
      <SettingsForm
        initial={{
          phone: tenant.phone ?? "", whatsapp: tenant.whatsapp ?? "", instagram: tenant.instagram ?? "",
          addressLine: tenant.addressLine ?? "", addressCity: tenant.addressCity ?? "", addressState: tenant.addressState ?? "", addressZip: tenant.addressZip ?? "",
          hours: parseHours(tenant.openingHours), acceptsOrders: tenant.acceptsOrders, acceptsDineIn: tenant.acceptsDineIn, acceptsPickup: tenant.acceptsPickup,
          acceptsDelivery: tenant.acceptsDelivery, deliveryFee: tenant.deliveryFeeCents ? centsToInput(tenant.deliveryFeeCents) : "", minOrder: tenant.minOrderCents ? centsToInput(tenant.minOrderCents) : "",
        }}
      />
      {!actingAsMaster && <PasswordForm />}
      <PrivacyTools />
    </>
  );
}
