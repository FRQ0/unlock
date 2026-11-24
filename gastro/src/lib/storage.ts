import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export type UploadKind = "image" | "video";

export function storageDriver(): "local" | "vercel-blob" {
  return process.env.STORAGE_DRIVER === "vercel-blob" ? "vercel-blob" : "local";
}

/** Confere a assinatura real do arquivo (não confia só na extensão/tipo enviado). */
export function sniffMime(buf: Uint8Array): string | null {
  const hex = (a: number, b: number) => Buffer.from(buf.slice(a, b)).toString("hex");
  if (hex(0, 3) === "ffd8ff") return "image/jpeg";
  if (hex(0, 8) === "89504e470d0a1a0a") return "image/png";
  if (hex(0, 4) === "52494646" && Buffer.from(buf.slice(8, 12)).toString() === "WEBP") return "image/webp";
  if (Buffer.from(buf.slice(4, 8)).toString() === "ftyp") {
    const brand = Buffer.from(buf.slice(8, 12)).toString();
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  if (hex(0, 4) === "1a45dfa3") return "video/webm";
  return null;
}

export function validateUpload(kind: UploadKind, mime: string, size: number): string | null {
  const types = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!types[mime]) return kind === "image" ? "Use uma foto JPG, PNG ou WEBP." : "Use um vídeo MP4, WEBM ou MOV.";
  if (size > max) return kind === "image" ? "A foto pode ter no máximo 5 MB." : "O vídeo pode ter no máximo 60 MB.";
  if (size <= 0) return "Arquivo vazio.";
  return null;
}

export function objectKey(tenantId: string, kind: UploadKind, mime: string) {
  const ext = (kind === "image" ? IMAGE_TYPES : VIDEO_TYPES)[mime];
  return `t/${tenantId}/${kind}/${crypto.randomUUID()}.${ext}`;
}

/** Gravação local (desenvolvimento / servidor próprio). Na Vercel o envio vai direto ao Blob. */
export async function saveLocal(key: string, data: Uint8Array): Promise<string> {
  const full = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return `/uploads/${key}`;
}

/** A URL pertence a este estabelecimento? (impede usar mídia de outro cliente) */
export function urlBelongsToTenant(url: string, tenantId: string): boolean {
  const marker = `/t/${tenantId}/`;
  if (url.startsWith("/uploads/")) return url.startsWith(`/uploads${marker}`);
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith(marker);
  } catch {
    return false;
  }
}
