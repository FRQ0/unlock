"use client";
import { useActionState } from "react";
import { recordManualPaymentAction, updateTenantBasicsAction } from "../../actions";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";

export function ManualPaymentForm({ tenantId, suggested }: { tenantId: string; suggested: string }) {
  const [state, action] = useActionState(recordManualPaymentAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Valor recebido (R$)" name="amount" inputMode="decimal" defaultValue={suggested} required />
        <Select label="Meses pagos" name="months" defaultValue="1">
          {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>)}
        </Select>
      </div>
      <Field label="Como foi recebido" name="note" required maxLength={300} placeholder="Ex.: Pix recebido em 24/11, comprovante no WhatsApp" />
      <SubmitButton variant="dark" pendingText="Registrando...">Registrar pagamento recebido</SubmitButton>
      <p className="text-[13px] text-ink-muted">Use só para pagamentos que realmente entraram. Fica registrado com o seu usuário.</p>
    </form>
  );
}

export function BasicsForm({ tenantId, name, slug }: { tenantId: string; name: string; slug: string }) {
  const [state, action] = useActionState(updateTenantBasicsAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone={state.message?.includes("Atenção") ? "warning" : "success"}>{state.message}</Alert>}
      <Field label="Nome" name="name" defaultValue={name} required />
      <Field label="Endereço do cardápio" name="slug" defaultValue={slug} required hint="Mudar o endereço invalida QR Codes e etiquetas NFC já gravadas." />
      <SubmitButton variant="secondary" pendingText="Salvando...">Salvar</SubmitButton>
    </form>
  );
}
