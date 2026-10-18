"use client";

// Carries the return address and first name from W-41 to W-42 (Account created).
const KEY = "fk.afterSignup";

export function setAfterSignup(next: string | null, name: string) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ next, name }));
  } catch {
    // Storage blocked: W-42 falls back to the shop and the account's name.
  }
}

export function afterSignup(): { next: string | null; name: string | null } {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { next: string | null; name: string | null }) : { next: null, name: null };
  } catch {
    return { next: null, name: null };
  }
}
