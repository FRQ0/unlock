import Link from "next/link";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { parseFeatures } from "@/lib/plans";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "video", title: "Feed de vídeos", text: "Seus pratos em vídeo vertical, um depois do outro. O cliente desliza, dá vontade e pede ali mesmo." },
  { icon: "palette", title: "Com a sua marca", text: "Logotipo, capa, cores e estilo dos cartões. Cada cardápio é único, sem mexer em código." },
  { icon: "cutlery", title: "Variações e adicionais", text: "Tamanhos de pizza, sabores, ponto da carne, acompanhamentos e extras com preço." },
  { icon: "bag", title: "Pedidos no painel", text: "Mesa, retirada ou entrega. Os pedidos chegam na hora, com aviso sonoro." },
  { icon: "nfc", title: "Plaquinha NFC + QR", text: "O cliente aproxima o celular da plaquinha e o cardápio abre. O QR Code é o plano B." },
  { icon: "dashboard", title: "Painel simples", text: "Feito para quem não é técnico: trocar preço ou esgotar um produto leva segundos." },
];

const FAQ: [string, string][] = [
  ["O cliente precisa baixar algum aplicativo?", "Não. O cardápio abre no navegador do celular, pela plaquinha NFC, pelo QR Code ou pelo link."],
  ["A aproximação (NFC) funciona em todo celular?", "Funciona na maioria dos celulares atuais com NFC ligado. Para os outros, a plaquinha traz o QR Code, que abre o mesmo cardápio."],
  ["Posso mudar preços e produtos quando quiser?", "Sim. No plano Básico você mesmo altera pelo painel. No Completo, a equipe Unlock faz para você — e você também pode mexer."],
  ["Como funciona o pagamento dos pedidos?", "Por enquanto, o pagamento dos pedidos é combinado no local (dinheiro, Pix ou maquininha). O cardápio organiza e envia o pedido para o seu painel."],
  ["E se eu trocar de cores ou de logo, preciso refazer a plaquinha?", "Não. O link do seu cardápio é fixo, então a plaquinha continua funcionando para sempre."],
];

