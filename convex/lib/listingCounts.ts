// Shop counters (schema `listingCounts`): live listings per farm, and live
// listings of open farms per category and per category subtype. Every listing
// write goes through insertListing / patchListing, and every change to a
// farm's status or holiday mode through farmVisibilityChanged, so the counts
// stay right without counting rows in queries.
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Scope = "farm" | "category" | "subtype";
type ListingFields = Pick<Doc<"listings">, "farmId" | "status" | "categoryId" | "subtype" | "deletedAt">;

/** Shoppers can buy from the farm: active and not on holiday. */
export const farmIsOpen = (farm: Pick<Doc<"farms">, "status" | "holidayMode"> | null) =>
  farm !== null && farm.status === "active" && !farm.holidayMode;

/** A listing that shows in the shop when its farm is open. */
export const isShopListing = (l: Pick<Doc<"listings">, "status" | "deletedAt">) =>
  l.status === "live" && l.deletedAt === undefined;

export const subtypeKey = (categoryId: Id<"categories">, subtype: string) => `${categoryId}:${subtype}`;

/** The counters one listing adds 1 to. */
function keysOf(l: ListingFields | null, farmOpen: boolean): string[] {
  if (l === null || !isShopListing(l)) return [];
  const keys = [`farm|${l.farmId}`];
  if (farmOpen && l.categoryId !== undefined) {
    keys.push(`category|${l.categoryId}`);
    if (l.subtype !== undefined) keys.push(`subtype|${subtypeKey(l.categoryId, l.subtype)}`);
  }
  return keys;
}

async function bump(ctx: MutationCtx, scopedKey: string, by: number) {
  const [scope, key] = scopedKey.split("|") as [Scope, string];
  const row = await ctx.db
    .query("listingCounts")
    .withIndex("by_scope_and_key", (q) => q.eq("scope", scope).eq("key", key))
    .unique();
  if (row === null) {
    await ctx.db.insert("listingCounts", { scope, key, count: Math.max(0, by) });
  } else {
    await ctx.db.patch("listingCounts", row._id, { count: Math.max(0, row.count + by) });
  }
}

async function applyDiff(ctx: MutationCtx, before: string[], after: string[]) {
  for (const k of before) if (!after.includes(k)) await bump(ctx, k, -1);
  for (const k of after) if (!before.includes(k)) await bump(ctx, k, 1);
}

/** Updates the counters for a listing that changed from `before` to `after` (null = didn't exist). */
export async function syncListingCounts(ctx: MutationCtx, before: ListingFields | null, after: ListingFields | null) {
  const farmId = after?.farmId ?? before?.farmId;
  if (farmId === undefined) return;
  const changed =
    before === null ||
    after === null ||
    before.status !== after.status ||
    before.categoryId !== after.categoryId ||
    before.subtype !== after.subtype ||
    before.deletedAt !== after.deletedAt;
  if (!changed) return;
  const open = farmIsOpen(await ctx.db.get("farms", farmId));
  await applyDiff(ctx, keysOf(before, open), keysOf(after, open));
}

/** ctx.db.patch for listings, keeping the shop counters right. */
export async function patchListing(
  ctx: MutationCtx,
  listing: Doc<"listings">,
  fields: Partial<Omit<Doc<"listings">, "_id" | "_creationTime">>,
) {
  await ctx.db.patch("listings", listing._id, fields);
  await syncListingCounts(ctx, listing, { ...listing, ...fields });
}

/** ctx.db.insert for listings, keeping the shop counters right. */
export async function insertListing(ctx: MutationCtx, fields: Omit<Doc<"listings">, "_id" | "_creationTime">) {
  const id = await ctx.db.insert("listings", fields);
  await syncListingCounts(ctx, null, fields);
  return id;
}

const FARM_LISTING_SCAN = 1000;

/**
 * A farm opened or closed for shoppers (suspended, reinstated, holiday mode):
 * its live listings join or leave the category and subtype counts.
 */
export async function farmVisibilityChanged(ctx: MutationCtx, before: Doc<"farms">, after: Doc<"farms">) {
  const wasOpen = farmIsOpen(before);
  const isOpen = farmIsOpen(after);
  if (wasOpen === isOpen) return;
  const live = await ctx.db
    .query("listings")
    .withIndex("by_farmId_and_status", (q) => q.eq("farmId", after._id).eq("status", "live"))
    .take(FARM_LISTING_SCAN);
  for (const l of live) await applyDiff(ctx, keysOf(l, wasOpen), keysOf(l, isOpen));
}

/** One counter's value (0 when it has never been set). */
export async function readCount(ctx: QueryCtx, scope: Scope, key: string): Promise<number> {
  const row = await ctx.db
    .query("listingCounts")
    .withIndex("by_scope_and_key", (q) => q.eq("scope", scope).eq("key", key))
    .unique();
  return row?.count ?? 0;
}
