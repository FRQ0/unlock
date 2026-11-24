import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Cookie, Page } from "@playwright/test";

export const db = new PrismaClient();
export const PASSWORD = "senha-de-teste-123";

/** Cria dois estabelecimentos isolados (A e B) com dados próprios, para os testes. */
export async function createFixtures() {
  const run = crypto.randomBytes(3).toString("hex");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const basico = await db.plan.findUniqueOrThrow({ where: { code: "basico" } });

  async function tenant(tag: string, status: "ACTIVE" | "SUSPENDED") {
    const t = await db.tenant.create({
      data: {
        slug: `e2e-${tag}-${run}`, name: `E2E ${tag.toUpperCase()} ${run}`, status, published: true,
        acceptsDineIn: true, acceptsOrders: true,
        subscription: { create: { planId: basico.id, status: "ACTIVE", provider: "manual" } },
      },
    });
    const cat = await db.category.create({ data: { tenantId: t.id, name: `Cat ${tag}`, sortOrder: 1 } });
    const product = await db.product.create({ data: { tenantId: t.id, categoryId: cat.id, name: `Produto ${tag}`, priceCents: 2500, available: true } });
    const owner = await db.user.create({ data: { email: `owner-${tag}-${run}@e2e.local`, name: `Dono ${tag}`, passwordHash: hash, role: "OWNER", tenantId: t.id } });
    const staff = await db.user.create({ data: { email: `staff-${tag}-${run}@e2e.local`, name: `Func ${tag}`, passwordHash: hash, role: "STAFF", tenantId: t.id } });
    const order = await db.order.create({
      data: {
        tenantId: t.id, number: 1, publicToken: crypto.randomBytes(18).toString("base64url"), mode: "DINE_IN", customerName: `Cliente ${tag}`,
        tableNumber: "1", subtotalCents: 2500, totalCents: 2500, consentAt: new Date(),
        items: { create: [{ tenantId: t.id, productId: product.id, productName: product.name, unitPriceCents: 2500, quantity: 1, options: [], totalCents: 2500 }] },
      },
    });
    await db.tenant.update({ where: { id: t.id }, data: { orderSeq: 1 } });
    return { tenant: t, cat, product, owner, staff, order };
  }

  const A = await tenant("a", "ACTIVE");
  const B = await tenant("b", "ACTIVE");
  return { A, B, run };
}

export async function destroyFixtures(ids: string[]) {
  await db.tenant.deleteMany({ where: { id: { in: ids } } });
}

export async function login(page: Page, email: string) {
  await page.goto("/entrar");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/(painel|master)/);
}

const sessions = new Map<string, Cookie[]>();

/** Faz login uma vez por usuário e reaproveita o cookie (evita o limite de tentativas de login). */
export async function loginOnce(page: Page, email: string) {
  const saved = sessions.get(email);
  if (saved) {
    await page.context().addCookies(saved);
    return;
  }
  await login(page, email);
  sessions.set(email, await page.context().cookies());
}

/** Simula um atacante trocando o valor de um campo oculto antes de enviar. */
export async function tamper(page: Page, selector: string, value: string) {
  // Espera a página "hidratar" (React assumir o HTML), senão o valor original é restaurado.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const n = await page.locator(selector).count();
  if (!n) throw new Error(`Campo não encontrado: ${selector}`);
  await page.evaluate(([sel, v]) => {
    document.querySelectorAll<HTMLInputElement>(sel).forEach((el) => { el.value = v; el.setAttribute("value", v); });
  }, [selector, value] as const);
}
