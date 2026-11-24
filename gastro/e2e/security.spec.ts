import { expect, test } from "@playwright/test";
import { createFixtures, db, destroyFixtures, loginOnce as login, tamper } from "./fixtures";

type F = Awaited<ReturnType<typeof createFixtures>>;
let f: F;

test.beforeAll(async () => { f = await createFixtures(); });
test.afterAll(async () => { await destroyFixtures([f.A.tenant.id, f.B.tenant.id]); await db.$disconnect(); });

test.describe("isolamento entre estabelecimentos", () => {
  test("não abre produto de outro estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    const res = await page.goto(`/painel/produtos/${f.B.product.id}`);
    expect(res?.status()).toBe(404);
  });

  test("não exclui produto de outro estabelecimento trocando o id do formulário", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto(`/painel/produtos/${f.A.product.id}`);
    await tamper(page, "form:has(input[name=from]) input[name=id]", f.B.product.id);
    page.once("dialog", (d) => d.accept());
    await page.click("button:has-text('Excluir')");
    await page.waitForURL("**/painel/produtos");
    expect(await db.product.findUnique({ where: { id: f.B.product.id } })).not.toBeNull();
    expect(await db.product.findUnique({ where: { id: f.A.product.id } })).not.toBeNull(); // id trocado: nada foi apagado
  });

  test("não esgota produto de outro estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto("/painel/produtos");
    await tamper(page, "form:has(input[name=field][value=available]) input[name=id]", f.B.product.id);
    await page.locator("button:has-text('Marcar esgotado')").first().click();
    await page.waitForTimeout(1200);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.B.product.id } })).available).toBe(true);
  });

  test("não edita produto de outro estabelecimento pelo formulário de edição", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto(`/painel/produtos/${f.A.product.id}`);
    await tamper(page, "form:has(input[name=groups]) input[name=id]", f.B.product.id);
    await page.fill("input[name=name]", "Invadido");
    await page.click("button:has-text('Salvar alterações')");
    await expect(page.getByText("Produto não encontrado.")).toBeVisible();
    expect((await db.product.findUniqueOrThrow({ where: { id: f.B.product.id } })).name).toBe("Produto b");
  });

  test("não usa categoria de outro estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto("/painel/produtos/novo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.evaluate((id) => {
      const s = document.querySelector<HTMLSelectElement>("select[name=categoryId]")!;
      const o = document.createElement("option"); o.value = id; o.textContent = "x"; s.appendChild(o); s.value = id;
    }, f.B.cat.id);
    await page.fill("input[name=name]", "Teste categoria");
    await page.fill("input[name=price]", "10,00");
    await page.click("button:has-text('Cadastrar produto')");
    await expect(page.getByText("Categoria inválida.")).toBeVisible();
    expect(await db.product.count({ where: { categoryId: f.B.cat.id, tenantId: f.A.tenant.id } })).toBe(0);
  });

  test("não renomeia categoria de outro estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto("/painel/categorias");
    await tamper(page, "form:has(input[id^=cat-]) input[name=id]", f.B.cat.id);
    await page.fill(`#cat-${f.A.cat.id}`, "Invadida");
    await page.locator("form:has(input[id^=cat-]) button:has-text('Salvar')").first().click();
    await page.waitForTimeout(1200);
    expect((await db.category.findUniqueOrThrow({ where: { id: f.B.cat.id } })).name).toBe("Cat b");
  });

  test("não muda status de pedido de outro estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto("/painel/pedidos");
    await tamper(page, "form:has(input[name=status][value=PREPARING]) input[name=id]", f.B.order.id);
    await page.click("button:has-text('Aceitar e preparar')");
    await page.waitForTimeout(1200);
    expect((await db.order.findUniqueOrThrow({ where: { id: f.B.order.id } })).status).toBe("NEW");
  });

  test("exportação de dados só traz o próprio estabelecimento", async ({ page }) => {
    await login(page, f.A.owner.email);
    const res = await page.request.get("/api/painel/exportar");
    const text = await res.text();
    expect(text).toContain(f.A.tenant.id);
    expect(text).not.toContain(f.B.tenant.id);
    expect(text).not.toContain("passwordHash");
  });
});

test.describe("permissões e rotas protegidas", () => {
  test("sem login, painel e master redirecionam para o login", async ({ page }) => {
    await page.goto("/painel/produtos");
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto("/master");
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("dono não acessa o Painel Master", async ({ page }) => {
    await login(page, f.A.owner.email);
    await page.goto("/master/estabelecimentos");
    await expect(page).toHaveURL(/\/painel$/);
  });

  test("funcionário só acessa pedidos", async ({ page }) => {
    await login(page, f.A.staff.email);
    await page.goto("/painel/produtos");
    await expect(page).toHaveURL(/\/painel\/pedidos/);
    await page.goto("/painel/aparencia");
    await expect(page).toHaveURL(/\/painel\/pedidos/);
    const res = await page.request.get("/api/painel/exportar");
    expect(res.status()).toBe(401);
  });

  test("upload exige login e mesma origem", async ({ page, request }) => {
    const anon = await request.post("/api/upload", { headers: { Origin: "http://localhost:3000" }, multipart: { kind: "image", file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) } } });
    expect(anon.status()).toBe(401);
    await login(page, f.A.owner.email);
    const cross = await page.request.post("/api/upload", { headers: { Origin: "https://site-malicioso.com" }, multipart: { kind: "image", file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) } } });
    expect(cross.status()).toBe(403);
    const svg = await page.request.post("/api/upload", { headers: { Origin: "http://localhost:3000" }, multipart: { kind: "image", file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<svg onload=alert(1)>") } } });
    expect(svg.status()).toBe(400);
  });

  test("plano Básico não envia vídeo", async ({ page }) => {
    await login(page, f.A.owner.email);
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(32)]);
    const res = await page.request.post("/api/upload", { headers: { Origin: "http://localhost:3000" }, multipart: { kind: "video", file: { name: "v.mp4", mimeType: "video/mp4", buffer: mp4 } } });
    expect(res.status()).toBe(403);
  });
});

