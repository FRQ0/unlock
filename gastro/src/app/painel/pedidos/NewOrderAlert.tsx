"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
  } catch {}
}

/** Avisa (som + título da aba) quando chega pedido novo. */
export function NewOrderAlert({ newCount, latestId }: { newCount: number; latestId: string | null }) {
  const [sound, setSound] = useState(false);
  const last = useRef<string | null>(latestId);

  useEffect(() => {
    try { setSound(localStorage.getItem("ug_order_sound") === "1"); } catch {}
  }, []);

  useEffect(() => {
    document.title = newCount ? `(${newCount}) Novos pedidos · Unlock Gastro` : "Pedidos · Unlock Gastro";
    if (latestId && latestId !== last.current) {
      if (sound) beep();
      if ("vibrate" in navigator) navigator.vibrate?.(200);
    }
    last.current = latestId;
  }, [newCount, latestId, sound]);

  const toggle = () => {
    const v = !sound;
    setSound(v);
    try { localStorage.setItem("ug_order_sound", v ? "1" : "0"); } catch {}
    if (v) beep();
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={sound} className={`inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold ${sound ? "border-[#C9E68A] bg-[#E9F8C4] text-[#2F4700]" : "border-paper-line-2 hover:bg-black/5"}`}>
      <Icon name={sound ? "sound" : "mute"} />{sound ? "Som ligado" : "Ligar som de pedido novo"}
    </button>
  );
}
