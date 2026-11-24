"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { checkSlugAction, signupAction } from "../actions";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { formatBRL } from "@/lib/money";
import { slugify } from "@/lib/slug";

type PlanOpt = { code: string; name: string; headline: string | null; priceCents: number | null };

const TYPES: [string, string][] = [
  ["hamburgueria", "Hamburgueria"], ["pizzaria", "Pizzaria"], ["restaurante", "Restaurante"], ["bar", "Bar"],
  ["cafeteria", "Cafeteria"], ["acaiteria", "Açaiteria"], ["lanchonete", "Lanchonete"], ["doceria", "Doceria"], ["outro", "Outro"],
];

export function SignupForm({ plans, defaultPlan, host }: { plans: PlanOpt[]; defaultPlan?: string; host: string }) {
  const [state, action] = useActionState(signupAction, undefined);
  const f = state?.fields ?? {};
  const fe = state?.fieldErrors ?? {};
  const [businessName, setBusinessName] = useState(f.businessName ?? "");
  const [slug, setSlug] = useState(f.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(f.slug));
  const [slugStatus, setSlugStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const effectiveSlug = slugTouched ? slugify(slug) : slugify(businessName);

  useEffect(() => {
    if (effectiveSlug.length < 3) return setSlugStatus(null);
    const t = setTimeout(() => checkSlugAction(effectiveSlug).then(setSlugStatus), 400);
    return () => clearTimeout(t);
  }, [effectiveSlug]);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold text-ink">Seus dados</legend>
        <Field label="Seu nome" name="name" autoComplete="name" required defaultValue={f.name} error={fe.name} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={f.email} error={fe.email} />
        <Field label="Crie uma senha" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo de 8 caracteres." error={fe.password} />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold text-ink">Seu estabelecimento</legend>
        <Field label="Nome do estabelecimento" name="businessName" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} error={fe.businessName} />
        <Select label="Tipo" name="businessType" defaultValue={f.businessType || "hamburgueria"} error={fe.businessType}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-sm font-medium">Endereço do seu cardápio</label>
          <div className="flex h-12 items-center overflow-hidden rounded-xl border border-paper-line-2 bg-white focus-within:border-brasa focus-within:ring-2 focus-within:ring-brasa/25">
            <span className="hidden h-full items-center border-r border-paper-line bg-gelo px-3 text-sm text-ink-muted sm:flex">{host}/</span>
            <input
              id="slug" name="slug" className="h-full min-w-0 flex-1 px-3 text-[15px] focus:outline-none"
              value={effectiveSlug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
              aria-describedby="slug-status" autoCapitalize="none" spellCheck={false}
            />
          </div>
          <span id="slug-status" className={`text-[13px] ${fe.slug || slugStatus?.ok === false ? "text-red-700" : slugStatus?.ok ? "text-[#3B5A00]" : "text-ink-muted"}`}>
            {fe.slug ?? slugStatus?.message ?? "É o link que vai na plaquinha NFC e no QR Code."}
          </span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-ink">Plano</legend>
        {plans.map((p) => (
          <label key={p.code} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-paper-line-2 bg-white p-4 has-[:checked]:border-brasa has-[:checked]:ring-2 has-[:checked]:ring-brasa/25">
            <input type="radio" name="plan" value={p.code} defaultChecked={(f.plan || defaultPlan) === p.code} className="mt-1 h-4 w-4 accent-[#FF6A3D]" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-sm font-semibold text-ink">{p.priceCents != null ? `${formatBRL(p.priceCents)}/mês` : "Valor sob consulta"}</span>
              </span>
              {p.headline && <span className="text-sm text-ink-muted">{p.headline}</span>}
            </span>
          </label>
        ))}
        {fe.plan && <span className="text-sm text-red-700">{fe.plan}</span>}
      </fieldset>

      <label className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted">
        <input type="checkbox" name="terms" defaultChecked={f.terms === "on"} className="mt-0.5 h-5 w-5 flex-none accent-[#FF6A3D]" />
        <span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brasa-ink underline">termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-brasa-ink underline">política de privacidade</Link>.</span>
      </label>
      {fe.terms && <span className="-mt-3 text-sm text-red-700">{fe.terms}</span>}

      <SubmitButton size="lg" pendingText="Criando sua conta...">Criar conta e continuar</SubmitButton>
    </form>
  );
}
