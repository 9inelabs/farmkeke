type Slot = { day: number; opens: string; closes: string };

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "08:00" → "8 AM", "19:30" → "7:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * Opening hours as people say them: "Mon–Sat, 8 AM–7 PM" or "Daily, 8 AM–8 PM".
 * Runs of consecutive days with the same times are grouped.
 */
export function formatHours(hours: Slot[]): string {
  if (hours.length === 0) return "Closed";
  const sorted = [...hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7)); // Monday first
  const groups: { from: number; to: number; opens: string; closes: string }[] = [];
  for (const slot of sorted) {
    const last = groups[groups.length - 1];
    const next = (last?.to ?? -2) % 7 === (slot.day + 6) % 7;
    if (last && next && last.opens === slot.opens && last.closes === slot.closes) last.to = slot.day;
    else groups.push({ from: slot.day, to: slot.day, opens: slot.opens, closes: slot.closes });
  }
  return groups
    .map((g) => {
      const days =
        hours.length === 7 && groups.length === 1
          ? "Daily"
          : g.from === g.to
            ? DAY[g.from]
            : `${DAY[g.from]}–${DAY[g.to]}`;
      return `${days}, ${formatTime(g.opens)}–${formatTime(g.closes)}`;
    })
    .join(" · ");
}
