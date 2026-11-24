export const WEEKDAYS = [
  { key: "sun", label: "Domingo" },
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
] as const;

export type DayKey = (typeof WEEKDAYS)[number]["key"];
export type DayHours = { closed: boolean; open: string; close: string };
export type OpeningHours = Record<DayKey, DayHours>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseHours(json: unknown): OpeningHours | null {
  if (!json || typeof json !== "object") return null;
  const src = json as Record<string, Partial<DayHours>>;
  const out = {} as OpeningHours;
  for (const { key } of WEEKDAYS) {
    const d = src[key] ?? {};
    out[key] = {
      closed: d.closed === true || !TIME.test(d.open ?? "") || !TIME.test(d.close ?? ""),
      open: TIME.test(d.open ?? "") ? d.open! : "18:00",
      close: TIME.test(d.close ?? "") ? d.close! : "23:00",
    };
  }
  return out;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Hora atual no fuso de Brasília. */
function nowInBrazil(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day: idx, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

/** Retorna se está aberto agora (considera horários que viram a meia-noite). */
export function isOpenNow(hours: OpeningHours | null, now = new Date()): boolean | null {
  if (!hours) return null;
  const { day, minutes } = nowInBrazil(now);
  const today = hours[WEEKDAYS[day].key];
  const yesterday = hours[WEEKDAYS[(day + 6) % 7].key];
  if (!today.closed) {
    const o = toMin(today.open), c = toMin(today.close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  if (!yesterday.closed) {
    const o = toMin(yesterday.open), c = toMin(yesterday.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}

export function todayLabel(hours: OpeningHours | null, now = new Date()): string | null {
  if (!hours) return null;
  const d = hours[WEEKDAYS[nowInBrazil(now).day].key];
  return d.closed ? "Fechado hoje" : `Hoje das ${d.open} às ${d.close}`;
}
