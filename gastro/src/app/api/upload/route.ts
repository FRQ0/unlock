import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { panelContextOrNull, tenantFeatures } from "@/lib/session";
import { isSameOrigin } from "@/lib/same-origin";
import { objectKey, saveLocal, sniffMime, storageDriver, validateUpload, type UploadKind } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Envio local (desenvolvimento ou servidor próprio). Na Vercel use STORAGE_DRIVER=vercel-blob.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  if (storageDriver() !== "local") return NextResponse.json({ error: "Envio local desativado." }, { status: 400 });
  const ctx = await panelContextOrNull();
  if (!ctx) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });
  if (!rateLimit(`upload:${ctx.tenant.id}`, 60, 10 * 60_000)) return NextResponse.json({ error: "Muitos envios seguidos. Aguarde um pouco." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") as UploadKind;
  if (!(file instanceof File) || (kind !== "image" && kind !== "video")) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });

  if (kind === "video" && !(await tenantFeatures(ctx.tenant.id)).videoFeed) {
    return NextResponse.json({ error: "Vídeos fazem parte do plano Completo." }, { status: 403 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  const err = validateUpload(kind, mime ?? "", bytes.byteLength);
  if (err || !mime) return NextResponse.json({ error: err ?? "Formato não reconhecido." }, { status: 400 });

  const url = await saveLocal(objectKey(ctx.tenant.id, kind, mime), bytes);
  await db.mediaAsset.create({ data: { tenantId: ctx.tenant.id, url, kind, mimeType: mime, sizeBytes: bytes.byteLength } });
  return NextResponse.json({ url });
}
