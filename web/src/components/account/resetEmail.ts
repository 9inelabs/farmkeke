"use client";

// The email a reset link was sent to, from W-42a to W-42b (Check your email).
const KEY = "fk.resetEmail";

export function setResetEmail(email: string) {
  try {
    window.sessionStorage.setItem(KEY, email);
  } catch {
    // Storage blocked: W-42b says "your email" instead.
  }
}

export function resetEmail(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
