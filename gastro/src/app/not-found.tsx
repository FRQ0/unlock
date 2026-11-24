import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="grid-bg flex min-h-dvh flex-col items-center justify-center gap-6 bg-grafite px-6 text-center text-gelo">
      <Logo />
      <h1 className="display text-[32px]">Página não encontrada</h1>
      <p className="max-w-md text-muted">Confira o endereço. Se você veio por uma plaquinha ou QR Code, o cardápio pode estar temporariamente fora do ar.</p>
      <Link href="/" className="inline-flex h-12 items-center rounded-xl bg-brasa px-5 font-semibold text-grafite">Ir para o início</Link>
    </main>
  );
}
