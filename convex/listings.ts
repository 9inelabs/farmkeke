// Farmer mode: listings (F-20 to F-31).
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getViewer, requireFarmer } from "./lib/auth";
import { isOutOfStock, listingProblems, MAX_LISTING_PHOTOS, MAX_PRICE_KOBO, MAX_STOCK } from "./lib/listing";
import { insertListing, patchListing } from "./lib/listingCounts";
import { validateImageUpload } from "./lib/uploads";
import { listingUnit } from "./schema";

const REVIEW_HOURS = 24;

async function logEvent(ctx: MutationCtx, listingId: Id<"listings">, actorId: Id<"users">, kind: string, details?: unknown) {
  await ctx.db.insert("listingEvents", {
    listingId,
    actorId,
    kind,
    details: details === undefined ? undefined : JSON.stringify(details),
  });
}

/** The caller's own (not deleted) listing, or a NOT_FOUND error. */
async function ownListing(ctx: MutationCtx, listingId: Id<"listings">) {
  const { user, farm } = await requireFarmer(ctx);
  const listing = await ctx.db.get("listings", listingId);
  if (listing === null || listing.farmId !== farm._id || listing.deletedAt !== undefined) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }
  return { user, farm, listing };
}

const requireActive = (farm: Doc<"farms">) => {
  if (farm.status !== "active") throw new ConvexError({ code: "FARM_SUSPENDED" });
};

/**
 * Changing what buyers see (photos, name, category, description) on a live
 * listing sends it back to review, unless the farm is trusted (A-31).
 */
async function afterContentEdit(ctx: MutationCtx, farm: Doc<"farms">, before: Doc<"listings">) {
  if (farm.trusted) return;
  // Read it again: the caller has just patched it.
  const listing = await ctx.db.get("listings", before._id);
  if (listing !== null && (listing.status === "live" || listing.status === "paused")) {
    await patchListing(ctx, listing, { status: "under_review", submittedAt: Date.now() });
  }
}

async function unitNames(ctx: QueryCtx, units: Doc<"listings">["units"]) {
  return await Promise.all(
    units.map(async (u) => {
      const unit = await ctx.db.get("units", u.unitId);
      return { ...u, singular: unit?.singular ?? "unit", plural: unit?.plural ?? "units" };
    }),
  );
}

/** F-20: every listing of the caller's farm, with what each tab needs. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return [];
    const farm = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", user._id)).unique();
    if (farm === null) return [];
    const statuses = ["live", "under_review", "needs_changes", "paused", "draft"] as const;
    const all: Doc<"listings">[] = [];
    for (const status of statuses) {
      all.push(
        ...(await ctx.db
          .query("listings")
          .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", status))
          .order("desc")
          .take(200)),
      );
    }
    return await Promise.all(
      all
        .filter((l) => l.deletedAt === undefined)
        .map(async (l) => ({
          _id: l._id,
          _creationTime: l._creationTime,
          name: l.name,
          status: l.status,
          outOfStock: l.status === "live" && isOutOfStock(l.units),
          coverUrl: l.photoIds[0] ? await ctx.storage.getUrl(l.photoIds[0]) : null,
          units: await unitNames(ctx, l.units),
          reviewNote: l.reviewNote ?? null,
        })),
    );
  },
});

/** One of the caller's listings with photo URLs and unit names (F-21 to F-31). */
export const get = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return null;
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) return null;
    const farm = await ctx.db.get("farms", listing.farmId);
    if (farm === null || farm.userId !== user._id) return null;
    const category = listing.categoryId ? await ctx.db.get("categories", listing.categoryId) : null;
    return {
      ...listing,
      photos: await Promise.all(listing.photoIds.map(async (id) => ({ storageId: id, url: await ctx.storage.getUrl(id) }))),
      units: await unitNames(ctx, listing.units),
      categoryName: category?.name ?? null,
      farm: { name: farm.name, lga: farm.lga, state: farm.state, trusted: farm.trusted, photoUrl: farm.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null },
      problems: listingProblems(listing),
      outOfStock: isOutOfStock(listing.units),
      expectedReviewAt: listing.status === "under_review" && listing.submittedAt ? listing.submittedAt + REVIEW_HOURS * 3_600_000 : null,
    };
  },
});