test.describe("cardápio público e pedidos", () => {
  test("cardápio suspenso sai do ar", async ({ page }) => {
    await db.tenant.update({ where: { id: f.B.tenant.id }, data: { status: "SUSPENDED" } });
    const res = await page.goto(`/${f.B.tenant.slug}`);
    expect(res?.status()).toBe(404);
    await db.tenant.update({ where: { id: f.B.tenant.id }, data: { status: "ACTIVE" } });
  });

  test("preço adulterado no navegador é ignorado: o servidor recalcula", async ({ page }) => {
    await page.goto(`/${f.A.tenant.slug}`);
    await page.click(`button[aria-label="Adicionar ${f.A.product.name}"]`);
    await page.click("[role=dialog] button:has-text('Adicionar')");
    const key = `ug_cart_${f.A.tenant.slug}`;
    await page.evaluate((k) => {
      const c = JSON.parse(localStorage.getItem(k)!);
      c[0].unitPriceCents = 1;
      localStorage.setItem(k, JSON.stringify(c));
    }, key);
    await page.reload();
    await page.click("button:has-text('Ver pedido')");
    await page.fill("input[autocomplete=name]", "Cliente Preço");
    await page.fill("input[inputmode=numeric]", "3");
    await page.check("[role=dialog] input[type=checkbox]");
    await page.click("button:has-text('Enviar pedido')");
    await page.waitForURL("**/pedido/**");
    const order = await db.order.findFirstOrThrow({ where: { tenantId: f.A.tenant.id, customerName: "Cliente Preço" } });
    expect(order.totalCents).toBe(2500);
  });

  test("não pede produto de outro estabelecimento", async ({ page }) => {
    await page.goto(`/${f.A.tenant.slug}`);
    await page.click(`button[aria-label="Adicionar ${f.A.product.name}"]`);
    await page.click("[role=dialog] button:has-text('Adicionar')");
    await page.evaluate(([k, id]) => {
      const c = JSON.parse(localStorage.getItem(k)!);
      c[0].productId = id;
      localStorage.setItem(k, JSON.stringify(c));
    }, [`ug_cart_${f.A.tenant.slug}`, f.B.product.id] as const);
    await page.reload();
    await page.click("button:has-text('Ver pedido')");
    await page.fill("input[autocomplete=name]", "Cliente Invasor");
    await page.fill("input[inputmode=numeric]", "4");
    await page.check("[role=dialog] input[type=checkbox]");
    await page.click("button:has-text('Enviar pedido')");
    await expect(page.getByText("Um dos produtos não está mais no cardápio")).toBeVisible();
    expect(await db.order.count({ where: { customerName: "Cliente Invasor" } })).toBe(0);
  });

  test("página de acompanhamento não abre pedido pelo endereço de outro estabelecimento", async ({ page }) => {
    const res = await page.goto(`/${f.A.tenant.slug}/pedido/${f.B.order.publicToken}`);
    expect(res?.status()).toBe(404);
  });
});

test.describe("exclusão definitiva (Master)", () => {
  test("só exclui conta cancelada e com confirmação do endereço", async ({ page }) => {
    test.skip(!process.env.MASTER_EMAIL || !process.env.MASTER_PASSWORD, "Defina MASTER_EMAIL e MASTER_PASSWORD");
    const { db: prisma } = await import("./fixtures");
    const t = await prisma.tenant.create({ data: { slug: `e2e-del-${Date.now()}`, name: "E2E exclusão", status: "ACTIVE" } });
    await page.goto("/entrar");
    await page.fill("input[name=email]", process.env.MASTER_EMAIL!);
    await page.fill("input[name=password]", process.env.MASTER_PASSWORD!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/master");
    await page.goto(`/master/estabelecimentos/${t.id}`);
    await expect(page.getByText("Excluir definitivamente")).toHaveCount(0); // ativo: sem opção
    await prisma.tenant.update({ where: { id: t.id }, data: { status: "CANCELED" } });
    await page.reload();
    await page.fill("input[name=confirm]", "endereco-errado");
    await page.click("button:has-text('Excluir definitivamente')");
    await expect(page.getByText(`Digite exatamente “${t.slug}”`)).toBeVisible();
    expect(await prisma.tenant.findUnique({ where: { id: t.id } })).not.toBeNull();
    await page.fill("input[name=confirm]", t.slug);
    await page.click("button:has-text('Excluir definitivamente')");
    await page.waitForURL("**/master/estabelecimentos?excluido=1");
    expect(await prisma.tenant.findUnique({ where: { id: t.id } })).toBeNull();
  });
});
