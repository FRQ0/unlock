"use client";
import { useActionState, useState } from "react";
import type { MenuData } from "@/lib/menu";
import type { MenuTheme } from "@/lib/theme";
import { contrastRatio, isHexColor } from "@/lib/theme";
import { saveAppearanceAction } from "./actions";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";
import { MediaInput } from "@/components/panel/MediaInput";
import { MenuShell, MenuView } from "@/components/menu/MenuView";
import { Icon } from "@/components/ui/Icon";

type Values = {
  name: string; menuName: string; tagline: string; description: string;
  primaryColor: string; secondaryColor: string; buttonColor: string;
  cardStyle: MenuTheme["cardStyle"]; appearance: MenuTheme["appearance"]; logoUrl: string; coverUrl: string;
};

const PRESETS: { name: string; primary: string; secondary: string; button: string; appearance: MenuTheme["appearance"] }[] = [
  { name: "Brasa", primary: "#FF6A3D", secondary: "#1C2128", button: "#FF6A3D", appearance: "DARK" },
  { name: "Defumado", primary: "#F2A33A", secondary: "#3A1A0E", button: "#F2A33A", appearance: "DARK" },
  { name: "Cantina", primary: "#B3261E", secondary: "#1F5135", button: "#B3261E", appearance: "LIGHT" },
  { name: "Café", primary: "#6B4A36", secondary: "#C9B49E", button: "#3B2A20", appearance: "LIGHT" },
  { name: "Açaí", primary: "#7B2CBF", secondary: "#2B0A3D", button: "#C8F542", appearance: "DARK" },
  { name: "Praia", primary: "#0E7C86", secondary: "#F2C14E", button: "#0E7C86", appearance: "LIGHT" },
];

function ColorField({ label, value, onChange, name, hint }: { label: string; value: string; onChange: (v: string) => void; name: string; hint?: string }) {
  const [text, setText] = useState(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${name}-hex`} className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label}: seletor`} value={isHexColor(value) ? value : "#000000"} onChange={(e) => { onChange(e.target.value.toUpperCase()); setText(e.target.value.toUpperCase()); }} className="h-12 w-14 cursor-pointer rounded-xl border border-paper-line-2 bg-white p-1" />
        <input id={`${name}-hex`} value={text} maxLength={7} onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setText(v); if (isHexColor(v)) onChange(v.toUpperCase()); }} className="h-12 w-28 rounded-xl border border-paper-line-2 bg-white px-3 font-mono text-sm uppercase focus:border-brasa focus:outline-none" />
        <input type="hidden" name={name} value={value} />
      </div>
      {hint && <span className="text-[13px] text-ink-muted">{hint}</span>}
    </div>
  );
}

