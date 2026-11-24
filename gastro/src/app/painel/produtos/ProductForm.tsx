"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProductAction } from "./actions";
import { Field, Select, TextArea, Toggle } from "@/components/ui/Field";
import { buttonClass, SubmitButton } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { MediaInput } from "@/components/panel/MediaInput";

export type OptionDraft = { id?: string; key: string; name: string; price: string; available: boolean };
export type GroupDraft = { id?: string; key: string; name: string; type: "SINGLE" | "MULTIPLE"; required: boolean; maxSelect: number; options: OptionDraft[] };

export type ProductInitial = {
  id?: string;
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  videoUrl: string;
  available: boolean;
  featured: boolean;
  groups: GroupDraft[];
};

let seq = 0;
const k = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;
const opt = (name: string, price = ""): OptionDraft => ({ key: k(), name, price, available: true });

const TEMPLATES: { label: string; make: () => GroupDraft }[] = [
  { label: "Tamanhos", make: () => ({ key: k(), name: "Tamanho", type: "SINGLE", required: true, maxSelect: 1, options: [opt("Pequena"), opt("Média", "10,00"), opt("Grande", "20,00")] }) },
  { label: "Sabores", make: () => ({ key: k(), name: "Sabores", type: "MULTIPLE", required: true, maxSelect: 2, options: [opt("Sabor 1"), opt("Sabor 2")] }) },
  { label: "Adicionais", make: () => ({ key: k(), name: "Adicionais", type: "MULTIPLE", required: false, maxSelect: 0, options: [opt("Bacon", "5,00"), opt("Queijo extra", "4,00")] }) },
  { label: "Ponto da carne", make: () => ({ key: k(), name: "Ponto da carne", type: "SINGLE", required: true, maxSelect: 1, options: [opt("Mal passado"), opt("Ao ponto"), opt("Bem passado")] }) },
  { label: "Acompanhamentos", make: () => ({ key: k(), name: "Acompanhamento", type: "SINGLE", required: true, maxSelect: 1, options: [opt("Arroz e feijão"), opt("Salada"), opt("Fritas")] }) },
  { label: "Grupo em branco", make: () => ({ key: k(), name: "", type: "MULTIPLE", required: false, maxSelect: 0, options: [opt("")] }) },
];

type Props = {
  initial: ProductInitial;
  categories: { id: string; name: string }[];
  driver: "local" | "vercel-blob";
  tenantId: string;
  videoEnabled: boolean;
};

