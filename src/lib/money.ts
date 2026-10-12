// Amounts are integer kobo (₦1 = 100 kobo) everywhere, matching the backend.

const nairaFormat = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 450000 → "₦4,500". Whole naira; kobo are rounded for display only. */
export function formatNaira(kobo: number): string {
  return `₦${nairaFormat.format(Math.round(kobo / 100))}`;
}

/** "4,500" / "4500.50" typed by a person → kobo, or null if it isn't a positive amount. */
export function parseNaira(text: string): number | null {
  const cleaned = text.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const kobo = Math.round(Number(cleaned) * 100);
  return kobo > 0 ? kobo : null;
}

/** 450000 → "4500" for editing in a text field. */
export function nairaInput(kobo: number): string {
  return kobo % 100 === 0 ? String(kobo / 100) : (kobo / 100).toFixed(2);
}
