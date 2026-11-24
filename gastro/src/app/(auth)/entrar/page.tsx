import type { Metadata } from "next";
import { unlockContactUrl } from "@/lib/contact";
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
        O acesso é criado pela Unlock. Ainda não é cliente? <a href={unlockContactUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-brasa-ink underline-offset-4 hover:underline">Fale com a gente</a>
      </p>
    </div>
  );
}
