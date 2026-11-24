import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireOwnerPanel } from "@/lib/session";
import { menuUrl } from "@/lib/urls";
import { Card, PageHeader } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CopyButton } from "@/components/panel/CopyButton";
import { Plaque } from "@/components/panel/Plaque";

export const metadata: Metadata = { title: "Minha plaquinha" };

export default async function PlaquePage() {
  const { tenant } = await requireOwnerPanel();
  const url = menuUrl(tenant.slug);
  const qrSvg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0D0F12", light: "#FFFFFF" } });
  const live = tenant.status === "ACTIVE" && tenant.published;

  return (
    <>
      <PageHeader kicker="Minha plaquinha" title="Minha plaquinha" subtitle="Seu link exclusivo, o QR Code e como gravar a etiqueta NFC." />
      {!live && <p className="rounded-xl border border-[#F1D98A] bg-[#FDF0C7] px-4 py-3 text-sm text-[#5C3F00]">O link já é definitivo, mas o cardápio só abre para o público depois de publicado e com a assinatura ativa.</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Seu link exclusivo</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex h-12 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-xl bg-gelo px-4 font-mono text-sm">{url}</code>
              <div className="flex gap-2"><CopyButton text={url} /><LinkButton href={`/${tenant.slug}`} target="_blank" variant="secondary"><Icon name="eye" />Abrir</LinkButton></div>
            </div>
            <p className="text-[13px] text-ink-muted">Esse link nunca muda. Pode trocar produtos, preços e cores à vontade: a plaquinha continua funcionando.</p>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">QR Code</h2>
            <div className="flex flex-wrap items-center gap-5">
              <div className="w-40 rounded-xl border border-paper-line bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="flex flex-col gap-2">
                <a href="/api/painel/qrcode?format=png" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brasa px-5 font-semibold text-grafite hover:bg-[#FF8259]"><Icon name="download" />Baixar PNG</a>
                <a href="/api/painel/qrcode?format=svg" className="inline-flex h-12 items-center gap-2 rounded-xl border border-paper-line-2 px-5 font-semibold hover:bg-black/5"><Icon name="download" />Baixar SVG (gráfica)</a>
              </div>
            </div>
            <p className="text-[13px] text-ink-muted">Para impressão, deixe o QR com pelo menos 3 cm de lado. Ele é a alternativa para celulares sem NFC.</p>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Como gravar a etiqueta NFC</h2>
            <p className="text-[15px] text-ink-muted">A plaquinha tem uma etiqueta NFC física colada atrás. Ela é gravada uma vez com o seu link. Quando o cliente aproxima o celular, o aparelho abre o cardápio.</p>
            <ol className="flex flex-col gap-3">
              {[
                ["Compre etiquetas NFC NTAG213 (ou NTAG215/216).", "São baratas e vendidas em lojas online. A NTAG213 tem espaço de sobra para o link."],
                ["Instale um app de gravação no celular.", "Ex.: NFC Tools (Android e iPhone). No iPhone, a gravação funciona do iPhone 7 em diante."],
                ["No app, escolha Gravar → Adicionar registro → URL/Link.", `Cole o seu link: ${url}`],
                ["Encoste o celular na etiqueta e confirme a gravação.", "Teste aproximando outro celular: o cardápio deve abrir."],
                ["Opcional: bloqueie a etiqueta contra regravação.", "No app, use “Bloquear/Lock”. Atenção: depois disso não dá para mudar o link (e nem precisa, ele é fixo)."],
              ].map(([t, d], i) => (
                <li key={i} className="flex gap-3">
                  <span className="label-mono flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brasa-soft !text-[11px] text-[#9A2E0B]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex flex-col gap-0.5"><strong className="font-semibold">{t}</strong><span className="text-[14px] text-ink-muted [overflow-wrap:break-word]">{d}</span></span>
                </li>
              ))}
            </ol>
            <p className="rounded-xl bg-gelo px-4 py-3 text-[13px] text-ink-muted">Celulares com NFC desligado ou sem NFC não abrem pela aproximação. Por isso a plaquinha sempre traz o QR Code também.</p>
          </Card>
        </div>

        <aside className="flex flex-col items-center gap-4 lg:sticky lg:top-6">
          <span className="label-mono self-start text-ink-muted">{"// Prévia da plaquinha"}</span>
          <Plaque name={tenant.name} logoUrl={tenant.logoUrl} primary={tenant.primaryColor} qrSvg={qrSvg} url={url} />
          <LinkButton href="/painel/plaquinha/imprimir" target="_blank" variant="secondary" className="w-full max-w-[340px]">Abrir versão para imprimir</LinkButton>
        </aside>
      </div>
    </>
  );
}
