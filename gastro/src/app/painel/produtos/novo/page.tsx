import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerPanel, tenantFeatures } from "@/lib/session";
import { storageDriver } from "@/lib/storage";
import { PageHeader } from "@/components/ui/Feedback";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { tenant } = await requireOwnerPanel();
  const { categoria } = await searchParams;
  const [categories, features] = await Promise.all([
    db.category.findMany({ where: { tenantId: tenant.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }),
    tenantFeatures(tenant.id),
  ]);
  return (
    <>
      <PageHeader kicker="Produtos" title="Novo produto" />
      <ProductForm
        initial={{ name: "", description: "", price: "", categoryId: categories.some((c) => c.id === categoria) ? categoria! : categories[0]?.id ?? "", imageUrl: "", videoUrl: "", available: true, featured: false, groups: [] }}
        categories={categories}
        driver={storageDriver()}
        tenantId={tenant.id}
        videoEnabled={features.videoFeed}
      />
    </>
  );
}
