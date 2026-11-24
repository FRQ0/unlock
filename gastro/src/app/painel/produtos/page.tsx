import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwnerPanel } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { Alert, EmptyState, PageHeader, Pill } from "@/components/ui/Feedback";
import { LinkButton, SubmitButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { moveProductAction, toggleProductAction } from "./actions";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ salvo?: string; q?: string }> }) {
  const { tenant } = await requireOwnerPanel();
  const { salvo, q } = await searchParams;
  const term = q?.trim().slice(0, 60);
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { tenantId: tenant.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.product.findMany({
      where: { tenantId: tenant.id, ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { optionGroups: true } } },
    }),
  ]);
  const sections = [
    ...categories.map((c) => ({ id: c.id, name: c.name, hidden: !c.active, items: products.filter((p) => p.categoryId === c.id) })),
    { id: "none", name: "Sem categoria", hidden: false, items: products.filter((p) => !p.categoryId) },
  ].filter((s) => s.items.length);

  return (
    <>
      <PageHeader kicker="Produtos" title="Produtos" subtitle={`${products.length} ${products.length === 1 ? "produto" : "produtos"} no cardápio.`} actions={<LinkButton href="/painel/produtos/novo"><Icon name="plus" />Adicionar produto</LinkButton>} />
      {salvo && <Alert tone="success">Pronto! “{salvo}” foi salvo.</Alert>}
      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Buscar produto</label>
        <input id="q" name="q" defaultValue={term} placeholder="Buscar produto pelo nome" className="h-12 flex-1 rounded-xl border border-paper-line-2 bg-white px-3.5 focus:border-brasa focus:outline-none" />
        <button type="submit" className="h-12 rounded-xl border border-paper-line-2 px-4 font-semibold hover:bg-white">Buscar</button>
      </form>

      {products.length === 0 ? (
        <EmptyState icon="cutlery" title={term ? "Nada encontrado" : "Nenhum produto cadastrado"} action={!term && <LinkButton href="/painel/produtos/novo"><Icon name="plus" />Cadastrar o primeiro produto</LinkButton>}>
          {term ? "Tente outro nome." : "Cadastre nome, preço e foto. Depois você pode adicionar tamanhos, sabores e adicionais."}
        </EmptyState>
      ) : (
        sections.map((s) => (
          <section key={s.id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">{s.name} {s.hidden && <Pill tone="amber">Categoria oculta</Pill>}</h2>
            <ul className="flex flex-col gap-2">
              {s.items.map((p, i) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-paper-line bg-white p-3">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-16 w-16 flex-none rounded-xl object-cover" /> : <span className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gelo text-ink-muted"><Icon name="image" /></span>}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/painel/produtos/${p.id}`} className="truncate font-semibold hover:underline">{p.name}</Link>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">{formatBRL(p.priceCents)}</span>
                      {!p.available && <Pill tone="red">Indisponível</Pill>}
                      {p.featured && <Pill tone="brasa">Destaque</Pill>}
                      {p.videoUrl && <Pill>Vídeo</Pill>}
                      {p._count.optionGroups > 0 && <Pill>{p._count.optionGroups} {p._count.optionGroups === 1 ? "grupo de opções" : "grupos de opções"}</Pill>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={moveProductAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={`Subir ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-gelo disabled:opacity-30"><Icon name="arrowUp" size={18} /></button></form>
                    <form action={moveProductAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="down" />
                      <button type="submit" disabled={i === s.items.length - 1} aria-label={`Descer ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-gelo disabled:opacity-30"><Icon name="arrowDown" size={18} /></button></form>
                    <form action={toggleProductAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value="available" />
                      <SubmitButton variant="secondary" size="sm" pendingText="...">{p.available ? "Marcar esgotado" : "Disponibilizar"}</SubmitButton></form>
                    <Link href={`/painel/produtos/${p.id}`} aria-label={`Editar ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gelo"><Icon name="edit" size={18} /></Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
