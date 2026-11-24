"use client";
import { useActionState, useEffect, useRef } from "react";
import { createCategoryAction } from "./actions";
import { SubmitButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const SUGGESTIONS = ["Hambúrgueres", "Pizzas", "Pratos executivos", "Combos", "Porções", "Bebidas", "Sobremesas", "Açaí"];

export function CreateCategory({ existing }: { existing: string[] }) {
  const [state, action] = useActionState(createCategoryAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const suggestions = SUGGESTIONS.filter((s) => !existing.some((e) => e.toLowerCase() === s.toLowerCase()));
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label htmlFor="new-cat" className="text-sm font-medium">Nova categoria</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={inputRef} id="new-cat" name="name" required maxLength={40} placeholder="Ex.: Hambúrgueres" className="h-12 flex-1 rounded-xl border border-paper-line-2 bg-white px-3.5 focus:border-brasa focus:outline-none focus:ring-2 focus:ring-brasa/25" />
        <SubmitButton pendingText="Criando..."><Icon name="plus" />Criar categoria</SubmitButton>
      </div>
      {state?.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-muted">Sugestões:</span>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => { if (inputRef.current) { inputRef.current.value = s; inputRef.current.focus(); } }} className="h-9 rounded-full border border-paper-line-2 px-3 text-sm hover:bg-white">
              {s}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
