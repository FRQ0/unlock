// Cálculo de preço do pedido. Roda SEMPRE no servidor com os dados do banco:
// o navegador só manda ids e quantidades, nunca preços.

export type PricingProduct = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  optionGroups: {
    id: string;
    name: string;
    type: "SINGLE" | "MULTIPLE";
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDeltaCents: number; available: boolean }[];
  }[];
};

export type CartLineInput = { productId: string; quantity: number; optionIds: string[]; notes?: string };

export type PricedLine = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  options: { group: string; name: string; priceDeltaCents: number }[];
  notes: string | null;
  totalCents: number;
};

export class PricingError extends Error {}

export const MAX_QTY_PER_LINE = 50;
export const MAX_LINES = 60;

export function priceLine(product: PricingProduct | undefined, line: CartLineInput): PricedLine {
  if (!product) throw new PricingError("Um dos produtos não está mais no cardápio.");
  if (!product.available) throw new PricingError(`“${product.name}” está indisponível no momento.`);
  const qty = Math.floor(line.quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) throw new PricingError("Quantidade inválida.");

  const chosen = new Set(line.optionIds);
  const known = new Set(product.optionGroups.flatMap((g) => g.options.map((o) => o.id)));
  for (const id of chosen) if (!known.has(id)) throw new PricingError(`Opção inválida em “${product.name}”.`);

  const options: PricedLine["options"] = [];
  let unit = product.priceCents;
  for (const g of product.optionGroups) {
    const picked = g.options.filter((o) => chosen.has(o.id));
    for (const o of picked) if (!o.available) throw new PricingError(`“${o.name}” está indisponível.`);
    const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
    const max = g.type === "SINGLE" ? 1 : g.maxSelect > 0 ? g.maxSelect : Infinity;
    if (picked.length < min) throw new PricingError(`Escolha ${g.name.toLowerCase()} em “${product.name}”.`);
    if (picked.length > max) throw new PricingError(`Em “${product.name}”, ${g.name.toLowerCase()} permite no máximo ${max}.`);
    for (const o of picked) {
      unit += o.priceDeltaCents;
      options.push({ group: g.name, name: o.name, priceDeltaCents: o.priceDeltaCents });
    }
  }
  if (unit < 0) throw new PricingError("Preço inválido.");
  const notes = line.notes?.trim().slice(0, 280) || null;
  return { productId: product.id, productName: product.name, unitPriceCents: unit, quantity: qty, options, notes, totalCents: unit * qty };
}

export function priceCart(products: PricingProduct[], lines: CartLineInput[], deliveryFeeCents: number) {
  if (!lines.length) throw new PricingError("O carrinho está vazio.");
  if (lines.length > MAX_LINES) throw new PricingError("Pedido grande demais.");
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced = lines.map((l) => priceLine(byId.get(l.productId), l));
  const subtotal = priced.reduce((s, l) => s + l.totalCents, 0);
  return { lines: priced, subtotalCents: subtotal, deliveryFeeCents, totalCents: subtotal + deliveryFeeCents };
}
