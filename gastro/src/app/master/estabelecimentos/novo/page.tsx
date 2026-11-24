import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/Feedback";
import { NewTenantForm } from "./NewTenantForm";

export const metadata: Metadata = { title: "Criar estabelecimento" };

export default async function NewTenantPage() {
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, active: true } });
  return (
    <>
      <PageHeader kicker="Master" title="Criar estabelecimento" subtitle="Cria a conta do cliente com o dono. Envie a senha inicial por um canal seguro e peça para ele trocar." />
      <NewTenantForm plans={plans} />
    </>
  );
}
