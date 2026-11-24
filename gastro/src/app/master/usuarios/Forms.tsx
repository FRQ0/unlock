"use client";
import { useActionState, useState } from "react";
import { createUserAction, resetUserPasswordAction } from "../actions";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";

export function CreateUserForm({ tenants, defaultTenant }: { tenants: { id: string; name: string }[]; defaultTenant?: string }) {
  const [state, action] = useActionState(createUserAction, undefined);
  const [role, setRole] = useState(defaultTenant ? "STAFF" : "OWNER");
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Novo usuário</h2>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" name="name" required />
          <Field label="E-mail" name="email" type="email" required />
          <Select label="Tipo de acesso" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="OWNER">Dono do estabelecimento</option>
            <option value="STAFF">Garçom / atendente (mesas e pedidos)</option>
            <option value="MASTER">Equipe Unlock (Master)</option>
          </Select>
          {role !== "MASTER" && (
            <Select label="Estabelecimento" name="tenantId" defaultValue={defaultTenant ?? ""} required>
              <option value="" disabled>Escolha...</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
          <Field label="Senha inicial" name="password" required minLength={10} autoComplete="off" hint="Mínimo de 10 caracteres." />
        </div>
        <div className="flex justify-end"><SubmitButton pendingText="Criando...">Criar usuário</SubmitButton></div>
      </form>
    </Card>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetUserPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`pw-${userId}`}>Nova senha</label>
      <input id={`pw-${userId}`} name="password" placeholder="Nova senha (10+)" minLength={10} required autoComplete="off" className="h-10 w-44 rounded-lg border border-paper-line-2 px-3 text-sm" />
      <SubmitButton variant="secondary" size="sm" pendingText="...">Redefinir</SubmitButton>
      {state?.error && <span className="text-sm text-red-700">{state.error}</span>}
      {state?.ok && <span className="text-sm text-[#3B5A00]">Senha redefinida.</span>}
    </form>
  );
}
