"use client";

// What the shopper has filled in across the checkout steps (W-21 to W-25),
// kept in this browser so Back / Edit / reloads keep it. Sent to
// checkout.place on W-25.
import { createLocalStore } from "@/lib/local-store";

export type CheckoutDraft = {
  contact: { name: string; phone: string; email: string };
  fulfilment: "delivery" | "pickup" | null;
  address: {
    street: string;
    landmark: string;
    /** Not sent yet: checkout.place has no rider note (see BUILD-STATUS backend gaps). */
    note: string;
    latitude?: number;
    longitude?: number;
  };
  window: { day: string; from: string; to: string } | null;
  pickupPointId: string | null;
  /** The last checkout placed from this draft and still unpaid; sent as `replaces`. */
  checkoutId: string | null;
  /** Where the last paid checkout goes, for W-30's "What happens next". */
  placed: { checkoutId: string; street?: string; pointName?: string } | null;
};

const EMPTY: CheckoutDraft = {
  contact: { name: "", phone: "", email: "" },
  fulfilment: null,
  address: { street: "", landmark: "", note: "" },
  window: null,
  pickupPointId: null,
  checkoutId: null,
  placed: null,
};

const store = createLocalStore<CheckoutDraft>("fk.checkout.v1", EMPTY);

export const draft = {
  get: store.get,
  use: store.use,
  patch: (p: Partial<CheckoutDraft>) => store.set((d) => ({ ...d, ...p })),
  /** After payment: keep contact and address for next time, forget the rest. */
  finish: (placed: CheckoutDraft["placed"]) =>
    store.set((d) => ({ ...d, window: null, checkoutId: null, placed })),
};

/** Nigerian mobile number as 10 local digits, or null if it can't be one. */
export function validPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^[789]\d{9}$/.test(local) ? local : null;
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
