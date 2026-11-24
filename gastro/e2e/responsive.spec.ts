import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createFixtures, db, destroyFixtures, loginOnce } from "./fixtures";

type F = Awaited<ReturnType<typeof createFixtures>>;
let f: F;
const shots = process.env.E2E_SHOTS_DIR;

test.beforeAll(async () => {
  f = await createFixtures();
  // A vira plano Completo com um vídeo, para testar o feed.
  const completo = await db.plan.findUniqueOrThrow({ where: { code: "completo" } });
  await db.subscription.update({ where: { tenantId: f.A.tenant.id }, data: { planId: completo.id } });
  const src = path.join(__dirname, "assets", "sample.mp4");
  if (fs.existsSync(src)) {
    const rel = `/uploads/t/${f.A.tenant.id}/video/e2e.mp4`;
    fs.mkdirSync(path.dirname(path.join("public", rel)), { recursive: true });
    fs.copyFileSync(src, path.join("public", rel));
    await db.product.update({ where: { id: f.A.product.id }, data: { videoUrl: rel, featured: true, description: "Descrição de teste para conferir quebras de linha no celular." } });
  }
});
test.afterAll(async () => {
  fs.rmSync(path.join("public", "uploads", "t", f.A.tenant.id), { recursive: true, force: true });
  await destroyFixtures([f.A.tenant.id, f.B.tenant.id]);
  await db.$disconnect();
});

async function noHorizontalScroll(page: import("@playwright/test").Page, name: string) {
  await page.waitForLoadState("load");
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: !name.startsWith("feed") });
  expect(sw, `${name}: largura ${sw} > tela ${w}`).toBeLessThanOrEqual(w + 1);
}

const PUBLIC = ["/", "/entrar", "/privacidade", "/termos"];

for (const width of [360, 412]) {
  test.describe(`largura ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("páginas públicas", async ({ page }) => {
      for (const url of PUBLIC) {
        await page.goto(url);
        await noHorizontalScroll(page, `${width}-publica${url.replace(/\//g, "_") || "_home"}`);
      }
    });

    test("cardápio, feed e carrinho", async ({ page }) => {
      await page.goto(`/${f.A.tenant.slug}`);
      await noHorizontalScroll(page, `${width}-cardapio`);
      await page.click(`button[aria-label="Adicionar ${f.A.product.name}"]`);
      await page.click("[role=dialog] button:has-text('Adicionar')");
      await page.click("button:has-text('Ver pedido')");
      await noHorizontalScroll(page, `${width}-carrinho`);
      await page.goto(`/${f.A.tenant.slug}/feed`);
      await expect(page.getByRole("button", { name: "Detalhes" }).first()).toBeVisible();
      await noHorizontalScroll(page, `feed-${width}`);
    });

    test("painel do estabelecimento", async ({ page }) => {
      await loginOnce(page, f.A.owner.email);
      for (const url of ["/painel", "/painel/garcom", "/painel/pedidos", "/painel/pedidos?aba=historico", "/painel/produtos", "/painel/produtos/novo", `/painel/produtos/${f.A.product.id}`, "/painel/categorias", "/painel/aparencia", "/painel/plaquinha", "/painel/assinatura", "/painel/configuracoes"]) {
        await page.goto(url);
        await noHorizontalScroll(page, `${width}-painel${url.replace(/[/?=]/g, "_")}`);
      }
    });
  });
}

test.describe("Painel Master no celular", () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test("telas do Master", async ({ page }) => {
    test.skip(!process.env.MASTER_EMAIL || !process.env.MASTER_PASSWORD, "Defina MASTER_EMAIL e MASTER_PASSWORD");
    await page.goto("/entrar");
    await page.fill("input[name=email]", process.env.MASTER_EMAIL!);
    await page.fill("input[name=password]", process.env.MASTER_PASSWORD!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/master");
    for (const url of ["/master", "/master/estabelecimentos", `/master/estabelecimentos/${f.A.tenant.id}`, "/master/estabelecimentos/novo", "/master/planos", "/master/usuarios"]) {
      await page.goto(url);
      await noHorizontalScroll(page, `390-master${url.replace(/\//g, "_")}`);
    }
  });
});
