"use client";

// W-50 → W-51c: the order number and phone used in Find my order, kept for
// this tab so the order page can ask orders.consumer.find again.
const KEY = "fk.foundOrder";

export type FoundOrder = { orderId: string; number: string; phone: string };

export function rememberLookup(l: FoundOrder) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    // Storage blocked: the order page offers Find my order again.
  }
}

export function lookupFor(orderId: string): FoundOrder | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const l = raw ? (JSON.parse(raw) as FoundOrder) : null;
    return l && l.orderId === orderId ? l : null;
  } catch {
    return null;
  }
}
