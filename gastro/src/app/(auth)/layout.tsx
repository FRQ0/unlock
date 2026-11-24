import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gelo lg:flex-row">
      <aside className="grid-bg relative flex flex-col justify-between gap-8 bg-grafite px-6 py-8 text-gelo lg:w-[44%] lg:px-14 lg:py-12">
        <Link href="/" aria-label="Voltar para a página inicial"><Logo /></Link>
        <div className="hidden flex-col gap-5 lg:flex">
          <p className="display text-[40px] leading-[1.05]">A gente destrava<br />o seu cardápio.</p>
          <p className="max-w-md text-[15px] leading-relaxed text-muted">Cardápio digital com a sua marca, feed de vídeos dos seus pratos, pedidos no painel e plaquinha NFC na mesa.</p>
        </div>
        <span className="label-mono hidden text-muted lg:block">Uma plataforma Unlock Systems</span>
      </aside>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 lg:items-center">
        <div className="w-full max-w-[520px]">{children}</div>
      </main>
    </div>
  );
}
