// W-47 "Back in stock" and "Notify me". Every listing stock or status change
// (lib/listingCounts.patchListing, lib/orders takeStock and restoreStock) calls
// noteStockChange: it records when a listing sold out and when stock came back,
// and when the listing can be bought again it schedules the "Notify me" emails
// (favorites.notifyBackInStock).
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isOutOfStock } from "./listing";

type StockFields = Pick<Doc<"listings">, "units" | "status" | "deletedAt">;

/** A shopper can buy it: live, not removed, some stock left. */
export const isBuyable = (l: StockFields) => l.status === "live" && l.deletedAt === undefined && !isOutOfStock(l.units);

export async function noteStockChange(ctx: MutationCtx, listing: Doc<"listings">, before: StockFields, after: StockFields) {
  const wasOut = isOutOfStock(before.units);
  const isOut = isOutOfStock(after.units);
  const now = Date.now();
  if (!wasOut && isOut) {
    await ctx.db.patch("listings", listing._id, { soldOutAt: now });
  } else if (wasOut && !isOut) {
    await ctx.db.patch("listings", listing._id, { restockedAt: now });
  }
  if (!isBuyable(before) && isBuyable(after)) {
    await ctx.scheduler.runAfter(0, internal.favorites.notifyBackInStock, { listingId: listing._id });
  }
}
