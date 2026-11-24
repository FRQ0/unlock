import Link from "next/link";
import { requirePanel } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startOfTodayBR, todayDateBR, daysAgo } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { parseHours } from "@/lib/hours";
import { Card, PageHeader, Pill } from "@/components/ui/Feedback";
import { LinkButton, SubmitButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { setPublishedAction } from "./actions";

export default async function Dashboard() {
  const { user, tenant } = await requirePanel();
  if (user.role === "STAFF") redirect("/painel/pedidos");
  const today = startOfTodayBR();
  const weekAgo = daysAgo(todayDateBR(), 6);
  const t = tenant.id;

  const [ordersToday, newOrders, preparing, products, unavailable, categories, completedToday, topViews] = await Promise.all([
    db.order.count({ where: { tenantId: t, createdAt: { gte: today }, status: { not: "CANCELED" } } }),
    db.order.count({ where: { tenantId: t, status: "NEW" } }),
    db.order.count({ where: { tenantId: t, status: "PREPARING" } }),
    db.product.count({ where: { tenantId: t } }),
    db.product.count({ where: { tenantId: t, available: false } }),
    db.category.count({ where: { tenantId: t } }),
    db.order.aggregate({ where: { tenantId: t, status: "COMPLETED", createdAt: { gte: today } }, _sum: { totalCents: true }, _count: true }),
    db.productViewDay.groupBy({ by: ["productId"], where: { tenantId: t, day: { gte: weekAgo } }, _sum: { count: true }, orderBy: { _sum: { count: "desc" } }, take: 5 }),
  ]);
  const topProducts = topViews.length
    ? await db.product.findMany({ where: { tenantId: t, id: { in: topViews.map((v) => v.productId) } }, select: { id: true, name: true, imageUrl: true } })
    : [];
  const top = topViews.map((v) => ({ ...topProducts.find((p) => p.id === v.productId)!, views: v._sum.count ?? 0 })).filter((p) => p.id);

  const steps: { done: boolean; label: string; href: string; icon: IconName }[] = [
    { done: Boolean(tenant.logoUrl), label: "Envie seu logotipo", href: "/painel/aparencia", icon: "image" },
    { done: tenant.primaryColor !== "#FF6A3D" || Boolean(tenant.coverUrl), label: "Escolha as cores e a capa", href: "/painel/aparencia", icon: "palette" },
    { done: categories > 0, label: "Crie as categorias", href: "/painel/categorias", icon: "list" },
    { done: products > 0, label: "Cadastre os produtos", href: "/painel/produtos/novo", icon: "cutlery" },
    { done: Boolean(parseHours(tenant.openingHours)), label: "Informe o horário de funcionamento", href: "/painel/configuracoes", icon: "clock" },
  ];
  const allDone = steps.every((s) => s.done);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  const greet = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const live = tenant.published && tenant.status === "ACTIVE";

  return (
    <>
      <PageHeader
        kicker="Início"
        title={`${greet}!`}
        subtitle="Veja como está o movimento hoje."
        actions={
          <>
            <LinkButton href={`/${tenant.slug}`} target="_blank" variant="secondary"><Icon name="eye" />Ver meu cardápio</LinkButton>
            <LinkButton href="/painel/produtos/novo"><Icon name="plus" />Adicionar produto</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Pedidos hoje" value={String(ordersToday)} note={newOrders ? `${newOrders} aguardando você` : "Nenhum aguardando"} href="/painel/pedidos" />
        <Stat label="Em preparo" value={String(preparing)} note="pedidos na cozinha" href="/painel/pedidos" />
        <Stat label="Produtos" value={String(products)} note={unavailable ? `${unavailable} indisponíveis` : "todos disponíveis"} href="/painel/produtos" />
        <Card className="flex flex-col gap-2 !p-5">
          <span className="text-sm text-ink-muted">Finalizados hoje</span>
          <span className="display text-[28px] tabular-nums">{formatBRL(completedToday._sum.totalCents ?? 0)}</span>
          <span className="text-[13px] text-ink-muted">{completedToday._count} pedidos · pagos no local. Pagamento online ainda não integrado.</span>
        </Card>
      </div>

      {!allDone || !live ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Deixe seu cardápio pronto</h2>
              <p className="text-[15px] text-ink-muted">{steps.filter((s) => s.done).length} de {steps.length} etapas concluídas.</p>
            </div>
            <form action={setPublishedAction}>
              <input type="hidden" name="published" value={tenant.published ? "0" : "1"} />
              <SubmitButton variant={tenant.published ? "secondary" : "primary"} pendingText="Aguarde...">
                {tenant.published ? "Despublicar cardápio" : "Publicar cardápio"}
              </SubmitButton>
            </form>
          </div>
          {tenant.published && tenant.status !== "ACTIVE" && (
            <p className="mt-3 text-sm text-[#7A5300]">Marcado para publicar. Ele entra no ar assim que a assinatura for ativada.</p>
          )}
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-paper-line px-4 hover:bg-gelo">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${s.done ? "bg-[#E9F8C4] text-[#3B5A00]" : "bg-gelo text-ink-muted"}`}>
                    <Icon name={s.done ? "check" : s.icon} size={16} />
                  </span>
                  <span className={`text-[15px] ${s.done ? "text-ink-muted line-through" : "font-medium"}`}>{s.label}</span>
                  <Icon name="chevronRight" size={18} className="ml-auto text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mais vistos nos últimos 7 dias</h2>
          </div>
          {top.length ? (
            <ol className="flex flex-col divide-y divide-paper-line">
              {top.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="label-mono w-6 text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-gelo" />}
                  <Link href={`/painel/produtos/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{p.name}</Link>
                  <Pill>{p.views} {p.views === 1 ? "visualização" : "visualizações"}</Pill>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[15px] text-ink-muted">Ainda não há visualizações. Elas aparecem aqui quando os clientes abrirem os produtos no cardápio ou no feed.</p>
          )}
        </Card>
        <section className="flex flex-col gap-3 rounded-2xl bg-grafite p-5 text-gelo sm:p-6">
          <h2 className="text-lg font-semibold">Atalhos</h2>
          <Shortcut href="/painel/produtos/novo" icon="plus">Cadastrar produto</Shortcut>
          <Shortcut href="/painel/aparencia" icon="palette">Mudar cores do cardápio</Shortcut>
          <Shortcut href="/painel/plaquinha" icon="qr">Baixar meu QR Code</Shortcut>
          <div className="mt-auto rounded-xl border border-line px-4 py-3">
            <span className="label-mono text-limao">{"// Seu endereço"}</span>
            <p className="mt-1 break-all text-sm text-[#C9CED6]">{(process.env.NEXT_PUBLIC_APP_URL || "").replace(/^https?:\/\//, "")}/{tenant.slug}</p>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-2xl border border-paper-line bg-white p-5 transition-colors hover:border-paper-line-2">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="display text-[30px] tabular-nums">{value}</span>
      <span className="text-[13px] text-ink-muted">{note}</span>
    </Link>
  );
}

function Shortcut({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-[52px] items-center gap-3 rounded-xl bg-carvao px-4 text-[15px] hover:bg-line">
      <Icon name={icon} />{children}
    </Link>
  );
}
