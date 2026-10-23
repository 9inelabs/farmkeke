// The cart (M-30) lives on the phone, like the website keeps it in the
// browser. It's checked against the server at checkout with
// api.checkout.quote, which reports price or stock changes (M-32). Each farm
// in the cart becomes its own order at checkout.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

type LineKey = Pick<CartLine, "listingId" | "unitId">;
const same = (a: LineKey, b: LineKey) => a.listingId === b.listingId && a.unitId === b.unitId;

// The website allows 50 lines; the app keeps the same limit.
export const MAX_LINES = 50;

type Cart = {
  lines: CartLine[];
  /** Adds the line, or raises its quantity (up to the stock) if it's already there. */
  add: (line: CartLine) => void;
  setQuantity: (key: LineKey, quantity: number) => void;
  remove: (key: LineKey) => void;
  /** Puts a removed line back where it was (M-30 "Undo"). */
  restore: (line: CartLine, index: number) => void;
  /** Server-corrected lines, after a quote shows changes (M-32). */
  replace: (lines: CartLine[]) => void;
  clear: () => void;
};

export const useCart = create<Cart>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => same(l, line));
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                same(l, line) ? { ...l, ...line, quantity: Math.min(l.quantity + line.quantity, line.stock) } : l,
              ),
            };
          }
          if (s.lines.length >= MAX_LINES) return s;
          return { lines: [...s.lines, line] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: quantity <= 0 ? s.lines.filter((l) => !same(l, key)) : s.lines.map((l) => (same(l, key) ? { ...l, quantity } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => !same(l, key)) })),
      restore: (line, index) =>
        set((s) => {
          if (s.lines.some((l) => same(l, line))) return s;
          const lines = [...s.lines];
          lines.splice(Math.min(index, lines.length), 0, line);
          return { lines };
        }),
      replace: (lines) => set({ lines }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "farmkeke-cart",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lines }) => ({ lines }),
    },
  ),
);

/** Item count (for the tab badge), products total and number of farms. */
export function useCartSummary() {
  const lines = useCart((s) => s.lines);
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const itemsTotalKobo = lines.reduce((n, l) => n + l.priceKobo * l.quantity, 0);
  const farmCount = new Set(lines.map((l) => l.farmId)).size;
  return { lines, count, itemsTotalKobo, farmCount };
}

/** Items in the shape api.checkout.quote and api.checkout.place expect. */
export const quoteItems = (lines: CartLine[]) =>
  lines.map((l) => ({ listingId: l.listingId, unitId: l.unitId, quantity: l.quantity, priceKobo: l.priceKobo }));
