import { LogoMark } from "@/components/ui/Logo";

/** Desenho da plaquinha de mesa (usado na prévia e na página de impressão). */
export function Plaque({ name, logoUrl, primary, qrSvg, url }: { name: string; logoUrl: string | null; primary: string; qrSvg: string; url: string }) {
  return (
    <div className="relative flex aspect-[2/3] w-full max-w-[340px] flex-col items-center gap-4 rounded-[28px] bg-grafite px-7 pb-6 pt-9 text-gelo shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
      <span className="absolute top-4 h-2.5 w-2.5 rounded-full bg-carvao" aria-hidden="true" />
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl" style={{ background: primary }}>
        {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="display text-xl text-grafite">{name.slice(0, 2)}</span>}
      </div>
      <span className="display text-center text-[19px] leading-tight">{name}</span>
      <div className="flex flex-col items-center gap-1.5">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" fill="none" strokeWidth="3" strokeLinecap="round">
          <rect x="22" y="14" width="20" height="36" rx="5" stroke="#F4F4EF" />
          <g stroke="#FF6A3D"><path d="M48 22a14 14 0 0 1 0 20" /><path d="M54 16a22 22 0 0 1 0 32" /><path d="M16 22a14 14 0 0 0 0 20" /><path d="M10 16a22 22 0 0 0 0 32" /></g>
        </svg>
        <span className="display text-center text-[17px] leading-tight">Aproxime o<br />celular aqui</span>
      </div>
      <div className="flex w-full items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-line" /><span className="label-mono !text-[10px]">ou escaneie</span><span className="h-px flex-1 bg-line" /></div>
      <div className="w-[46%] rounded-xl bg-white p-1.5 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <span className="mt-auto flex items-center gap-1.5 break-all text-center text-[10px] text-muted"><LogoMark tone="light" size={11} />{url.replace(/^https?:\/\//, "")}</span>
    </div>
  );
}
