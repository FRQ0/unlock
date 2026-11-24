"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
      }}
      className="inline-flex h-12 items-center gap-2 rounded-xl border border-paper-line-2 px-4 text-[15px] font-semibold hover:bg-black/5"
    >
      <Icon name={done ? "check" : "copy"} />{done ? "Copiado!" : label}
    </button>
  );
}