export default async function Landing() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="bg-grafite text-gelo">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-grafite/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Unlock Gastro"><Logo size={28} /></Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <a href="#planos" className="hidden h-11 items-center rounded-xl px-3 text-[15px] text-[#C9CED6] hover:text-gelo sm:inline-flex">Planos</a>
            <Link href="/entrar" className="inline-flex h-11 items-center rounded-xl px-3 text-[15px] text-[#C9CED6] hover:text-gelo">Entrar</Link>
            <Link href="/cadastro" className="inline-flex h-11 items-center rounded-xl bg-brasa px-4 text-[15px] font-semibold text-grafite hover:bg-[#FF8259]">Criar conta</Link>
          </nav>
        </div>
      </header>

      <section className="grid-bg relative overflow-hidden">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="flex flex-col gap-7">
            <span className="label-mono text-ciano">{"// Cardápio digital para gastronomia"}</span>
            <h1 className="display text-[44px] leading-[0.98] sm:text-[64px]">A gente destrava<br />o seu <span className="text-brasa">cardápio.</span></h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">Cardápio com a sua marca, feed de vídeos dos seus pratos, pedidos direto no painel e plaquinha NFC na mesa. Para hamburguerias, pizzarias, restaurantes, bares, cafeterias e açaiterias.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cadastro" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-brasa px-6 text-base font-semibold text-grafite hover:bg-[#FF8259]">Criar minha conta<Icon name="chevronRight" /></Link>
              <a href="#como-funciona" className="inline-flex h-14 items-center rounded-2xl border border-line-2 px-6 text-base font-semibold hover:bg-carvao">Como funciona</a>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Sem aplicativo", "Sem programador", "Link fixo para sempre"].map((t) => (
                <span key={t} className="label-mono rounded-full border border-line px-3 py-2 !text-[11px] text-[#C9CED6]">● {t}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px]" aria-hidden="true">
            <div className="absolute -inset-10 rounded-full bg-brasa/20 blur-3xl" />
            <div className="relative aspect-[9/19] overflow-hidden rounded-[44px] border-[10px] border-[#05070A] bg-black shadow-2xl">
              <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 42%, #9A4A18 0%, #4A200C 38%, #120A07 78%)" }} />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-6 text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40"><Icon name="back" size={18} /></span>
                <span className="text-sm font-bold">Seu estabelecimento</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40"><Icon name="bag" size={18} /></span>
              </div>
              <div className="absolute left-1/2 top-[40%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-white/60">
                <Icon name="play" size={36} />
                <span className="label-mono !text-[10px]">vídeo do seu prato</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-7 pt-20 text-white">
                <span className="label-mono self-start rounded-full bg-white/15 px-2.5 py-1 !text-[10px]">Destaque da casa</span>
                <span className="display text-[22px] leading-none">Seu prato<br />mais pedido</span>
                <span className="text-[13px] text-white/75">Descrição curta e apetitosa do produto.</span>
                <span className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-brasa text-sm font-bold text-grafite"><Icon name="plus" size={18} />Adicionar ao pedido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="label-mono text-ciano">{"// Como funciona"}</span>
          <h2 className="display text-[32px] sm:text-[40px]">No ar em três passos</h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Crie sua conta", "Cadastre o estabelecimento, escolha o endereço do cardápio e o plano."],
            ["Monte o cardápio", "Coloque logo, cores, produtos, fotos e vídeos. A prévia mostra tudo antes de publicar."],
            ["Coloque a plaquinha", "Baixe o QR Code, grave a etiqueta NFC e pronto: o cliente aproxima e pede."],
          ].map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-3 rounded-3xl border border-line bg-grafite-2 p-6">
              <span className="label-mono text-brasa">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-grafite-2">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="label-mono text-ciano">{"// Recursos"}</span>
            <h2 className="display text-[32px] sm:text-[40px]">Tudo que o seu cardápio precisa</h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex flex-col gap-3 rounded-3xl border border-line bg-grafite p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-carvao text-brasa"><Icon name={f.icon} size={24} /></span>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="planos" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="label-mono text-ciano">{"// Planos"}</span>
          <h2 className="display text-[32px] sm:text-[40px]">Você faz ou a gente faz</h2>
          <p className="text-[17px] text-muted">No Básico, você monta tudo pelo painel. No Completo, a equipe Unlock cuida do seu cardápio inteiro, com vídeos 3D dos seus produtos.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {plans.map((p) => {
            const f = parseFeatures(p.features);
            const hl = f.managedByUnlock;
            return (
              <article key={p.id} className={`relative flex flex-col gap-6 rounded-3xl border p-7 ${hl ? "border-brasa bg-carvao" : "border-line bg-grafite-2"}`}>
                {hl && <span className="label-mono absolute -top-3 left-7 rounded-full bg-brasa px-3 py-1.5 !text-[11px] font-semibold text-grafite">Mais completo</span>}
                <div className="flex flex-col gap-2">
                  <h3 className="display text-[26px]">{p.name}</h3>
                  {p.headline && <p className="text-[15px] text-muted">{p.headline}</p>}
                </div>
                <p className="flex items-baseline gap-1.5">
                  {p.priceCents != null ? (
                    <><span className="display text-[40px] tabular-nums">{formatBRL(p.priceCents)}</span><span className="text-muted">/mês</span></>
                  ) : (
                    <span className="display text-[28px]">Sob consulta</span>
                  )}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {p.highlights.map((h) => <li key={h} className="flex items-start gap-2.5 text-[15px]"><Icon name="check" size={18} className={`mt-0.5 ${hl ? "text-brasa" : "text-limao"}`} />{h}</li>)}
                </ul>
                <Link href={`/cadastro?plano=${p.code}`} className={`mt-auto inline-flex h-14 items-center justify-center rounded-2xl text-base font-semibold ${hl ? "bg-brasa text-grafite hover:bg-[#FF8259]" : "border border-line-2 hover:bg-carvao"}`}>
                  Começar com o {p.name}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[860px] flex-col gap-8 px-4 py-20 sm:px-6">
          <h2 className="display text-[32px] sm:text-[40px]">Perguntas frequentes</h2>
          <div className="flex flex-col divide-y divide-line rounded-3xl border border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                  {q}<Icon name="chevronDown" className="transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="grid-bg border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-20 sm:px-6">
          <h2 className="display text-[36px] leading-none sm:text-[52px]">Seu cardápio no ar hoje.</h2>
          <p className="text-lg text-muted">Sem programador, sem complicação.</p>
          <Link href="/cadastro" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-brasa px-6 text-base font-semibold text-grafite hover:bg-[#FF8259]">Criar minha conta<Icon name="chevronRight" /></Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2"><LogoMark size={18} /> Unlock Gastro · uma plataforma Unlock Systems</span>
          <nav className="flex flex-wrap gap-4" aria-label="Rodapé">
            <Link href="/privacidade" className="hover:text-gelo">Privacidade</Link>
            <Link href="/termos" className="hover:text-gelo">Termos de uso</Link>
            <Link href="/entrar" className="hover:text-gelo">Entrar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
