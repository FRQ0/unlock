import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { panelContextOrNull } from "@/lib/session";
import { menuUrl } from "@/lib/urls";

// QR Code exclusivo do estabelecimento logado (PNG para imprimir ou SVG para gráfica).
export async function GET(req: Request) {
  const ctx = await panelContextOrNull();
  if (!ctx) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const url = menuUrl(ctx.tenant.slug);
  const file = `qrcode-${ctx.tenant.slug}.${format}`;
  const headers = { "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" };
  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#0D0F12", light: "#FFFFFF" } });
    return new NextResponse(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width: 1200, color: { dark: "#0D0F12", light: "#FFFFFF" } });
  return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
