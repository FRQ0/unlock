import { describe, expect, it } from "vitest";
import { parseBRL, formatBRL } from "@/lib/money";
import { slugify, validateSlug } from "@/lib/slug";
import { contrastRatio, readableOn, themeVars, DEFAULT_THEME } from "@/lib/theme";
import { priceCart, PricingError, type PricingProduct } from "@/lib/pricing";
import { isOpenNow, parseHours } from "@/lib/hours";
import { sniffMime, urlBelongsToTenant, validateUpload } from "@/lib/storage";

describe("dinheiro", () => {
  it("lê formatos brasileiros", () => {
    expect(parseBRL("32,90")).toBe(3290);
    expect(parseBRL("R$ 1.234,50")).toBe(123450);
    expect(parseBRL("10")).toBe(1000);
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("1,234")).toBeNull();
    expect(formatBRL(3290).replace(/\s/g, " ")).toBe("R$ 32,90");
  });
});

describe("endereço do cardápio", () => {
  it("gera e valida slug", () => {
    expect(slugify("Pizzaria São João & Cia")).toBe("pizzaria-sao-joao-e-cia");
    expect(validateSlug("painel")).toMatch(/reservado/);
    expect(validateSlug("ab")).toMatch(/3 caracteres/);
    expect(validateSlug("casa-fume")).toBeNull();
    expect(validateSlug("Casa")).not.toBeNull();
  });
});

describe("tema", () => {
  it("escolhe texto legível sobre o botão", () => {
    expect(readableOn("#FF6A3D")).toBe("#0D0F12");
    expect(readableOn("#1F5135")).toBe("#FFFFFF");
    expect(contrastRatio("#0D0F12", "#F4F4EF")).toBeGreaterThan(15);
  });
  it("corrige cor de destaque com pouco contraste", () => {
    const v = themeVars({ ...DEFAULT_THEME, appearance: "LIGHT", primaryColor: "#FFF200" });
    expect(contrastRatio(v["--m-accent"], v["--m-bg"])).toBeGreaterThanOrEqual(3);
  });
});

const burger: PricingProduct = {
  id: "p1", name: "X-Bacon", priceCents: 3000, available: true,
  optionGroups: [
    { id: "g1", name: "Ponto", type: "SINGLE", required: true, minSelect: 1, maxSelect: 1, options: [
      { id: "o1", name: "Mal passado", priceDeltaCents: 0, available: true },
      { id: "o2", name: "Ao ponto", priceDeltaCents: 0, available: true },
    ] },
    { id: "g2", name: "Adicionais", type: "MULTIPLE", required: false, minSelect: 0, maxSelect: 2, options: [
      { id: "o3", name: "Bacon extra", priceDeltaCents: 500, available: true },
      { id: "o4", name: "Ovo", priceDeltaCents: 300, available: true },
      { id: "o5", name: "Cheddar", priceDeltaCents: 400, available: false },
    ] },
  ],
};

describe("preço do pedido (servidor)", () => {
  it("soma adicionais e quantidade", () => {
    const r = priceCart([burger], [{ productId: "p1", quantity: 2, optionIds: ["o1", "o3", "o4"] }], 700);
    expect(r.lines[0].unitPriceCents).toBe(3800);
    expect(r.subtotalCents).toBe(7600);
    expect(r.totalCents).toBe(8300);
  });
  it("exige escolha obrigatória", () => {
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 1, optionIds: [] }], 0)).toThrow(PricingError);
  });
  it("respeita o máximo e opções indisponíveis", () => {
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 1, optionIds: ["o1", "o3", "o4", "o5"] }], 0)).toThrow();
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 1, optionIds: ["o1", "o5"] }], 0)).toThrow(/indisponível/);
  });
  it("rejeita opção de outro produto e produto inexistente", () => {
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 1, optionIds: ["o1", "x9"] }], 0)).toThrow(/inválida/);
    expect(() => priceCart([burger], [{ productId: "p2", quantity: 1, optionIds: [] }], 0)).toThrow();
  });
  it("rejeita quantidade absurda", () => {
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 0, optionIds: ["o1"] }], 0)).toThrow();
    expect(() => priceCart([burger], [{ productId: "p1", quantity: 999, optionIds: ["o1"] }], 0)).toThrow();
  });
});

describe("horário", () => {
  const h = parseHours({ fri: { open: "18:00", close: "02:00" }, sat: { closed: true } });
  it("vira a meia-noite", () => {
    // Sexta 23h em Brasília = sábado 02:00 UTC
    expect(isOpenNow(h, new Date("2026-11-28T02:00:00Z"))).toBe(true);
    // Sábado 01h Brasília (ainda dentro do horário de sexta)
    expect(isOpenNow(h, new Date("2026-11-28T04:00:00Z"))).toBe(true);
    // Sábado 03h
    expect(isOpenNow(h, new Date("2026-11-28T06:00:00Z"))).toBe(false);
  });
});

describe("uploads", () => {
  it("detecta o tipo real do arquivo", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
  it("limita tamanho e tipo", () => {
    expect(validateUpload("image", "image/svg+xml", 10)).not.toBeNull();
    expect(validateUpload("image", "image/png", 6 * 1024 * 1024)).not.toBeNull();
    expect(validateUpload("video", "video/mp4", 1000)).toBeNull();
  });
  it("não aceita mídia de outro estabelecimento", () => {
    expect(urlBelongsToTenant("/uploads/t/abc/image/x.jpg", "abc")).toBe(true);
    expect(urlBelongsToTenant("/uploads/t/xyz/image/x.jpg", "abc")).toBe(false);
    expect(urlBelongsToTenant("https://evil.com/t/abc/x.jpg", "abc")).toBe(false);
    expect(urlBelongsToTenant("https://k.public.blob.vercel-storage.com/t/abc/image/x.jpg", "abc")).toBe(true);
  });
});
