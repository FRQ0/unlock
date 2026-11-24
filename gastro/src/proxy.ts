import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão nem chega a renderizar áreas restritas.
// A verificação completa (assinatura do token, usuário ativo, papel, tenant)
// acontece no servidor em src/lib/session.ts.
export function proxy(req: NextRequest) {
  if (!req.cookies.get("ug_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*", "/master/:path*"] };
