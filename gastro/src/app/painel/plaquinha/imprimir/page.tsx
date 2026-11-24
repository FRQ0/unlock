import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireOwnerPanel } from "@/lib/session";
import { menuUrl } from "@/lib/urls";
import { Plaque } from "@/components/panel/Plaque";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Imprimir plaquinha" };

export default async function PrintPlaque() {
  const { tenant } = await requireOwnerPanel();
  const url = menuUrl(tenant.slug);
  const qrSvg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  return (
    <div className="flex flex-col items-center gap-6">
      <style>{`@page { size: 100mm 150mm; margin: 0 } @media print { body { background: #0D0F12 } .print-area { width: 100mm; height: 150mm } }`}</style>
      <div className="flex flex-col items-center gap-2 text-center print:hidden">
        <p className="text-[15px] text-ink-muted">Tamanho de impressão: 10 × 15 cm. Use papel fotográfico ou envie o PDF para a gráfica fazer em acrílico.</p>
        <PrintButton />
      </div>
      <div className="print-area flex w-full justify-center">
        <Plaque name={tenant.name} logoUrl={tenant.logoUrl} primary={tenant.primaryColor} qrSvg={qrSvg} url={url} />
      </div>
    </div>
  );
}
