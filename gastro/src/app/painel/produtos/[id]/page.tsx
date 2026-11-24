import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwnerPanel, tenantFeatures } from "@/lib/session";
import { storageDriver } from "@/lib/storage";
import { centsToInput } from "@/lib/money";
import { PageHeader } from "@/components/ui/Feedback";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Icon } from "@/components/ui/Icon";
import { ProductForm } from "../ProductForm";
import { deleteProductAction } from "../actions";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await requireOwnerPanel();
  const { id } = await params;
  // findFirst com tenantId: produto de outro estabelecimento = 404.
  const product = await db.product.findFirst({
    where: { id, tenantId: tenant.id },
    include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!product) notFound();
  const [categories, features] = await Promise.all([
    db.category.findMany({ where: { tenantId: tenant.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }),
    tenantFeatures(tenant.id),
  ]);
  return (
    <>
      <PageHeader
        kicker="Produtos"
        title="Editar produto"
        actions={
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="from" value="edit" />
            <ConfirmButton size="md" message={`Excluir “${product.name}”? Essa ação não pode ser desfeita.`}><Icon name="trash" size={18} />Excluir</ConfirmButton>
          </form>
        }
      />
      <ProductForm
        initial={{
          id: product.id, name: product.name, description: product.description ?? "", price: centsToInput(product.priceCents),
          categoryId: product.categoryId ?? "", imageUrl: product.imageUrl ?? "", videoUrl: product.videoUrl ?? "",
          available: product.available, featured: product.featured,
          groups: product.optionGroups.map((g) => ({
            id: g.id, key: g.id, name: g.name, type: g.type, required: g.required, maxSelect: g.maxSelect,
            options: g.options.map((o) => ({ id: o.id, key: o.id, name: o.name, price: o.priceDeltaCents ? centsToInput(o.priceDeltaCents) : "", available: o.available })),
          })),
        }}
        categories={categories}
        driver={storageDriver()}
        tenantId={tenant.id}
        videoEnabled={features.videoFeed}
      />
    </>
  );
}
