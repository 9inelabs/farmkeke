// Date and text helpers for the order pages, in Nigerian time, matching the
// designs: "Sat 17 Oct, 10:41", "Sat 17 Oct", "Sun 10:52", "11:02".
import { LAGOS_TZ } from "@/lib/format";

const part = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS_TZ, ...opts }).format(new Date(ms));

/** "Sat 17 Oct" */
export function dayLabel(ms: number): string {
  return `${part(ms, { weekday: "short" })} ${part(ms, { day: "numeric" })} ${part(ms, { month: "short" })}`;
}

/** "Sat 17 Oct" from a "YYYY-MM-DD" day. Built from parts, so browsers that
 * add a comma ("Sat, 17 Oct") still match the designs. */
export function isoDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayLabel(Date.UTC(y!, m! - 1, d!, 12));
}

/** "10:41" */
export function hm(ms: number): string {
  return part(ms, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "Sat 17 Oct, 10:41" */
export function dayTime(ms: number): string {
  return `${dayLabel(ms)}, ${hm(ms)}`;
}

/** "Sun 10:52" */
export function weekdayTime(ms: number): string {
  return `${part(ms, { weekday: "short" })} ${hm(ms)}`;
}

/** "2026-10-17" in Lagos, to compare days. */
export function lagosDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(ms),
  );
}

/** "Today" / "Yesterday" / "Sat 17 Oct" for chat day separators. */
export function chatDay(ms: number, now: number): string {
  const d = lagosDay(ms);
  if (d === lagosDay(now)) return "Today";
  if (d === lagosDay(now - 86_400_000)) return "Yesterday";
  return dayLabel(ms);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "12:00" → "12pm", "09:30" → "9:30am" */
function clock12(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

/** Opening hours as in W-51b: "Mon – Sat, 8am – 7pm". */
export function hoursSummary(hours: Array<{ day: number; opens: string; closes: string }>): string | undefined {
  if (hours.length === 0) return undefined;
  const sorted = [...hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  const groups: Array<{ from: number; to: number; opens: string; closes: string }> = [];
  for (const h of sorted) {
    const g = groups[groups.length - 1];
    if (g && g.opens === h.opens && g.closes === h.closes && (g.to + 1) % 7 === h.day) g.to = h.day;
    else groups.push({ from: h.day, to: h.day, opens: h.opens, closes: h.closes });
  }
  return groups
    .map((g) => {
      const days = g.from === g.to ? DAYS[g.from] : `${DAYS[g.from]} – ${DAYS[g.to]}`;
      return `${days}, ${clock12(g.opens)} – ${clock12(g.closes)}`;
    })
    .join(" · ");
}

/** "12pm – 3pm" from "12:00" and "15:00" */
export function windowLabel(from?: string, to?: string): string | undefined {
  if (!from || !to) return undefined;
  return `${clock12(from)} – ${clock12(to)}`;
}

/** Local 10-digit number from what the person typed ("0803…", "803…", "+234803…"). */
export function localDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits.slice(3);
  return digits.replace(/^0/, "");
}

/** "+234 803 *** 4567" (W-51c) */
export function maskPhone(phone: string): string {
  const local = localDigits(phone);
  if (local.length !== 10) return phone;
  return `+234 ${local.slice(0, 3)} *** ${local.slice(6)}`;
}

export function firstName(name?: string): string | undefined {
  return name?.trim().split(/\s+/)[0] || undefined;
}

/** "Emeka Okafor" → "Emeka O." */
export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? name);
}
