import type { Metadata } from "next";
import { requireMaster } from "@/lib/session";
import { PanelNav, type NavItem } from "@/components/panel/PanelNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Painel Master", template: "%s · Master · Unlock Gastro" }, robots: { index: false } };

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMaster();
  const items: NavItem[] = [
    { href: "/master", label: "Visão geral", icon: "dashboard" },
    { href: "/master/estabelecimentos", label: "Estabelecimentos", icon: "store" },
    { href: "/master/planos", label: "Planos", icon: "card" },
    { href: "/master/usuarios", label: "Usuários", icon: "users" },
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-gelo lg:flex-row">
      <PanelNav items={items} tenantName="Painel Master" published={null} userName={user.email} />
      <main className="mx-auto flex w-full max-w-[1240px] min-w-0 flex-1 flex-col gap-7 px-4 py-7 sm:px-8 sm:py-9">{children}</main>
    </div>
  );
}
