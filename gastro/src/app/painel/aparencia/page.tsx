import type { Metadata } from "next";
import { requireOwnerPanel } from "@/lib/session";
import { getMenu } from "@/lib/menu";
import { storageDriver } from "@/lib/storage";
import { PageHeader } from "@/components/ui/Feedback";
import { AppearanceForm } from "./AppearanceForm";

export const metadata: Metadata = { title: "Aparência" };

export default async function AppearancePage() {
  const { tenant } = await requireOwnerPanel();
  const menu = (await getMenu(tenant.slug, { allowUnpublished: true }))!;
  return (
    <>
      <PageHeader kicker="Aparência" title="Aparência do cardápio" subtitle="Mude cores, logotipo e capa. A prévia ao lado mostra como o cliente vai ver." />
      <AppearanceForm
        menu={menu}
        driver={storageDriver()}
        tenantId={tenant.id}
        initial={{
          name: tenant.name, menuName: tenant.menuName ?? "", tagline: tenant.tagline ?? "", description: tenant.description ?? "",
          primaryColor: tenant.primaryColor, secondaryColor: tenant.secondaryColor, buttonColor: tenant.buttonColor,
          cardStyle: tenant.cardStyle, appearance: tenant.appearance, logoUrl: tenant.logoUrl ?? "", coverUrl: tenant.coverUrl ?? "",
        }}
      />
    </>
  );
}
