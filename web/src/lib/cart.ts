"use client";

// The cart lives in the browser (like the app keeps it on the phone) and is
// checked against the server at checkout with api.checkout.quote, which
// reports price or stock changes (W-20c "Items changed").
// Each farm in the cart becomes its own order at checkout (one order per farm).
import { createLocalStore, createMemoryStore } from "./local-store";

export type CartLine = {
  listingId: string;
  unitId: string;
  quantity: number;
  /** Price per unit when added, in kobo. The quote shows any change. */
  priceKobo: number;
  name: string;
  /** e.g. "basket" / "baskets" */
  unitSingular: string;
  unitPlural: string;
  farmId: string;
  farmName: string;
  imageUrl: string | null;
  minOrder: number;
  stock: number;
};

type CartState = { lines: CartLine[] };

const store = createLocalStore<CartState>("fk.cart.v1", { lines: [] });

const sameLine = (a: Pick<CartLine, "listingId" | "unitId">, b: Pick<CartLine, "listingId" | "unitId">) =>
  a.listingId === b.listingId && a.unitId === b.unitId;

export const cart = {
  /** Adds the line, or increases its quantity if it is already in the cart. */
  add(line: CartLine) {
    lastAdded.set(line.name);
    store.set((s) => {
      const existing = s.lines.find((l) => sameLine(l, line));
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            sameLine(l, line) ? { ...l, ...line, quantity: Math.min(l.quantity + line.quantity, line.stock) } : l,
          ),
        };
      }
      return { lines: [...s.lines, line] };
    });
  },
  setQuantity(key: Pick<CartLine, "listingId" | "unitId">, quantity: number) {
    store.set((s) => ({
      lines:
        quantity <= 0
          ? s.lines.filter((l) => !sameLine(l, key))
          : s.lines.map((l) => (sameLine(l, key) ? { ...l, quantity } : l)),
    }));
  },
  remove(key: Pick<CartLine, "listingId" | "unitId">) {
    store.set((s) => ({ lines: s.lines.filter((l) => !sameLine(l, key)) }));
  },
  /** Replace lines with server-corrected values (after a quote shows changes). */
  replace(lines: CartLine[]) {
    store.set({ lines });
  },
  clear() {
    store.set({ lines: [] });
  },
  get: () => store.get().lines,
};

export function useCart() {
  const { lines } = store.use();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const itemsTotalKobo = lines.reduce((n, l) => n + l.priceKobo * l.quantity, 0);
  const farms = Array.from(new Set(lines.map((l) => l.farmId)));
  return { lines, count, itemsTotalKobo, farmCount: farms.length };
}

/** Items in the shape api.checkout.quote / api.checkout.place expect. */
export function quoteItems(lines: CartLine[]) {
  return lines.map((l) => ({ listingId: l.listingId, unitId: l.unitId, quantity: l.quantity, priceKobo: l.priceKobo }));
}

// Mini-cart drawer (W-08) open state, shared by the header and add-to-cart buttons.
const drawer = createMemoryStore<boolean>(false);
// Name of the item most recently added, for the drawer's "… added to your cart".
// Cleared when the drawer closes, so opening it from the header shows no banner.
const lastAdded = createMemoryStore<string | null>(null);
export const miniCart = {
  open: () => drawer.set(true),
  close: () => {
    drawer.set(false);
    lastAdded.set(null);
  },
  useOpen: drawer.use,
  useLastAdded: lastAdded.use,
};
