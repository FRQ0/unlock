import Link from "next/link";
import { requirePanel } from "@/lib/session";
import { db } from "@/lib/db";
import { PanelNav, type NavItem } from "@/components/panel/PanelNav";
import { stopActingAction } from "@/app/master/actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, actingAsMaster } = await requirePanel();
  const [newOrders, sub] = await Promise.all([
    db.order.count({ where: { tenantId: tenant.id, status: "NEW" } }),
    db.subscription.findUnique({ where: { tenantId: tenant.id }, select: { status: true } }),
  ]);

  const items: NavItem[] =
    user.role === "STAFF"
      ? [
          { href: "/painel/garcom", label: "Garçom", icon: "users" },
          { href: "/painel/pedidos", label: "Pedidos", icon: "bag", badge: newOrders },
        ]
      : [
          { href: "/painel", label: "Início", icon: "dashboard" },
          { href: "/painel/pedidos", label: "Pedidos", icon: "bag", badge: newOrders },
          { href: "/painel/garcom", label: "Garçom", icon: "users" },
          { href: "/painel/produtos", label: "Produtos", icon: "cutlery" },
          { href: "/painel/categorias", label: "Categorias", icon: "list" },
          { href: "/painel/aparencia", label: "Aparência", icon: "palette" },
          { href: "/painel/plaquinha", label: "Minha plaquinha", icon: "nfc" },
          { href: "/painel/assinatura", label: "Assinatura", icon: "card" },
          { href: "/painel/configuracoes", label: "Dados e horários", icon: "settings" },
        ];

  const pendingPayment = tenant.status === "PENDING_PAYMENT" || sub?.status === "PENDING";

  return (
    <div className="flex min-h-dvh flex-col bg-gelo lg:flex-row">
      <PanelNav items={items} tenantName={tenant.name} published={tenant.published && tenant.status === "ACTIVE"} userName={actingAsMaster ? `Unlock · ${user.name}` : user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        {actingAsMaster && (
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-ciano px-4 py-2.5 text-sm text-grafite sm:px-8">
            <span><strong>Modo Unlock:</strong> você está gerenciando o cardápio de {tenant.name}. As alterações ficam registradas.</span>
            <form action={stopActingAction}><button type="submit" className="h-9 rounded-lg bg-grafite px-3 font-semibold text-gelo">Voltar ao Master</button></form>
          </div>
        )}
        {pendingPayment && user.role !== "STAFF" && (
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-[#F1D98A] bg-[#FDF0C7] px-4 py-2.5 text-sm text-[#5C3F00] sm:px-8">
            <span>Sua assinatura está <strong>aguardando pagamento</strong>. Você já pode montar o cardápio; ele fica visível ao público depois da ativação.</span>
            <Link href="/painel/assinatura" className="font-semibold underline">Ver assinatura</Link>
          </div>
        )}
        {tenant.status === "SUSPENDED" && (
          <div className="print:hidden bg-[#F9DADD] px-4 py-2.5 text-sm text-[#8E1B26] sm:px-8">Este estabelecimento está <strong>suspenso</strong> e o cardápio está fora do ar. Fale com a Unlock.</div>
        )}
        <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-4 py-7 sm:px-8 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
