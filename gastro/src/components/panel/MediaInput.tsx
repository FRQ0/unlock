"use client";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Props = {
  name: string;
  label: string;
  kind: "image" | "video";
  defaultValue?: string | null;
  driver: "local" | "vercel-blob";
  tenantId: string;
  hint?: string;
  aspect?: "square" | "wide" | "tall";
  disabled?: boolean;
  disabledReason?: string;
  onChange?: (url: string) => void;
};

const MAX = { image: 5 * 1024 * 1024, video: 60 * 1024 * 1024 };
const ACCEPT = { image: "image/jpeg,image/png,image/webp", video: "video/mp4,video/webm,video/quicktime" };

/** Reduz a foto para no máx. 1600 px e remove metadados (EXIF/GPS) antes de enviar. */
async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === "image/png") return file; // mantém transparência do logotipo
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.86));
}

export function MediaInput({ name, label, kind, defaultValue, driver, tenantId, hint, aspect = "wide", disabled, disabledReason, onChange }: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (v: string) => {
    setUrl(v);
    onChange?.(v);
  };

  async function handle(file: File) {
    setError(null);
    if (file.size > MAX[kind]) return setError(kind === "image" ? "A foto pode ter no máximo 5 MB." : "O vídeo pode ter no máximo 60 MB.");
    if (!ACCEPT[kind].split(",").includes(file.type)) return setError(kind === "image" ? "Use JPG, PNG ou WEBP." : "Use MP4, WEBM ou MOV.");
    setBusy(true);
    try {
      const blob = kind === "image" ? await shrinkImage(file) : file;
      if (driver === "vercel-blob") {
        const { upload } = await import("@vercel/blob/client");
        const type = blob.type || file.type;
        const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[type] ?? "bin";
        const res = await upload(`t/${tenantId}/${kind}/${crypto.randomUUID()}.${ext}`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload/blob",
          contentType: type,
          onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
        });
        update(res.url);
      } else {
        const fd = new FormData();
        fd.append("file", blob, file.name);
        fd.append("kind", kind);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
        update(data.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box = aspect === "square" ? "aspect-square w-32" : aspect === "tall" ? "aspect-[9/16] w-40" : "aspect-[16/9] w-full max-w-sm";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-end gap-4">
        <div className={`${box} relative overflow-hidden rounded-xl border border-paper-line bg-gelo`}>
          {url ? (
            kind === "image" ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={url} className="h-full w-full object-cover" muted loop playsInline autoPlay />
            )
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
              <Icon name={kind === "image" ? "image" : "video"} size={26} />
              <span className="text-xs">{kind === "image" ? "Sem foto" : "Sem vídeo"}</span>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-semibold">
              {progress != null ? `${progress}%` : "Enviando..."}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-paper-line-2 px-3.5 text-sm font-semibold hover:bg-black/5 ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}>
            <Icon name="upload" size={18} />
            {url ? "Trocar" : "Enviar"}
            <input ref={inputRef} type="file" accept={ACCEPT[kind]} className="sr-only" disabled={disabled || busy} onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
          </label>
          {url && !disabled && (
            <button type="button" onClick={() => update("")} className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-brasa-ink hover:bg-brasa-soft/60">
              <Icon name="trash" size={18} />Remover
            </button>
          )}
        </div>
      </div>
      {error ? <span role="alert" className="text-sm text-red-700">{error}</span> : disabled && disabledReason ? <span className="text-[13px] text-ink-muted">{disabledReason}</span> : hint ? <span className="text-[13px] text-ink-muted">{hint}</span> : null}
    </div>
  );
}
