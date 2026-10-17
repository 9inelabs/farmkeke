// Money is stored as integer kobo everywhere in the backend (₦1 = 100 kobo).

const nairaFmt = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const nairaFmtKobo = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 450000 → "₦4,500". Shows kobo only when there are any (e.g. "₦4,500.50"). */
export function naira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined || Number.isNaN(kobo)) return "₦0";
  const value = kobo / 100;
  return "₦" + (Number.isInteger(value) ? nairaFmt.format(value) : nairaFmtKobo.format(value));
}

/** "1 item", "3 items" */
export function plural(n: number, singular: string, pluralWord = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

export const LAGOS_TZ = "Africa/Lagos";

/** Today's date in Nigeria as "YYYY-MM-DD" (the backend's `today` argument). */
export function todayInLagos(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LAGOS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
}

/** "Mon 19 Oct" from "2026-10-19" */
export function shortDay(isoDay: string): string {
  const [y, mo, d] = isoDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, 12));
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(date);
}

/** "12:00" → "12pm", "09:30" → "9:30am" */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

/** Epoch ms → "17 Oct 2026, 10:52" in Nigerian time */
export function dateTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/** Epoch ms → "17 Oct" */
export function dayMonth(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS_TZ, day: "numeric", month: "short" }).format(new Date(ms));
}

/** Initials for avatars: "Okafor Farms" → "OF" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Soft background tints for products/farms without a photo (from the designs). */
const TINTS = ["#F6E3DC", "#EFE8D8", "#E2EEDA", "#F4EEDD", "#F1EBCF", "#F7E0D6", "#DDE7EC", "#E6EEDC", "#E4F2C7"];
export function tintFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** Nigerian phone for display: "+234 803 123 4567" */
export function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  if (local.length !== 10) return phone;
  return `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
