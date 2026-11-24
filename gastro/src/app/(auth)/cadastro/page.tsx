import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Criar conta" };
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/^https?:\/\//, "");
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="label-mono text-ink-muted">{"// Passo 1 de 2 · Sua conta"}</span>
        <h1 className="display text-[30px]">Cadastre seu estabelecimento</h1>
        <p className="text-[15px] text-ink-muted">Leva 2 minutos. Depois você escolhe as cores, cadastra os produtos e publica.</p>
      </div>
      <SignupForm
        plans={plans.map((p) => ({ code: p.code, name: p.name, headline: p.headline, priceCents: p.priceCents }))}
        defaultPlan={plans.some((p) => p.code === plano) ? plano! : plans[0]?.code}
        host={appUrl || "unlockgastro.com.br"}
      />
      <p className="text-[15px] text-ink-muted">
        Já tem conta? <Link href="/entrar" className="font-semibold text-brasa-ink underline-offset-4 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
