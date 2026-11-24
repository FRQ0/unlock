/** Endereços que não podem virar cardápio porque são rotas da plataforma. */
export const RESERVED_SLUGS = new Set([
  "api", "painel", "master", "entrar", "sair", "cadastro", "assinatura", "planos",
  "privacidade", "termos", "uploads", "_next", "static", "public", "admin", "login",
  "app", "www", "unlock", "unlockgastro", "suporte", "ajuda", "contato", "favicon.ico",
  "robots.txt", "sitemap.xml", "pedido", "feed", "recuperar-senha",
]);

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function validateSlug(slug: string): string | null {
  if (slug.length < 3) return "O endereço precisa ter pelo menos 3 caracteres.";
  if (slug.length > 40) return "O endereço pode ter no máximo 40 caracteres.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use apenas letras minúsculas, números e hífen.";
  if (RESERVED_SLUGS.has(slug)) return "Esse endereço é reservado. Escolha outro.";
  return null;
}
