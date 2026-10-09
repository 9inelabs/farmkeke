/**
 * Normalises a Nigerian mobile number to E.164 ("+2348031234567").
 * Accepts "0803 123 4567", "803 123 4567", "+234 803 123 4567", "2348031234567".
 * Returns null for anything else.
 */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+234")) national = digits.slice(4);
  else if (digits.startsWith("234") && digits.length === 13) national = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else national = digits;
  return /^[789]\d{9}$/.test(national) ? `+234${national}` : null;
}

export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
