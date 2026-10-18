// Opening-hours helpers for pickup points (W-82). Nigerian time is UTC+1 all year.
import { clock } from "@/lib/format";
import type { PickupPoint } from "@/convex/returns/site";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Hours = NonNullable<PickupPoint["hours"]>;

/** "Mon–Sat, 8am–7pm" (groups days that share the same hours). */
export function hoursLabel(hours: Hours | undefined): string {
  if (!hours?.length) return "Opening hours not listed";
  const groups = new Map<string, number[]>();
  for (const h of [...hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))) {
    const key = `${clock(h.opens)}–${clock(h.closes)}`;
    groups.set(key, [...(groups.get(key) ?? []), h.day]);
  }
  return [...groups.entries()]
    .map(([time, days]) => `${dayRange(days)}, ${time}`)
    .join("; ");
}

function dayRange(days: number[]): string {
  if (days.length === 7) return "Every day";
  // Days arrive Monday-first; split into runs of consecutive days.
  const order = days.map((d) => (d + 6) % 7);
  const runs: number[][] = [];
  for (const d of order) {
    const last = runs.at(-1);
    if (last && d === last.at(-1)! + 1) last.push(d);
    else runs.push([d]);
  }
  const name = (i: number) => DAY[(i + 1) % 7]!;
  return runs.map((r) => (r.length > 2 ? `${name(r[0]!)}–${name(r.at(-1)!)}` : r.map(name).join(", "))).join(", ");
}

/** Open right now in Nigerian time? `minute` is minutes since the epoch. */
export function openState(hours: Hours | undefined, minute: number): { open: boolean; closes?: string } {
  const lagos = new Date(minute * 60_000 + 3_600_000);
  const today = hours?.find((h) => h.day === lagos.getUTCDay());
  if (!today) return { open: false };
  const now = lagos.getUTCHours() * 60 + lagos.getUTCMinutes();
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return now >= toMin(today.opens) && now < toMin(today.closes) ? { open: true, closes: clock(today.closes) } : { open: false };
}

export function directionsUrl(p: PickupPoint): string {
  const dest = p.latitude != null && p.longitude != null ? `${p.latitude},${p.longitude}` : `${p.name}, ${p.address}, ${p.state}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
