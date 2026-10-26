// Home's product rows (M-10 / W-01, 26 Oct 2026). Each row picks from the
// same pool of buyable listings (live, in stock, from an open farm) in its
// own way, up to 10 products:
//
//   Fresh Picks             newest listings, at most 2 per farm
//   Near You                the shopper's LGA, then state, then by distance
//   Almost Gone             3 or fewer left of the main unit, fewest first
//   Best Sellers This Week  most paid orders in the last 7 days (needs 3+ selling)
//   Top-Rated Farms         farms at 4.5★+ from 5+ reviews, best farms first
//   Buy Again               the shopper's own past completed orders, newest first
//   Great Value             (instead of Buy Again for new shoppers) at least 10%
//                           under the typical price for the same kind of product
//
// A product shown in a row higher up is left out of the rows below, unless
// that would leave a row with fewer than 4 (then repeats top it up). Buy
// Again keeps everything: those are the shopper's own staples. Empty rows
// are hidden.
import type { Doc, Id } from "../_generated/dataModel";
import type { Entry } from "./shop";

export type SectionKey = "fresh" | "near" | "almost_gone" | "best_sellers" | "top_rated" | "buy_again" | "great_value";

export const SECTION_TITLES: Record<SectionKey, string> = {
  fresh: "Fresh Picks",
  near: "Near You",
  almost_gone: "Almost Gone",
  best_sellers: "Best Sellers This Week",
  top_rated: "Top-Rated Farms",
  buy_again: "Buy Again",
  great_value: "Great Value",
};

export const ROW = 10;
// A row smaller than this is topped up with products already shown above
const MIN_ROW = 4;
// "Almost Gone": this many or fewer left
export const ALMOST_GONE_MAX = 3;
// Near You: farms outside the shopper's state count when this close
const NEAR_KM = 60;
// Top-Rated Farms
const TOP_RATING = 4.5;
const TOP_MIN_REVIEWS = 5;
// Best Sellers needs this many products with sales before it shows
const BEST_SELLERS_MIN = 3;
// Great Value: at least this far under the typical price, in groups of 3+
const VALUE_CUT = 0.9;
const VALUE_MIN_GROUP = 3;

/** One buyable listing, with what the rows rank on. */
export type Candidate = Entry & {
  /** When it went live (or was submitted) */
  newest: number;
  /** How many of the main unit are left */
  left: number;
  /** The main unit sold (price comparisons are like for like) */
  unitId: Id<"units">;
};

export function candidateOf(e: Entry): Candidate | null {
  if (!e.inStock) return null;
  const offer = e.listing.units.find((u) => u.stock > 0);
  if (offer === undefined) return null;
  return {
    ...e,
    newest: e.listing.liveAt ?? e.listing.submittedAt ?? e.listing._creationTime,
    left: offer.stock,
    unitId: offer.unitId,
  };
}

const byNewest = (a: Candidate, b: Candidate) => b.newest - a.newest;

/** At most `n` per farm, keeping the order. */
function perFarm(list: Candidate[], n: number) {
  const counts = new Map<Id<"farms">, number>();
  return list.filter((c) => {
    const k = counts.get(c.farm._id) ?? 0;
    if (k >= n) return false;
    counts.set(c.farm._id, k + 1);
    return true;
  });
}

export function freshPicks(pool: Candidate[]) {
  return perFarm([...pool].sort(byNewest), 2);
}

export function nearYou(pool: Candidate[], area: { state?: string; lga?: string }, hasPosition: boolean) {
  if (area.state === undefined && !hasPosition) return [];
  const rank = (c: Candidate) =>
    area.lga !== undefined && c.farm.lga === area.lga && c.farm.state === area.state ? 0 : c.farm.state === area.state ? 1 : 2;
  const close = pool.filter((c) => c.farm.state === area.state || (c.distanceKm !== null && c.distanceKm <= NEAR_KM));
  return perFarm(
    close.sort((a, b) => rank(a) - rank(b) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byNewest(a, b)),
    3,
  );
}

export function almostGone(pool: Candidate[]) {
  return perFarm(
    pool.filter((c) => c.left > 0 && c.left <= ALMOST_GONE_MAX).sort((a, b) => a.left - b.left || byNewest(a, b)),
    2,
  );
}