export function ProductForm({ initial, categories, driver, tenantId, videoEnabled }: Props) {
  const [state, action] = useActionState(saveProductAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const [groups, setGroups] = useState<GroupDraft[]>(initial.groups);

  const setGroup = (key: string, patch: Partial<GroupDraft>) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const setOption = (gk: string, ok: string, patch: Partial<OptionDraft>) =>
    setGroups((gs) => gs.map((g) => (g.key === gk ? { ...g, options: g.options.map((o) => (o.key === ok ? { ...o, ...patch } : o)) } : g)));
  const moveGroup = (i: number, d: number) =>
    setGroups((gs) => { const c = [...gs]; const j = i + d; if (j < 0 || j >= c.length) return gs; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const payload = JSON.stringify(
    groups.map(({ id, name, type, required, maxSelect, options }) => ({
      id, name, type, required, maxSelect: type === "SINGLE" ? 1 : maxSelect,
      options: options.map(({ id: oid, name: on, price, available }) => ({ id: oid, name: on, price, available })),
    })),
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" defaultValue={initial.id ?? ""} />
      <input type="hidden" name="groups" value={payload} />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Informações</h2>
          <Field label="Nome do produto" name="name" required maxLength={80} defaultValue={initial.name} error={fe.name} placeholder="Ex.: X-Bacon da Casa" />
          <TextArea label="Descrição" name="description" maxLength={600} defaultValue={initial.description} error={fe.description} placeholder="Ingredientes, tamanho, o que acompanha..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preço (R$)" name="price" inputMode="decimal" required defaultValue={initial.price} error={fe.price} placeholder="0,00" hint="Preço base. Tamanhos e adicionais somam a este valor." />
            <Select label="Categoria" name="categoryId" defaultValue={initial.categoryId} error={fe.categoryId}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          {categories.length === 0 && (
            <p className="text-[13px] text-ink-muted">Você ainda não tem categorias. <Link href="/painel/categorias" className="font-semibold text-brasa-ink underline">Criar categorias</Link></p>
          )}
          <Toggle label="Disponível" hint="Desligue quando o produto acabar. Ele some do cardápio até você religar." name="available" defaultChecked={initial.available} />
          <Toggle label="Destaque" hint="Aparece no topo do cardápio, em “Destaques da casa”." name="featured" defaultChecked={initial.featured} />
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Foto e vídeo</h2>
          <MediaInput name="imageUrl" label="Foto do produto" kind="image" defaultValue={initial.imageUrl} driver={driver} tenantId={tenantId} hint="JPG, PNG ou WEBP até 5 MB. Prefira foto bem iluminada, de cima ou 45°." />
          {fe.imageUrl && <span className="text-sm text-red-700">{fe.imageUrl}</span>}
          <MediaInput
            name="videoUrl" label="Vídeo curto (feed)" kind="video" aspect="tall" defaultValue={initial.videoUrl} driver={driver} tenantId={tenantId}
            disabled={!videoEnabled}
            disabledReason="O feed de vídeos faz parte do plano Completo. Nele, a equipe Unlock produz os vídeos 3D dos seus produtos."
            hint="Vertical (9:16), até 60 MB, de 5 a 15 segundos. Toca sem som, em repetição."
          />
          {fe.videoUrl && <span className="text-sm text-red-700">{fe.videoUrl}</span>}
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Variações e adicionais</h2>
          <p className="text-[15px] text-ink-muted">Tamanhos, sabores, ponto da carne, acompanhamentos ou extras. Escolha um modelo e ajuste.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.label} type="button" onClick={() => setGroups((g) => [...g, t.make()])} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-paper-line-2 px-3.5 text-sm font-medium hover:bg-gelo">
              <Icon name="plus" size={16} />{t.label}
            </button>
          ))}
        </div>
        {fe.groups && <Alert tone="error">{fe.groups}</Alert>}

        {groups.map((g, gi) => (
          <fieldset key={g.key} className="flex flex-col gap-3 rounded-2xl border border-paper-line bg-gelo/60 p-4">
            <legend className="sr-only">Grupo {gi + 1}</legend>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium">Nome do grupo</span>
                <input value={g.name} onChange={(e) => setGroup(g.key, { name: e.target.value })} maxLength={40} placeholder="Ex.: Tamanho" className="h-11 rounded-xl border border-paper-line-2 bg-white px-3 focus:border-brasa focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">O cliente escolhe</span>
                <select value={g.type} onChange={(e) => setGroup(g.key, { type: e.target.value as GroupDraft["type"] })} className="h-11 rounded-xl border border-paper-line-2 bg-white px-3">
                  <option value="SINGLE">Só uma opção</option>
                  <option value="MULTIPLE">Várias opções</option>
                </select>
              </label>
              {g.type === "MULTIPLE" && (
                <label className="flex w-28 flex-col gap-1.5">
                  <span className="text-sm font-medium">Máximo</span>
                  <input type="number" min={0} max={50} value={g.maxSelect} onChange={(e) => setGroup(g.key, { maxSelect: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className="h-11 rounded-xl border border-paper-line-2 bg-white px-3" aria-describedby={`max-${g.key}`} />
                </label>
              )}
              <label className="flex h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={g.required} onChange={(e) => setGroup(g.key, { required: e.target.checked })} className="h-5 w-5 accent-[#FF6A3D]" />
                Obrigatório
              </label>
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => moveGroup(gi, -1)} disabled={gi === 0} aria-label="Subir grupo" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30"><Icon name="arrowUp" size={18} /></button>
                <button type="button" onClick={() => moveGroup(gi, 1)} disabled={gi === groups.length - 1} aria-label="Descer grupo" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30"><Icon name="arrowDown" size={18} /></button>
                <button type="button" onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))} aria-label="Remover grupo" className="flex h-10 w-10 items-center justify-center rounded-lg text-brasa-ink hover:bg-white"><Icon name="trash" size={18} /></button>
              </div>
            </div>
            {g.type === "MULTIPLE" && <span id={`max-${g.key}`} className="-mt-1 text-[13px] text-ink-muted">Máximo 0 = sem limite.</span>}

            <ul className="flex flex-col gap-2">
              {g.options.map((o) => (
                <li key={o.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2">
                  <input aria-label="Nome da opção" value={o.name} onChange={(e) => setOption(g.key, o.key, { name: e.target.value })} maxLength={60} placeholder="Nome da opção" className="h-10 min-w-[140px] flex-1 rounded-lg border border-paper-line px-3 focus:border-brasa focus:outline-none" />
                  <span className="flex items-center gap-1 text-sm text-ink-muted">
                    + R$
                    <input aria-label="Valor adicional" value={o.price} onChange={(e) => setOption(g.key, o.key, { price: e.target.value })} inputMode="decimal" placeholder="0,00" className="h-10 w-24 rounded-lg border border-paper-line px-2 text-ink focus:border-brasa focus:outline-none" />
                  </span>
                  <label className="flex h-10 items-center gap-1.5 px-1 text-sm">
                    <input type="checkbox" checked={o.available} onChange={(e) => setOption(g.key, o.key, { available: e.target.checked })} className="h-4 w-4 accent-[#7DB100]" />
                    Disponível
                  </label>
                  <button type="button" onClick={() => setGroup(g.key, { options: g.options.filter((x) => x.key !== o.key) })} disabled={g.options.length === 1} aria-label="Remover opção" className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-gelo disabled:opacity-30"><Icon name="close" size={18} /></button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setGroup(g.key, { options: [...g.options, opt("")] })} className="self-start text-sm font-semibold text-brasa-ink hover:underline">+ Adicionar opção</button>
          </fieldset>
        ))}
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-paper-line bg-gelo/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <Link href="/painel/produtos" className={buttonClass("secondary")}>Cancelar</Link>
        <SubmitButton pendingText="Salvando...">{initial.id ? "Salvar alterações" : "Cadastrar produto"}</SubmitButton>
      </div>
    </form>
  );
}
