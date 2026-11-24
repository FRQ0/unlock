"use client";
import { useActionState, useState } from "react";
import { anonymizeOrdersAction, changePasswordAction, saveSettingsAction } from "./actions";
import { Field, Toggle } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";
import { WEEKDAYS, type OpeningHours } from "@/lib/hours";

type Initial = {
  phone: string; whatsapp: string; instagram: string; addressLine: string; addressCity: string; addressState: string; addressZip: string;
  hours: OpeningHours | null; acceptsOrders: boolean; acceptsDineIn: boolean; acceptsPickup: boolean; acceptsDelivery: boolean; deliveryFee: string; minOrder: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState(saveSettingsAction, undefined);
  const [delivery, setDelivery] = useState(initial.acceptsDelivery);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WEEKDAYS.map((d) => [d.key, initial.hours ? !initial.hours[d.key].closed : d.key !== "mon"])),
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Contato</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="WhatsApp" name="whatsapp" inputMode="tel" defaultValue={initial.whatsapp} placeholder="(00) 00000-0000" />
          <Field label="Telefone" name="phone" inputMode="tel" defaultValue={initial.phone} />
          <Field label="Instagram" name="instagram" defaultValue={initial.instagram} placeholder="@seuperfil" />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Endereço</h2>
        <Field label="Rua, número e bairro" name="addressLine" defaultValue={initial.addressLine} maxLength={140} />
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Cidade" name="addressCity" defaultValue={initial.addressCity} maxLength={60} />
          <Field label="UF" name="addressState" defaultValue={initial.addressState} maxLength={2} />
          <Field label="CEP" name="addressZip" inputMode="numeric" defaultValue={initial.addressZip} maxLength={10} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Horário de funcionamento</h2>
          <p className="text-[15px] text-ink-muted">Se fecha depois da meia-noite, coloque o horário do dia seguinte (ex.: 18:00 às 02:00).</p>
        </div>
        <ul className="flex flex-col divide-y divide-paper-line">
          {WEEKDAYS.map((d) => {
            const h = initial.hours?.[d.key];
            const open = openDays[d.key];
            return (
              <li key={d.key} className="flex flex-wrap items-center gap-3 py-2.5">
                <label className="flex w-36 items-center gap-2.5 font-medium">
                  <input type="checkbox" name={`${d.key}_open`} checked={open} onChange={(e) => setOpenDays((s) => ({ ...s, [d.key]: e.target.checked }))} className="h-5 w-5 accent-[#7DB100]" />
                  {d.label}
                </label>
                {open ? (
                  <span className="flex items-center gap-2 text-sm">
                    <input type="time" name={`${d.key}_from`} defaultValue={h?.open ?? "18:00"} aria-label={`${d.label}: abre`} className="h-11 rounded-xl border border-paper-line-2 bg-white px-2" />
                    às
                    <input type="time" name={`${d.key}_to`} defaultValue={h?.close ?? "23:00"} aria-label={`${d.label}: fecha`} className="h-11 rounded-xl border border-paper-line-2 bg-white px-2" />
                  </span>
                ) : (
                  <span className="text-sm text-ink-muted">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pedidos e atendimento</h2>
        <Toggle label="Receber pedidos pelo cardápio" hint="Desligado, o cardápio continua no ar, só para consulta." name="acceptsOrders" defaultChecked={initial.acceptsOrders} />
        <Toggle label="Consumo no local" hint="O cliente informa o número da mesa." name="acceptsDineIn" defaultChecked={initial.acceptsDineIn} />
        <Toggle label="Retirada no balcão" name="acceptsPickup" defaultChecked={initial.acceptsPickup} />
        <Toggle label="Entrega" name="acceptsDelivery" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
        {delivery && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Taxa de entrega (R$)" name="deliveryFee" inputMode="decimal" defaultValue={initial.deliveryFee} placeholder="0,00" />
            <Field label="Pedido mínimo para entrega (R$)" name="minOrder" inputMode="decimal" defaultValue={initial.minOrder} placeholder="0,00" />
          </div>
        )}
        {!delivery && <><input type="hidden" name="deliveryFee" value={initial.deliveryFee} /><input type="hidden" name="minOrder" value={initial.minOrder} /></>}
        <p className="text-[13px] text-ink-muted">O pagamento dos pedidos é combinado no local (dinheiro, Pix ou cartão na maquininha). Pagamento online entra quando houver integração.</p>
      </Card>

      <div className="flex justify-end"><SubmitButton pendingText="Salvando...">Salvar dados</SubmitButton></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Trocar senha</h2>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual" name="current" type="password" autoComplete="current-password" required />
          <Field label="Nova senha" name="next" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="flex justify-end"><SubmitButton variant="secondary" pendingText="Salvando...">Trocar senha</SubmitButton></div>
      </form>
    </Card>
  );
}

export function PrivacyTools() {
  const [state, action] = useActionState(anonymizeOrdersAction, undefined);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Privacidade e dados (LGPD)</h2>
        <p className="text-[15px] text-ink-muted">Você é responsável pelos dados dos seus clientes. Guarde só o necessário.</p>
      </div>
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="flex flex-wrap gap-3">
        <a href="/api/painel/exportar" className="inline-flex h-12 items-center rounded-xl border border-paper-line-2 px-5 text-[15px] font-semibold hover:bg-black/5">Baixar todos os meus dados</a>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <label htmlFor="anon-days" className="text-sm">Anonimizar clientes de pedidos com mais de</label>
          <select id="anon-days" name="days" defaultValue="90" className="h-12 rounded-xl border border-paper-line-2 bg-white px-3">
            <option value="30">30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value="365">1 ano</option>
          </select>
          <SubmitButton variant="secondary" pendingText="Aguarde...">Anonimizar</SubmitButton>
        </form>
      </div>
      <p className="text-[13px] text-ink-muted">Para encerrar a conta e apagar todos os dados, fale com a Unlock. A exclusão é definitiva: baixe seus dados antes.</p>
    </Card>
  );
}
