import type { Appearance, CardStyle } from "@prisma/client";

export type MenuTheme = {
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  cardStyle: CardStyle;
  appearance: Appearance;
};

export const DEFAULT_THEME: MenuTheme = {
  primaryColor: "#FF6A3D",
  secondaryColor: "#1C2128",
  buttonColor: "#FF6A3D",
  cardStyle: "ROUNDED",
  appearance: "DARK",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

export function normalizeHex(v: unknown, fallback: string): string {
  return isHexColor(v) ? v.toUpperCase() : fallback;
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Escolhe texto escuro ou claro sobre uma cor, o que tiver mais contraste. */
export function readableOn(bg: string, dark = "#0D0F12", light = "#FFFFFF"): string {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light;
}

function mix(hex: string, target: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Garante que a cor de destaque seja legível sobre o fundo, escurecendo ou clareando se preciso. */
export function ensureContrast(fg: string, bg: string, min = 3): string {
  let c = fg;
  const toward = luminance(bg) > 0.4 ? "#000000" : "#FFFFFF";
  for (let i = 0; i < 10 && contrastRatio(c, bg) < min; i++) c = mix(c, toward, 0.15);
  return c;
}

const RADIUS: Record<CardStyle, { card: string; button: string; media: string }> = {
  ROUNDED: { card: "20px", button: "14px", media: "14px" },
  SQUARE: { card: "6px", button: "6px", media: "4px" },
  PILL: { card: "28px", button: "999px", media: "22px" },
};

/** Variáveis CSS aplicadas no cardápio público e na prévia ao vivo. */
export function themeVars(t: MenuTheme): Record<string, string> {
  const dark = t.appearance === "DARK";
  const bg = dark ? "#0D0F12" : "#F7F6F2";
  const surface = dark ? mix(t.secondaryColor, "#0D0F12", 0.35) : "#FFFFFF";
  const ink = dark ? "#F4F4EF" : "#14171C";
  const muted = dark ? "#A9B0BA" : "#5B636E";
  const line = dark ? "rgba(244,244,239,.12)" : "rgba(20,23,28,.12)";
  const r = RADIUS[t.cardStyle] ?? RADIUS.ROUNDED;
  return {
    "--m-bg": bg,
    "--m-surface": surface,
    "--m-ink": ink,
    "--m-muted": muted,
    "--m-line": line,
    "--m-primary": t.primaryColor,
    "--m-accent": ensureContrast(t.primaryColor, bg, 3),
    "--m-secondary": t.secondaryColor,
    "--m-on-secondary": readableOn(t.secondaryColor),
    "--m-button": t.buttonColor,
    "--m-on-button": readableOn(t.buttonColor),
    "--m-radius-card": r.card,
    "--m-radius-button": r.button,
    "--m-radius-media": r.media,
  };
}
