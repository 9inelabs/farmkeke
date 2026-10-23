// Nigerian mobile numbers, the way checkout takes them (same rules as the website).

/** Any way of writing a Nigerian mobile number → its 10 local digits, or null. */
export function validPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^[789]\d{9}$/.test(local) ? local : null;
}

/** "8031234567" or "+2348031234567" → "0803 123 4567" */
export function displayPhone(raw: string): string {
  const local = validPhone(raw);
  return local ? `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : raw;
}
