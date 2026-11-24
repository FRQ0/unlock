import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { panelContextOrNull, tenantFeatures } from "@/lib/session";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/storage";

export const runtime = "nodejs";

// Envio direto do navegador para o Vercel Blob (permite vídeos grandes).
// O servidor só emite um token limitado à pasta do próprio estabelecimento.
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const ctx = await panelContextOrNull();
        if (!ctx) throw new Error("Faça login novamente.");
        const isVideo = pathname.startsWith(`t/${ctx.tenant.id}/video/`);
        const isImage = pathname.startsWith(`t/${ctx.tenant.id}/image/`);
        if (!isVideo && !isImage) throw new Error("Caminho inválido.");
        if (isVideo && !(await tenantFeatures(ctx.tenant.id)).videoFeed) throw new Error("Vídeos fazem parte do plano Completo.");
        return {
          allowedContentTypes: Object.keys(isVideo ? VIDEO_TYPES : IMAGE_TYPES),
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha no envio." }, { status: 400 });
  }
}
