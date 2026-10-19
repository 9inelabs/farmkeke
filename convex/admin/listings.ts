// Admin stand-ins for A-40 All listings, A-41 Listing review queue, A-42
// Listing detail and A-43 Send back or unpublish.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { isOutOfStock, SEND_BACK_REASONS } from "../lib/listing";
import { notify } from "../lib/notify";
import { patchListing } from "../lib/listingCounts";
import { listingStatus } from "../schema";


/** A-40: listings by status, optionally one category or one farm. */
export const list = query({
  args: {
    status: v.optional(listingStatus),
    categoryId: v.optional(v.id("categories")),
    farmId: v.optional(v.id("farms")),
    // Name search (A-40). With it, farmId is ignored.
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "listings.view");
    const status = args.status ?? "live";
    const search = args.search?.trim();
    const page = search
      ? await ctx.db
          .query("listings")
          .withSearchIndex("search_name", (q) => {
            const byStatus = q.search("name", search).eq("status", status);
            return args.categoryId !== undefined ? byStatus.eq("categoryId", args.categoryId) : byStatus;
          })
          .paginate(args.paginationOpts)
      : await (args.farmId !== undefined
          ? ctx.db.query("listings").withIndex("by_farmId_and_status", (q) => q.eq("farmId", args.farmId!).eq("status", status))
          : args.categoryId !== undefined
            ? ctx.db.query("listings").withIndex("by_categoryId_and_status", (q) => q.eq("categoryId", args.categoryId).eq("status", status))
            : ctx.db.query("listings").withIndex("by_status_and_submittedAt", (q) => q.eq("status", status))
        )
          .order("desc")
          .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page
          .filter((l) => l.deletedAt === undefined)
          .map(async (l) => ({
            _id: l._id,
            name: l.name,
            status: l.status,
            farmId: l.farmId,
            farmName: (await ctx.db.get("farms", l.farmId))?.name ?? null,
            outOfStock: isOutOfStock(l.units),
            submittedAt: l.submittedAt ?? null,
            liveAt: l.liveAt ?? null,
            coverUrl: l.photoIds[0] ? await ctx.storage.getUrl(l.photoIds[0]) : null,
          })),
      ),
    };
  },
});

/** A-41 badge: listings waiting for review (up to 99). */
export const queueCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "listings.view");
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "under_review"))
      .take(99);
    return rows.length;
  },
});

/** A-41: waiting for review, oldest first. */
export const queue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "listings.view");
    const page = await ctx.db
      .query("listings")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "under_review"))
      .order("asc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (l) => ({
          _id: l._id,
          name: l.name,
          farmName: (await ctx.db.get("farms", l.farmId))?.name ?? null,
          coverUrl: l.photoIds[0] ? await ctx.storage.getUrl(l.photoIds[0]) : null,
          submittedAt: l.submittedAt ?? null,
        })),
      ),
    };
  },
});

/** A-42: everything about one listing, with photos and its price/unit history. */
export const get = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "listings.view");
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null) return null;
    const farm = await ctx.db.get("farms", listing.farmId);
    const category = listing.categoryId ? await ctx.db.get("categories", listing.categoryId) : null;
    const units = await Promise.all(listing.units.map(async (u) => ({ ...u, unit: (await ctx.db.get("units", u.unitId))?.singular ?? "unit" })));
    const history = await ctx.db
      .query("listingEvents")
      .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
      .order("desc")
      .take(100);
    return {
      listing,
      farm: farm === null ? null : { _id: farm._id, name: farm.name, trusted: farm.trusted, status: farm.status },
      category: category?.name ?? null,
      units,
      photoUrls: await Promise.all(listing.photoIds.map((id) => ctx.storage.getUrl(id))),
      history,
      sendBackReasons: SEND_BACK_REASONS,
    };
  },
});

async function moderate(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  from: ("under_review" | "live" | "paused")[],
  change: { status: "live" | "needs_changes"; reviewNote?: string },
  action: string,
  reason: string,
) {
  const actor = await requireStaff(ctx, "listings.review");
  const listing = await ctx.db.get("listings", listingId);
  if (listing === null || listing.deletedAt !== undefined) throw new ConvexError("Listing not found");
  if (!(from as string[]).includes(listing.status)) throw new ConvexError(`This listing is ${listing.status}`);
  await patchListing(ctx, listing, {
    status: change.status,
    reviewNote: change.reviewNote,
    liveAt: change.status === "live" ? (listing.liveAt ?? Date.now()) : listing.liveAt,
  });
  await ctx.db.insert("listingEvents", {
    listingId: listing._id,
    actorId: actor._id,
    kind: action,
    details: JSON.stringify({ reason, note: change.reviewNote ?? null }),
  });
  await writeAudit(ctx, { actorId: actor._id, action: `listing.${action}`, targetTable: "listings", targetId: listing._id, reason });
  // F-20 / F-31: tell the farm (push, and email per F-75)
  const farm = await ctx.db.get("farms", listing.farmId);
  if (farm !== null) {
    const approved = change.status === "live";
    await notify(ctx, {
      userId: farm.userId,
      side: "farm",
      kind: approved ? "listing_approved" : action === "unpublished" ? "listing_unpublished" : "listing_sent_back",
      title: approved ? `${listing.name} is live` : action === "unpublished" ? `${listing.name} was taken down` : `${listing.name} needs changes`,
      body: approved ? "Shoppers can now find and buy it." : (change.reviewNote ?? reason).slice(0, 140),
      href: `/listing/${listing._id}`,
    });
  }
}

export const approve = mutation({
  args: { listingId: v.id("listings"), reason: v.string() },
  handler: async (ctx, args) => {
    await moderate(ctx, args.listingId, ["under_review"], { status: "live" }, "approved", args.reason);
  },
});

/** A-43: return a listing waiting for review, saying what to fix (F-31). */
export const sendBack = mutation({
  args: { listingId: v.id("listings"), reason: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const note = [args.reason.trim(), args.note?.trim()].filter(Boolean).join(". ");
    await moderate(ctx, args.listingId, ["under_review"], { status: "needs_changes", reviewNote: note }, "sent_back", args.reason);
  },
});

/** A-43: take down a live or paused listing, saying what to fix (F-31). */
export const unpublish = mutation({
  args: { listingId: v.id("listings"), reason: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const note = [args.reason.trim(), args.note?.trim()].filter(Boolean).join(". ");
    await moderate(ctx, args.listingId, ["live", "paused"], { status: "needs_changes", reviewNote: note }, "unpublished", args.reason);
  },
});