export function AppearanceForm({ menu, initial, driver, tenantId }: { menu: MenuData; initial: Values; driver: "local" | "vercel-blob"; tenantId: string }) {
  const [state, action] = useActionState(saveAppearanceAction, undefined);
  const [v, setV] = useState<Values>(initial);
  const [presetKey, setPresetKey] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const preview: MenuData = {
    ...menu,
    info: { ...menu.info, name: v.name || menu.info.name, menuName: v.menuName || null, tagline: v.tagline || null, description: v.description || null, logoUrl: v.logoUrl || null, coverUrl: v.coverUrl || null },
    theme: { primaryColor: v.primaryColor, secondaryColor: v.secondaryColor, buttonColor: v.buttonColor, cardStyle: v.cardStyle, appearance: v.appearance },
  };
  const bg = v.appearance === "DARK" ? "#0D0F12" : "#F7F6F2";
  const lowContrast = contrastRatio(v.primaryColor, bg) < 3;

  return (
    <form action={action} className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && !dirty && <Alert tone="success">Aparência salva! O cardápio já está atualizado.</Alert>}

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Nome e textos</h2>
          <Field label="Nome do estabelecimento" name="name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do cardápio" name="menuName" value={v.menuName} onChange={(e) => set("menuName", e.target.value)} maxLength={40} placeholder="Cardápio" hint="Texto do botão do cardápio tradicional." />
            <Field label="Frase de apresentação" name="tagline" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} placeholder="Ex.: Hambúrguer artesanal na brasa" />
          </div>
          <TextArea label="Sobre o estabelecimento" name="description" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={600} placeholder="Conte um pouco da sua história, especialidade, diferenciais." />
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Logotipo e capa</h2>
          <MediaInput name="logoUrl" label="Logotipo" kind="image" aspect="square" defaultValue={v.logoUrl} onChange={(u) => set("logoUrl", u)} driver={driver} tenantId={tenantId} hint="Quadrado, de preferência PNG. Até 5 MB." />
          <MediaInput name="coverUrl" label="Imagem de capa" kind="image" defaultValue={v.coverUrl} onChange={(u) => set("coverUrl", u)} driver={driver} tenantId={tenantId} hint="Horizontal, mostrando o ambiente ou um prato forte." />
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Cores</h2>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Combinações prontas</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.name} type="button" onClick={() => { setV((s) => ({ ...s, primaryColor: p.primary, secondaryColor: p.secondary, buttonColor: p.button, appearance: p.appearance })); setPresetKey((x) => x + 1); }}
                  className="flex h-11 items-center gap-2 rounded-full border border-paper-line-2 bg-white pl-1.5 pr-3.5 text-sm font-medium hover:border-ink-muted">
                  <span className="flex">
                    {[p.primary, p.secondary, p.button].map((c, i) => <span key={i} className="-ml-1 h-7 w-7 rounded-full border-2 border-white first:ml-0" style={{ background: c }} />)}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div key={presetKey} className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Cor principal" name="primaryColor" value={v.primaryColor} onChange={(c) => set("primaryColor", c)} hint="Destaques e logotipo sem imagem." />
            <ColorField label="Cor secundária" name="secondaryColor" value={v.secondaryColor} onChange={(c) => set("secondaryColor", c)} hint="Capa sem imagem e cards." />
            <ColorField label="Cor dos botões" name="buttonColor" value={v.buttonColor} onChange={(c) => set("buttonColor", c)} hint="O texto do botão se ajusta sozinho." />
          </div>
          {lowContrast && <Alert tone="warning">A cor principal ficou clara/escura demais para este fundo. Nos textos, o sistema vai ajustá-la um pouco para continuar legível.</Alert>}
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Estilo da página</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Fundo</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["DARK", "Escuro", "Destaca fotos e vídeos"], ["LIGHT", "Claro", "Leve e clássico"]] as const).map(([val, l, h]) => (
                <label key={val} className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-paper-line-2 bg-white p-3.5 has-[:checked]:border-brasa has-[:checked]:ring-2 has-[:checked]:ring-brasa/25">
                  <input type="radio" name="appearance" value={val} checked={v.appearance === val} onChange={() => set("appearance", val)} className="sr-only" />
                  <span className="font-semibold">{l}</span><span className="text-[13px] text-ink-muted">{h}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Cartões dos produtos</legend>
            <div className="grid grid-cols-3 gap-2">
              {([["ROUNDED", "Arredondado", "14px"], ["SQUARE", "Reto", "4px"], ["PILL", "Bem redondo", "24px"]] as const).map(([val, l, r]) => (
                <label key={val} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-paper-line-2 bg-white px-1.5 py-3.5 text-center has-[:checked]:border-brasa has-[:checked]:ring-2 has-[:checked]:ring-brasa/25">
                  <input type="radio" name="cardStyle" value={val} checked={v.cardStyle === val} onChange={() => set("cardStyle", val)} className="sr-only" />
                  <span className="h-9 w-14 border-2 border-ink" style={{ borderRadius: r }} />
                  <span className="text-[13px] font-semibold leading-tight sm:text-sm">{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-paper-line bg-gelo/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <span className="hidden text-sm text-ink-muted sm:inline">{dirty ? "Alterações não salvas" : "Tudo salvo"}</span>
          <button type="button" onClick={() => setShowPreview(true)} className="inline-flex h-12 items-center gap-2 rounded-xl border border-paper-line-2 px-4 text-[15px] font-semibold xl:hidden">
            <Icon name="eye" />Ver prévia
          </button>
          <SubmitButton pendingText="Salvando..." disabled={!dirty}>Salvar</SubmitButton>
        </div>
      </div>

      <aside
        className={showPreview ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" : "hidden xl:sticky xl:top-6 xl:block"}
        aria-label="Prévia do cardápio"
        role={showPreview ? "dialog" : undefined}
        aria-modal={showPreview || undefined}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className={`label-mono ${showPreview ? "text-gelo" : "text-ink-muted"}`}>{"// Prévia ao vivo"}</p>
          {showPreview && (
            <button type="button" onClick={() => setShowPreview(false)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-ink">
              <Icon name="close" size={18} />Voltar a editar
            </button>
          )}
        </div>
        <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[36px] border-[10px] border-grafite bg-grafite shadow-xl">
          <div className={`${showPreview ? "h-[calc(100dvh-110px)]" : "h-[680px]"} overflow-y-auto overscroll-contain rounded-[26px]`}>
            <MenuShell data={preview} className="min-h-full">
              <MenuView data={preview} preview />
            </MenuShell>
          </div>
        </div>
      </aside>
    </form>
  );
}
