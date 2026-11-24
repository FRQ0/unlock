"use client";
import { useActionState } from "react";
import { updatePlanAction } from "../actions";
import { Field, TextArea, Toggle } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";

type P = { id: string; code: string; name: string; headline: string; description: string; price: string; highlights: string; videoFeed: boolean; managedByUnlock: boolean; maxProducts: number; active: boolean; subscribers: number };

export function PlanForm({ plan }: { plan: P }) {
  const [state, action] = useActionState(updatePlanAction, undefined);
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={plan.id} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{plan.name} <span className="font-mono text-sm font-normal text-ink-muted">({plan.code})</span></h2>
          <span className="text-sm text-ink-muted">{plan.subscribers} assinante(s)</span>
        </div>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" name="name" defaultValue={plan.name} required maxLength={40} />
          <Field label="Preço mensal (R$)" name="price" inputMode="decimal" defaultValue={plan.price} placeholder="Ex.: 79,90" hint="Vazio = “sob consulta” na página de vendas." />
        </div>
        <Field label="Chamada" name="headline" defaultValue={plan.headline} maxLength={120} />
        <TextArea label="Descrição" name="description" defaultValue={plan.description} maxLength={400} />
        <TextArea label="Itens do plano (um por linha)" name="highlights" defaultValue={plan.highlights} rows={5} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Feed de vídeos" hint="Libera vídeos e o feed vertical no cardápio." name="videoFeed" defaultChecked={plan.videoFeed} />
          <Toggle label="Unlock faz tudo" hint="Marca o cliente como gerenciado pela equipe." name="managedByUnlock" defaultChecked={plan.managedByUnlock} />
          <Field label="Limite de produtos" name="maxProducts" type="number" min={0} defaultValue={plan.maxProducts} hint="0 = ilimitado." />
          <Toggle label="Plano à venda" hint="Desligado, não aparece para escolher ao criar estabelecimentos." name="active" defaultChecked={plan.active} />
        </div>
        <div className="flex justify-end"><SubmitButton pendingText="Salvando...">Salvar plano</SubmitButton></div>
      </form>
    </Card>
  );
}
