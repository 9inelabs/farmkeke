// Amounts are integer kobo (₦1 = 100 kobo) everywhere, matching the backend.

const nairaFormat = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 450000 → "₦4,500". Whole naira; kobo are rounded for display only. */
export function formatNaira(kobo: number): string {
  return `₦${nairaFormat.format(Math.round(kobo / 100))}`;
}
