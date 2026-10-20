"use client";

// What the shopper has filled in across the checkout steps (W-21 to W-25),
// kept in this browser so Back / Edit / reloads keep it. Sent to
// checkout.place on W-25. Pickup is at each farm and delivery times are agreed
// with the rider, so there's no pickup point or time slot to remember.
import { createLocalStore } from "@/lib/local-store";

export type CheckoutDraft = {
  contact: { name: string; phone: string; email: string };
  fulfilment: "delivery" | "pickup" | null;
  address: {
    street: string;
    landmark: string;
    /** "Note for the rider", sent as checkout.place address.note (Phase 5). */
    note: string;
    latitude?: number;
    longitude?: number;
  };
  /** The last pickup checkout placed from this draft and still unpaid; sent as `replaces`. */
  checkoutId: string | null;
  /** Where the last placed checkout goes, for W-30's "What happens next". */
  placed: { checkoutId: string; street?: string } | null;
};

const EMPTY: CheckoutDraft = {
  contact: { name: "", phone: "", email: "" },
  fulfilment: null,
  address: { street: "", landmark: "", note: "" },
  checkoutId: null,
  placed: null,
};

const store = createLocalStore<CheckoutDraft>("fk.checkout.v1", EMPTY);

export const draft = {
  get: store.get,
  use: store.use,
  patch: (p: Partial<CheckoutDraft>) => store.set((d) => ({ ...d, ...p })),
  /** After placing (delivery) or paying (pickup): keep contact and address for next time, forget the rest. */
  finish: (placed: CheckoutDraft["placed"]) => store.set((d) => ({ ...d, checkoutId: null, placed })),
};

/** Nigerian mobile number as 10 local digits, or null if it can't be one. */
export function validPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^[789]\d{9}$/.test(local) ? local : null;
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
