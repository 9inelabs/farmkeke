// Dates on the order screens, in Nigerian time, as the website writes them:
// "Sat 17 Oct, 10:41", "Sat 17 Oct", "Sun 10:52", "17 Oct".
const LAGOS = "Africa/Lagos";

const part = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, ...opts }).format(new Date(ms));

/** "Sat 17 Oct" */
export const dayLabel = (ms: number) => `${part(ms, { weekday: "short" })} ${part(ms, { day: "numeric" })} ${part(ms, { month: "short" })}`;

/** "10:41" */
export const hm = (ms: number) => part(ms, { hour: "2-digit", minute: "2-digit", hour12: false });

/** "Sat 17 Oct, 10:41" */
export const dayTime = (ms: number) => `${dayLabel(ms)}, ${hm(ms)}`;

/** "17 Oct" */
export const dayMonth = (ms: number) => `${part(ms, { day: "numeric" })} ${part(ms, { month: "short" })}`;

/** "2026-10-17" in Lagos, to compare days. */
export const lagosDay = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));

/** "today" / "yesterday" / "Sat 17 Oct" */
export function relDay(ms: number, now: number): string {
  const d = lagosDay(ms);
  if (d === lagosDay(now)) return "today";
  if (d === lagosDay(now - 86_400_000)) return "yesterday";
  return dayLabel(ms);
}

/** "Adaeze Nwankwo" → "Adaeze N." */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : (parts[0] ?? "");
}
