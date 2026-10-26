// Home's product rows (lib/homeSections.ts): how each row picks and orders
// products, and how rows leave out what's already shown above.
import { expect, test } from "vitest";
import {
  almostGone,
  arrange,
  bestSellers,
  buyAgain,
  freshPicks,
  greatValue,
  nearYou,
  topRated,
  weekStart,
  type Candidate,
} from "../convex/lib/homeSections";

let n = 0;
/** A fake buyable listing: only the fields the rows look at. */
function c(o: { farm?: string; state?: string; lga?: string; km?: number | null; newest?: number; left?: number; rating?: number | null; reviews?: number; price?: number; category?: string; unit?: string } = {}): Candidate {
  const id = `l${++n}`;
  return {
    listing: { _id: id, categoryId: o.category ?? "veg", liveAt: o.newest ?? n, units: [] } as any,
    farm: { _id: o.farm ?? "f1", state: o.state ?? "Imo", lga: o.lga ?? "Owerri North" } as any,
    priceKobo: o.price ?? 100000,
    inStock: true,
    rating: o.rating === undefined ? null : o.rating,
    ratingCount: o.reviews ?? 0,
    distanceKm: o.km === undefined ? null : o.km,
    newest: o.newest ?? n,
    left: o.left ?? 20,
    unitId: (o.unit ?? "basket") as any,
  };
}
const ids = (list: Candidate[]) => list.map((x) => x.listing._id);

test("Fresh Picks: newest first, at most 2 per farm", () => {
  const a1 = c({ farm: "a", newest: 5 });
  const a2 = c({ farm: "a", newest: 4 });
  const a3 = c({ farm: "a", newest: 3 });
  const b1 = c({ farm: "b", newest: 1 });
  expect(ids(freshPicks([a3, b1, a1, a2]))).toEqual(ids([a1, a2, b1]));
});

test("Near You: same LGA, then same state, then close by; nothing without an area", () => {
  const lga = c({ farm: "a", lga: "Owerri North", km: 9 });
  const state = c({ farm: "b", lga: "Mbaise", km: 30 });
  const nextDoor = c({ farm: "c", state: "Abia", km: 40 });
  const far = c({ farm: "d", state: "Lagos", km: 500 });
  expect(ids(nearYou([far, nextDoor, state, lga], { state: "Imo", lga: "Owerri North" }, true))).toEqual(ids([lga, state, nextDoor]));
  expect(nearYou([lga], {}, false)).toEqual([]);
});

test("Almost Gone: 1 to 3 left, fewest first", () => {
  const three = c({ farm: "a", left: 3 });
  const one = c({ farm: "b", left: 1 });
  const plenty = c({ farm: "c", left: 4 });
  expect(ids(almostGone([three, plenty, one]))).toEqual(ids([one, three]));
});

test("Best Sellers: most orders this week; hidden until 3 products sell", () => {
  const x = c({ farm: "a" });
  const y = c({ farm: "b" });
  const z = c({ farm: "c" });
  const none = c({ farm: "d" });
  const sold = new Map<any, number>([[x.listing._id, 2], [y.listing._id, 5]]);
  expect(bestSellers([x, y, z, none], sold)).toEqual([]);
  sold.set(z.listing._id, 1);
  expect(ids(bestSellers([x, y, z, none], sold))).toEqual(ids([y, x, z]));
});

test("Top-Rated Farms: 4.5★ from 5+ reviews, many good reviews beat a few, farms take turns", () => {
  const many1 = c({ farm: "many", rating: 4.7, reviews: 120, newest: 9 });
  const many2 = c({ farm: "many", rating: 4.7, reviews: 120, newest: 8 });
  const lucky = c({ farm: "lucky", rating: 5, reviews: 5, newest: 7 });
  const tooFew = c({ farm: "few", rating: 5, reviews: 2 });
  const low = c({ farm: "low", rating: 4.2, reviews: 300 });
  expect(ids(topRated([many2, lucky, tooFew, low, many1]))).toEqual(ids([many1, lucky, many2]));
});

test("Buy Again: the shopper's own, most recent first, still buyable only", () => {
  const x = c();
  const y = c();
  expect(ids(buyAgain([x, y], [y.listing._id, "gone" as any, x.listing._id]))).toEqual(ids([y, x]));
});

test("Great Value: 10%+ under the typical price for the same category and unit", () => {
  const cheap = c({ price: 80000 });
  const typical = [c({ price: 100000 }), c({ price: 100000 }), c({ price: 110000 })];
  const otherUnit = c({ price: 10000, unit: "kg" });
  expect(ids(greatValue([...typical, cheap, otherUnit]))).toEqual(ids([cheap]));
});

test("rows leave out what's shown above, topping up to 4; empty rows are hidden", () => {
  const all = Array.from({ length: 6 }, () => c());
  const rows = arrange([
    { key: "fresh", list: all.slice(0, 3) },
    { key: "near", list: all.slice(0, 5) },
    { key: "almost_gone", list: [] },
    { key: "buy_again", list: all.slice(0, 2), keepRepeats: true },
  ]);
  expect(rows.map((r) => r.key)).toEqual(["fresh", "near", "buy_again"]);
  // Near You: its 2 unseen first, then repeats up to 4
  expect(ids(rows[1]!.items)).toEqual(ids([all[3]!, all[4]!, all[0]!, all[1]!]));
  expect(ids(rows[2]!.items)).toEqual(ids(all.slice(0, 2)));
  // Never more than 10
  expect(arrange([{ key: "fresh", list: Array.from({ length: 15 }, () => c()) }])[0]!.items).toHaveLength(10);
});

test("the week is today and the 6 days before", () => {
  expect(weekStart("2026-10-26")).toBe(Date.parse("2026-10-20T00:00:00Z"));
});