/** F-20 "Add listing": starts a draft. */
export const createDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, farm } = await requireFarmer(ctx);
    requireActive(farm);
    const listingId = await insertListing(ctx, {
      farmId: farm._id,
      status: "draft",
      name: "",
      photoIds: [],
      units: [],
      delivery: true,
      pickup: true,
    });
    await logEvent(ctx, listingId, user._id, "created");
    return listingId;
  },
});

/** F-21: photos in display order; the first is the cover. */
export const savePhotos = mutation({
  args: { listingId: v.id("listings"), photoIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const { farm, listing } = await ownListing(ctx, args.listingId);
    const ids = [...new Set(args.photoIds)];
    if (ids.length > MAX_LISTING_PHOTOS) throw new ConvexError({ code: "TOO_MANY_PHOTOS" });
    for (const id of ids) if (!listing.photoIds.includes(id)) await validateImageUpload(ctx, id);
    for (const old of listing.photoIds) if (!ids.includes(old)) await ctx.storage.delete(old);
    const changed = ids.join() !== listing.photoIds.join();
    await patchListing(ctx, listing, { photoIds: ids });
    if (changed) await afterContentEdit(ctx, farm, listing);
  },
});

/** F-22: name, category, description, harvest date, and (Phase 3c) the category subtype. */
export const saveDetails = mutation({
  args: {
    listingId: v.id("listings"),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.string(),
    harvestedOn: v.optional(v.string()),
    // Slug of one of the category's subtypes (W-03 "Type"); left out = none
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { farm, listing } = await ownListing(ctx, args.listingId);
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (name.length > 60 || description.length > 600) throw new ConvexError({ code: "TOO_LONG" });
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null || category.hidden) throw new ConvexError({ code: "UNKNOWN_CATEGORY" });
    if (args.subtype !== undefined && !(category.subtypes ?? []).some((s) => s.slug === args.subtype)) {
      throw new ConvexError({ code: "UNKNOWN_SUBTYPE" });
    }
    if (args.harvestedOn !== undefined) {
      const date = new Date(`${args.harvestedOn}T12:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.harvestedOn) || Number.isNaN(date.getTime())) throw new ConvexError({ code: "INVALID_DATE" });
      // Not in the future (one day of slack for time zones), not over 90 days old.
      if (date.getTime() > Date.now() + 86_400_000 || date.getTime() < Date.now() - 90 * 86_400_000) {
        throw new ConvexError({ code: "INVALID_DATE" });
      }
    }
    const changed =
      name !== listing.name ||
      args.categoryId !== listing.categoryId ||
      args.subtype !== listing.subtype ||
      description !== (listing.description ?? "");
    await patchListing(ctx, listing, {
      name,
      categoryId: args.categoryId,
      subtype: args.subtype,
      description: description || undefined,
      harvestedOn: args.harvestedOn,
    });
    if (changed) await afterContentEdit(ctx, farm, listing);
  },
});

function checkUnits(units: { priceKobo: number; stock: number; minOrder: number }[]) {
  for (const u of units) {
    if (!Number.isInteger(u.priceKobo) || u.priceKobo <= 0 || u.priceKobo > MAX_PRICE_KOBO) throw new ConvexError({ code: "INVALID_PRICE" });
    if (!Number.isInteger(u.stock) || u.stock < 0 || u.stock > MAX_STOCK) throw new ConvexError({ code: "INVALID_STOCK" });
    if (!Number.isInteger(u.minOrder) || u.minOrder < 1 || u.minOrder > MAX_STOCK) throw new ConvexError({ code: "INVALID_MIN_ORDER" });
  }
}

/** F-23: one or more units, each with its own price, stock and minimum order. */
export const savePricing = mutation({
  args: { listingId: v.id("listings"), units: v.array(listingUnit) },
  handler: async (ctx, args) => {
    const { user, listing } = await ownListing(ctx, args.listingId);
    if (args.units.length > 6) throw new ConvexError({ code: "TOO_MANY_UNITS" });
    if (new Set(args.units.map((u) => u.unitId)).size !== args.units.length) throw new ConvexError({ code: "DUPLICATE_UNIT" });
    checkUnits(args.units);
    for (const u of args.units) {
      const unit = await ctx.db.get("units", u.unitId);
      const alreadyUsed = listing.units.some((x) => x.unitId === u.unitId);
      // Retired units stay on listings that already use them (A-81).
      if (unit === null || (unit.retired && !alreadyUsed)) throw new ConvexError({ code: "UNKNOWN_UNIT" });
    }
    await patchListing(ctx, listing, { units: args.units });
    if (listing.status !== "draft") await logEvent(ctx, listing._id, user._id, "pricing_changed", { from: listing.units, to: args.units });
  },
});

/** F-24: delivery, pickup or both. */
export const saveFulfilment = mutation({
  args: { listingId: v.id("listings"), delivery: v.boolean(), pickup: v.boolean() },
  handler: async (ctx, args) => {
    const { listing } = await ownListing(ctx, args.listingId);
    if (!args.delivery && !args.pickup) throw new ConvexError({ code: "FULFILMENT_REQUIRED" });
    await patchListing(ctx, listing, { delivery: args.delivery, pickup: args.pickup });
  },
});

/** F-25 Submit (and F-31 resubmit): live straight away for trusted farms, otherwise reviewed. */
export const submit = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const { user, farm, listing } = await ownListing(ctx, args.listingId);
    requireActive(farm);
    if (listing.status === "live" || listing.status === "under_review") return { status: listing.status };
    const problems = listingProblems(listing);
    if (Object.keys(problems).length > 0) throw new ConvexError({ code: "INCOMPLETE", steps: Object.keys(problems) });
    const status = farm.trusted ? ("live" as const) : ("under_review" as const);
    await patchListing(ctx, listing, {
      status,
      submittedAt: Date.now(),
      liveAt: status === "live" ? Date.now() : listing.liveAt,
      reviewNote: undefined,
    });
    await logEvent(ctx, listing._id, user._id, status === "live" ? "published_trusted" : "submitted");
    return { status };
  },
});

/** F-28 Quick update: stock and price for each unit, applied straight away. */
export const quickUpdate = mutation({
  args: {
    listingId: v.id("listings"),
    units: v.array(v.object({ unitId: v.id("units"), priceKobo: v.number(), stock: v.number() })),
  },
  handler: async (ctx, args) => {
    const { user, listing } = await ownListing(ctx, args.listingId);
    const units = listing.units.map((u) => {
      const change = args.units.find((c) => c.unitId === u.unitId);
      return change ? { ...u, priceKobo: change.priceKobo, stock: change.stock } : u;
    });
    checkUnits(units);
    await patchListing(ctx, listing, { units });
    await logEvent(ctx, listing._id, user._id, "quick_update", { from: listing.units, to: units });
  },
});

/** F-29 / F-30: pause, resume, mark out of stock or delete one or many listings. */
export const bulkAction = mutation({
  args: {
    listingIds: v.array(v.id("listings")),
    action: v.union(v.literal("pause"), v.literal("resume"), v.literal("out_of_stock"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    const { user, farm } = await requireFarmer(ctx);
    if (args.listingIds.length === 0 || args.listingIds.length > 100) throw new ConvexError({ code: "INVALID_SELECTION" });
    if (args.action === "resume") requireActive(farm);
    let changed = 0;
    for (const listingId of args.listingIds) {
      const listing = await ctx.db.get("listings", listingId);
      if (listing === null || listing.farmId !== farm._id || listing.deletedAt !== undefined) continue;
      if (args.action === "pause" && listing.status === "live") {
        await patchListing(ctx, listing, { status: "paused" });
      } else if (args.action === "resume" && listing.status === "paused") {
        await patchListing(ctx, listing, { status: "live" });
      } else if (args.action === "out_of_stock" && listing.status !== "draft") {
        await patchListing(ctx, listing, { units: listing.units.map((u) => ({ ...u, stock: 0 })) });
      } else if (args.action === "delete") {
        // Kept (hidden) so past orders can still show what was bought.
        await patchListing(ctx, listing, { deletedAt: Date.now() });
      } else continue;
      await logEvent(ctx, listingId, user._id, args.action);
      changed++;
    }
    return { changed };
  },
});
