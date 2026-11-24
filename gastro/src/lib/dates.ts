/** Início do dia de hoje no fuso de Brasília, como Date UTC. */
export function startOfTodayBR(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now); // AAAA-MM-DD
  return new Date(`${ymd}T00:00:00-03:00`);
}

export function todayDateBR(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}

export function daysAgo(d: Date, n: number) {
  return new Date(d.getTime() - n * 86400_000);
}

const dt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const tOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export const fmtDateTime = (d: Date) => dt.format(d);
export const fmtDate = (d: Date) => dOnly.format(d);
export const fmtTime = (d: Date) => tOnly.format(d);

export function timeAgo(d: Date, now = new Date()): string {
  const m = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h` : fmtDate(d);
}
