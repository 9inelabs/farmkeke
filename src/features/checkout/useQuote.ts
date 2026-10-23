// The cart checked against the server for one way of getting it (delivery or
// pickup), with the chosen area for delivery.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { quoteItems, useCart, type CartLine } from "@/store/cart";
import { usePrefs } from "@/store/prefs";

export function useQuote(fulfilment?: "delivery" | "pickup") {
  const lines = useCart((s) => s.lines);
  const area = usePrefs((s) => s.area);
  const quote = useQuery(
    api.checkout.quote,
    lines.length > 0
      ? { items: quoteItems(lines), ...(fulfilment ? { fulfilment } : {}), ...(area ? { serviceAreaId: area.serviceAreaId } : {}) }
      : "skip",
  );
  return { quote, lines, area };
}

export type FarmGroup = { farmId: string; farmName: string; lines: CartLine[] };

/** Cart lines by farm, in the order the farms were first added. */
export function groupByFarm(lines: CartLine[]): FarmGroup[] {
  const groups: FarmGroup[] = [];
  for (const l of lines) {
    const g = groups.find((x) => x.farmId === l.farmId);
    if (g) g.lines.push(l);
    else groups.push({ farmId: l.farmId, farmName: l.farmName, lines: [l] });
  }
  return groups;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
