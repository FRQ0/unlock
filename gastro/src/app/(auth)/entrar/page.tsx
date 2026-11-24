import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="label-mono text-ink-muted">{"// Acesso ao painel"}</span>
        <h1 className="display text-[30px]">Entrar</h1>
        <p className="text-[15px] text-ink-muted">Use o e-mail e a senha cadastrados.</p>
      </div>
      <LoginForm next={next} initialError={erro === "conta" ? "Esta conta não está disponível. Fale com a Unlock." : undefined} />
      <p className="text-[15px] text-ink-muted">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brasa-ink underline-offset-4 hover:underline">Cadastre seu estabelecimento</Link>
      </p>
    </div>
  );
}
