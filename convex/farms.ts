// Farmer mode: the farmer's own farm (F-10, F-14, F-15, F-70 to F-73).
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireFarmer } from "./lib/auth";
import { validateImageUpload } from "./lib/uploads";
import { requireOpeningHours } from "./lib/validate";
import { openingHours } from "./schema";

/** The signed-in farmer's farm with its setup checklist, or null. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return null;
    const farm = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", user._id)).unique();
    if (farm === null) return null;
    const categories = await Promise.all(farm.categoryIds.map((id) => ctx.db.get("categories", id)));
    // F-14 "First listing": any listing that has been submitted.
    let hasListing = false;
    for (const status of ["live", "under_review", "paused", "needs_changes"] as const) {
      const first = await ctx.db
        .query("listings")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", status))
        .first();
      if (first !== null) {
        hasListing = true;
        break;
      }
    }
    return {
      ...farm,
      // Payout details stay on the server; the app shows the bank and last 4 digits.
      accountNumber: undefined,
      accountLast4: farm.accountNumber.slice(-4),
      photoUrl: farm.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
      categories: categories.filter((c) => c !== null).map((c) => ({ _id: c._id, name: c.name })),
      checklist: {
        profile: farm.profileConfirmedAt !== undefined,
        collection: farm.collectionConfirmedAt !== undefined,
        firstListing: hasListing,
      },
    };
  },
});

/** F-70 Business profile. */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const { farm } = await requireFarmer(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
    const address = args.address.trim();
    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (name.length > 80 || description.length > 600) throw new ConvexError({ code: "TOO_LONG" });
    if (address.length === 0) throw new ConvexError({ code: "ADDRESS_REQUIRED" });
    if (args.photoStorageId !== undefined && args.photoStorageId !== farm.photoStorageId) {
      await validateImageUpload(ctx, args.photoStorageId);
      if (farm.photoStorageId) await ctx.storage.delete(farm.photoStorageId);
    }
    await ctx.db.patch("farms", farm._id, {
      name,
      description: description || undefined,
      address,
      photoStorageId: args.photoStorageId ?? farm.photoStorageId,
      profileConfirmedAt: farm.profileConfirmedAt ?? Date.now(),
    });
  },
});

/** F-71 Fulfilment settings: when and where Farmkeke riders collect. */
export const updateFulfilment = mutation({
  args: { collectionAddress: v.string(), collectionHours: openingHours, leadTimeHours: v.number() },
  handler: async (ctx, args) => {
    const { farm } = await requireFarmer(ctx);
    const collectionAddress = args.collectionAddress.trim();
    if (collectionAddress.length === 0) throw new ConvexError({ code: "ADDRESS_REQUIRED" });
    if (args.collectionHours.length === 0) throw new ConvexError({ code: "HOURS_REQUIRED" });
    requireOpeningHours(args.collectionHours);
    if (![4, 12, 24, 48].includes(args.leadTimeHours)) throw new ConvexError({ code: "INVALID_LEAD_TIME" });
    await ctx.db.patch("farms", farm._id, {
      collectionAddress,
      collectionHours: args.collectionHours,
      leadTimeHours: args.leadTimeHours,
      collectionConfirmedAt: farm.collectionConfirmedAt ?? Date.now(),
    });
  },
});

/** F-72 Availability: open days and holiday mode (holiday mode hides listings). */
export const updateAvailability = mutation({
  args: { openDays: v.array(v.number()), holidayMode: v.boolean() },
  handler: async (ctx, args) => {
    const { farm } = await requireFarmer(ctx);
    const days = [...new Set(args.openDays)].sort();
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new ConvexError({ code: "INVALID_DAYS" });
    await ctx.db.patch("farms", farm._id, { openDays: days, holidayMode: args.holidayMode });
  },
});

/** F-73 Verification and documents. */
export const myDocuments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return [];
    const docs = await ctx.db
      .query("farmerDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    const farm = await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", user._id)).unique();
    const relevant = farm ? docs.filter((d) => d.applicationId === farm.applicationId) : docs;
    return await Promise.all(relevant.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })));
  },
});

/** F-73: replace a rejected or expired document; staff review it again. */
export const replaceDocument = mutation({
  args: { documentId: v.id("farmerDocuments"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { user, farm } = await requireFarmer(ctx);
    const doc = await ctx.db.get("farmerDocuments", args.documentId);
    if (doc === null || doc.userId !== user._id || doc.applicationId !== farm.applicationId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    if (doc.status !== "rejected" && doc.status !== "expired") throw new ConvexError({ code: "NOT_REPLACEABLE" });
    await validateImageUpload(ctx, args.storageId);
    await ctx.storage.delete(doc.storageId);
    await ctx.db.patch("farmerDocuments", doc._id, { storageId: args.storageId, status: "pending", note: undefined });
  },
});