/** `sold`: paid orders per listing in the last 7 days. */
export function bestSellers(pool: Candidate[], sold: Map<Id<"listings">, number>) {
  const selling = pool.filter((c) => (sold.get(c.listing._id) ?? 0) > 0);
  if (selling.length < BEST_SELLERS_MIN) return [];
  return selling.sort(
    (a, b) => (sold.get(b.listing._id) ?? 0) - (sold.get(a.listing._id) ?? 0) || (b.rating ?? 0) - (a.rating ?? 0) || byNewest(a, b),
  );
}

/**
 * Farms at 4.5★ or more from 5+ reviews, ranked so a farm with many good
 * reviews beats one lucky 5★ (a weighted average, pulled towards 4.2 when
 * there are few). Each farm's newest product first, then the next round.
 */
export function topRated(pool: Candidate[]) {
  const score = (c: Candidate) => (5 * 4.2 + (c.rating ?? 0) * c.ratingCount) / (5 + c.ratingCount);
  const good = pool.filter((c) => c.rating !== null && c.rating >= TOP_RATING && c.ratingCount >= TOP_MIN_REVIEWS);
  const farms = new Map<Id<"farms">, Candidate[]>();
  for (const c of [...good].sort(byNewest)) farms.set(c.farm._id, [...(farms.get(c.farm._id) ?? []), c]);
  const ranked = [...farms.values()].sort((a, b) => score(b[0]!) - score(a[0]!));
  const out: Candidate[] = [];
  for (let round = 0; out.length < good.length; round++) {
    for (const list of ranked) if (list[round]) out.push(list[round]!);
  }
  return out;
}

/** `bought`: the shopper's past listings, most recently bought first. */
export function buyAgain(pool: Candidate[], bought: Id<"listings">[]) {
  const byId = new Map(pool.map((c) => [c.listing._id, c]));
  return bought.map((id) => byId.get(id)).filter((c): c is Candidate => c !== undefined);
}

/** Priced at least 10% under the median for the same category and unit; the best deals first. */
export function greatValue(pool: Candidate[]) {
  const groups = new Map<string, Candidate[]>();
  for (const c of pool) {
    if (c.listing.categoryId === undefined) continue;
    const key = `${c.listing.categoryId}|${c.unitId}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const deals: { c: Candidate; ratio: number }[] = [];
  for (const list of groups.values()) {
    if (list.length < VALUE_MIN_GROUP) continue;
    const prices = list.map((c) => c.priceKobo).sort((a, b) => a - b);
    const mid = prices.length / 2;
    const median = prices.length % 2 ? prices[Math.floor(mid)]! : (prices[mid - 1]! + prices[mid]!) / 2;
    for (const c of list) if (c.priceKobo <= median * VALUE_CUT) deals.push({ c, ratio: c.priceKobo / median });
  }
  return deals.sort((a, b) => a.ratio - b.ratio || byNewest(a.c, b.c)).map((d) => d.c);
}

/** Lays the rows out top to bottom, leaving out products already shown higher up. */
export function arrange(rows: { key: SectionKey; list: Candidate[]; keepRepeats?: boolean }[]) {
  const seen = new Set<Id<"listings">>();
  const out: { key: SectionKey; items: Candidate[] }[] = [];
  for (const row of rows) {
    const unseen = row.keepRepeats ? row.list : row.list.filter((c) => !seen.has(c.listing._id));
    const repeats = row.keepRepeats ? [] : row.list.filter((c) => seen.has(c.listing._id));
    const size = Math.min(ROW, Math.max(unseen.length, Math.min(MIN_ROW, row.list.length)));
    const items = [...unseen, ...repeats].slice(0, size);
    if (items.length === 0) continue;
    for (const c of items) seen.add(c.listing._id);
    out.push({ key: row.key, items });
  }
  return out;
}

/** The start of the last 7 days (today and the 6 before it), as a timestamp. */
export function weekStart(today: string): number {
  const t = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(t) ? t - 6 * 86_400_000 : 0;
}

// Orders that count as sales (not the ones that ended without going through)
const NOT_SALES = new Set<Doc<"orders">["status"]>(["declined", "expired", "cancelled", "awaiting_payment"]);
export const countsAsSale = (o: Doc<"orders">) => o.paidAt !== undefined && !NOT_SALES.has(o.status);

// The shopper's orders that reached them
export const BOUGHT = new Set<Doc<"orders">["status"]>(["delivered", "collected", "completed"]);
