"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza os dados da página a cada N segundos (só com a aba visível). */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
