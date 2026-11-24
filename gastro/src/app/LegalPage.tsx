import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gelo">
      <header className="bg-grafite"><div className="mx-auto flex h-16 max-w-[820px] items-center px-4 sm:px-6"><Link href="/"><Logo size={26} /></Link></div></header>
      <main className="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-12 sm:px-6 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_p]:text-ink-muted [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:text-ink-muted">
        <h1 className="display text-[32px]">{title}</h1>
        <p className="text-sm">Última atualização: {updated}</p>
        {children}
      </main>
    </div>
  );
}

export const contact = () => process.env.NEXT_PUBLIC_CONTACT_EMAIL || "os canais oficiais de atendimento da Unlock Systems";
