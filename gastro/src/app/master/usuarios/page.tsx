import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMaster } from "@/lib/session";
import { fmtDate } from "@/lib/dates";
import { PageHeader, Pill } from "@/components/ui/Feedback";
import { SubmitButton } from "@/components/ui/Button";
import { toggleUserActiveAction } from "../actions";
import { CreateUserForm, ResetPasswordForm } from "./Forms";

export const metadata: Metadata = { title: "Usuários" };
const ROLE = { MASTER: "Unlock", OWNER: "Dono", STAFF: "Funcionário" } as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; tenant?: string }> }) {
  const me = await requireMaster();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const where: Prisma.UserWhereInput = {
    ...(sp.tenant ? { tenantId: sp.tenant } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [users, tenants] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { tenant: { select: { name: true } } } }),
    db.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader kicker="Master" title="Usuários" subtitle="Acessos de donos, funcionários e da equipe Unlock." />
      <CreateUserForm tenants={tenants} defaultTenant={sp.tenant} />
      <form className="flex gap-2" role="search">
        {sp.tenant && <input type="hidden" name="tenant" value={sp.tenant} />}
        <label htmlFor="q" className="sr-only">Buscar usuário</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nome ou e-mail" className="h-12 flex-1 rounded-xl border border-paper-line-2 bg-white px-3.5" />
        <button type="submit" className="h-12 rounded-xl bg-grafite px-5 font-semibold text-gelo">Buscar</button>
      </form>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 rounded-2xl border border-paper-line bg-white p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{u.name} {!u.active && <Pill tone="red">Desativado</Pill>}</span>
              <span className="text-[13px] text-ink-muted">{u.email} · {u.tenant?.name ?? "Unlock Systems"} · último acesso {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "nunca"}</span>
            </div>
            <Pill tone={u.role === "MASTER" ? "brasa" : "neutral"}>{ROLE[u.role]}</Pill>
            <ResetPasswordForm userId={u.id} />
            {u.id !== me.id && (
              <form action={toggleUserActiveAction}><input type="hidden" name="userId" value={u.id} /><SubmitButton variant={u.active ? "danger" : "secondary"} size="sm" pendingText="...">{u.active ? "Desativar" : "Reativar"}</SubmitButton></form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
