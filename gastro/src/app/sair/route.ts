import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Só POST: um link/imagem de terceiros não consegue deslogar o usuário.
export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete("ug_session");
  jar.delete("ug_acting_tenant");
  return NextResponse.redirect(new URL("/entrar", req.url), 303);
}
