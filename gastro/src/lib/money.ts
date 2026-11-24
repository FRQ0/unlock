const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Aceita "32,90", "32.90", "R$ 1.234,50" e devolve centavos. Retorna null se inválido. */
export function parseBRL(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/[R$\s]/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return Number.isFinite(cents) ? cents : null;
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
