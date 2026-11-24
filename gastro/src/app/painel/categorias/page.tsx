import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { CreateCategory } from "./CreateCategory";
import { deleteCategoryAction, moveCategoryAction, renameCategoryAction, toggleCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const { tenant } = await requireOwnerPanel();
  const cats = await db.category.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader kicker="Categorias" title="Categorias" subtitle="Organize o cardápio em seções. A ordem aqui é a ordem que o cliente vê." />
      <Card><CreateCategory existing={cats.map((c) => c.name)} /></Card>
      {cats.length === 0 ? (
        <EmptyState icon="list" title="Nenhuma categoria ainda">Crie a primeira categoria acima. Ex.: Hambúrgueres, Bebidas, Sobremesas.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {cats.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-paper-line bg-white p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1">
                <form action={moveCategoryAction}>
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={i === 0} aria-label={`Subir ${c.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-gelo disabled:opacity-30"><Icon name="arrowUp" size={18} /></button>
                </form>
                <form action={moveCategoryAction}>
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={i === cats.length - 1} aria-label={`Descer ${c.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-gelo disabled:opacity-30"><Icon name="arrowDown" size={18} /></button>
                </form>
              </div>
              <form action={renameCategoryAction} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <label className="sr-only" htmlFor={`cat-${c.id}`}>Nome da categoria</label>
                <input id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={40} required className="h-11 min-w-0 flex-1 rounded-xl border border-transparent px-3 text-[15px] font-medium hover:border-paper-line focus:border-brasa focus:outline-none" />
                <SubmitButton variant="secondary" size="sm" pendingText="...">Salvar</SubmitButton>
              </form>
              <div className="flex items-center gap-2">
                <Pill>{c._count.products} {c._count.products === 1 ? "produto" : "produtos"}</Pill>
                <form action={toggleCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="ghost" size="sm" pendingText="...">{c.active ? "Ocultar" : "Mostrar"}</SubmitButton>
                </form>
                {!c.active && <Pill tone="amber">Oculta</Pill>}
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`Excluir a categoria "${c.name}"? Os produtos dela continuam cadastrados, sem categoria.`} aria-label={`Excluir ${c.name}`}><Icon name="trash" size={18} /></ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
