import type { Metadata } from "next";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { parseFeatures } from "@/lib/plans";
import { PageHeader } from "@/components/ui/Feedback";
import { PlanForm } from "./PlanForm";

export const metadata: Metadata = { title: "Planos" };

export default async function PlansPage() {
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: true } } } });
  return (
    <>
      <PageHeader kicker="Master" title="Planos" subtitle="Preços, textos e recursos de cada plano. As mudanças valem na hora para a página de vendas e para os clientes." />
      <div className="grid gap-5 xl:grid-cols-2">
        {plans.map((p) => {
          const f = parseFeatures(p.features);
          return (
            <PlanForm key={p.id} plan={{
              id: p.id, code: p.code, name: p.name, headline: p.headline ?? "", description: p.description ?? "",
              price: p.priceCents != null ? centsToInput(p.priceCents) : "", highlights: p.highlights.join("\n"),
              videoFeed: f.videoFeed, managedByUnlock: f.managedByUnlock, maxProducts: f.maxProducts, active: p.active, subscribers: p._count.subscriptions,
            }} />
          );
        })}
      </div>
    </>
  );
}
