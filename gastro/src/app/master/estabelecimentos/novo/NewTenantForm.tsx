"use client";
import { useActionState } from "react";
import { createTenantByMasterAction } from "../../actions";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";

export function NewTenantForm({ plans }: { plans: { id: string; name: string; active: boolean }[] }) {
  const [state, action] = useActionState(createTenantByMasterAction, undefined);
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Estabelecimento</h2>
        <Field label="Nome" name="businessName" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Endereço do cardápio" name="slug" hint="Deixe vazio para gerar a partir do nome." autoCapitalize="none" />
          <Select label="Tipo" name="businessType" defaultValue="restaurante">
            {["hamburgueria", "pizzaria", "restaurante", "bar", "cafeteria", "acaiteria", "lanchonete", "doceria", "outro"].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </Select>
        </div>
        <Select label="Plano" name="planId" required>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? "" : " (inativo)"}</option>)}
        </Select>
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Dono (acesso ao painel)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" name="ownerName" required />
          <Field label="E-mail" name="ownerEmail" type="email" required />
        </div>
        <Field label="Senha inicial" name="ownerPassword" type="text" required minLength={10} hint="Mínimo de 10 caracteres." autoComplete="off" />
      </Card>
      <div className="flex justify-end"><SubmitButton pendingText="Criando...">Criar estabelecimento</SubmitButton></div>
    </form>
  );
}
