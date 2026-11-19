# Unlock Systems

Site da Unlock: sites, sistemas, cardápio 3D e automações para empresas de Frutal-MG.

Site estático (HTML, CSS e JS puros), sem build. Pronto para a Vercel.

## Publicar na Vercel

1. Entre em vercel.com e clique em **Add New → Project**.
2. Escolha o repositório **unlock** e clique em **Import**.
3. Em *Framework Preset* deixe **Other**. Não precisa de comando de build.
4. Clique em **Deploy**.

Cada `git push` na branch `main` atualiza o site sozinho.

## Editar

- **WhatsApp:** no `index.html`, procure `const WHATSAPP = '';` e coloque o número com DDD, ex.: `'34999999999'`.
- **Projetos:** no `index.html`, procure `const FALLBACK = [`. Cada projeto tem título, tipo, descrição, destaques (`tags`), link e imagem (`img`).
- **Imagens dos projetos:** ficam em `img/projetos/`. Use imagem 1600x1000.
