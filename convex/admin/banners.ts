// A-86 Home banners ("Harvest of the week"): the featured card on the app's
// and website's Home. Each points at a listing; the shop shows the first
// active banner whose listing can be bought (storefront.home).
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";

const MAX = 20;

const text = (value: string, field: string, max: number) => {
  const t = value.trim();
  if (t.length === 0) throw new ConvexError(`${field} is required`);
  if (t.length > max) throw new ConvexError(`${field} is too long (${max} characters at most)`);
  return t;
};

async function liveListing(ctx: MutationCtx, listingId: Id<"listings">) {
  const listing = await ctx.db.get("listings", listingId);
  if (listing === null || listing.deletedAt !== undefined) throw new ConvexError("Listing not found");
  if (listing.status !== "live") throw new ConvexError("Choose a live listing. Shoppers can't buy this one right now.");
  return listing;
}

/** Every banner in display order, with its listing (and whether it can show). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["content.manage", "listings.view"]);
    const rows = [
      ...(await ctx.db.query("homeBanners").withIndex("by_active_and_sortOrder", (q) => q.eq("active", true)).take(MAX)),
      ...(await ctx.db.query("homeBanners").withIndex("by_active_and_sortOrder", (q) => q.eq("active", false)).take(MAX)),
    ];
    let shownPicked = false;
    return await Promise.all(
      rows.map(async (b) => {
        const listing = await ctx.db.get("listings", b.listingId);
        const farm = listing ? await ctx.db.get("farms", listing.farmId) : null;
        const buyable = listing !== null && listing.status === "live" && farm?.status === "active" && !farm.holidayMode;
        // The shop shows the first active banner that can be bought.
        const shown = b.active && buyable && !shownPicked;
        if (shown) shownPicked = true;
        return {
          _id: b._id,
          tag: b.tag,
          title: b.title,
          buttonLabel: b.buttonLabel,
          active: b.active,
          sortOrder: b.sortOrder,
          shown,
          listing: listing
            ? {
                _id: listing._id,
                name: listing.name,
                status: listing.status,
                farmName: farm?.name ?? null,
                coverUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
              }
            : null,
          problem:
            listing === null
              ? "Its listing was deleted"
              : listing.status !== "live"
                ? "Its listing isn't live"
                : farm?.status !== "active"
                  ? "The farm is suspended"
                  : farm.holidayMode
                    ? "The farm is on holiday"
                    : null,
        };
      }),
    );
  },
});

const fields = {
  tag: v.string(),
  title: v.string(),
  buttonLabel: v.string(),
  listingId: v.id("listings"),
};

export const create = mutation({
  args: { ...fields, active: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    await liveListing(ctx, args.listingId);
    const all = await ctx.db.query("homeBanners").take(MAX * 2);
    if (all.length >= MAX * 2) throw new ConvexError("Too many banners. Delete old ones first.");
    const bannerId = await ctx.db.insert("homeBanners", {
      tag: text(args.tag, "Tag", 40),
      title: text(args.title, "Title", 80),
      buttonLabel: text(args.buttonLabel, "Button", 30),
      listingId: args.listingId,
      active: args.active,
      sortOrder: all.reduce((max, b) => Math.max(max, b.sortOrder), 0) + 1,
    });
    await writeAudit(ctx, { actorId: actor._id, action: "banner.create", targetTable: "homeBanners", targetId: bannerId, reason: args.reason });
    return bannerId;
  },
});

export const update = mutation({
  args: { bannerId: v.id("homeBanners"), ...fields, active: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    const banner = await ctx.db.get("homeBanners", args.bannerId);
    if (banner === null) throw new ConvexError("Banner not found");
    if (args.listingId !== banner.listingId || (args.active && !banner.active)) await liveListing(ctx, args.listingId);
    const changes = {
      tag: text(args.tag, "Tag", 40),
      title: text(args.title, "Title", 80),
      buttonLabel: text(args.buttonLabel, "Button", 30),
      listingId: args.listingId,
      active: args.active,
    };
    await ctx.db.patch("homeBanners", banner._id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "banner.update",
      targetTable: "homeBanners",
      targetId: banner._id,
      reason: args.reason,
      details: changes,
    });
    return null;
  },
});

/** Display order: the shop shows the first active banner that can be bought. */
export const reorder = mutation({
  args: { orderedIds: v.array(v.id("homeBanners")), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    for (const [index, id] of args.orderedIds.entries()) {
      if ((await ctx.db.get("homeBanners", id)) !== null) await ctx.db.patch("homeBanners", id, { sortOrder: index + 1 });
    }
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "banner.reorder",
      targetTable: "homeBanners",
      targetId: "*",
      reason: args.reason,
      details: { orderedIds: args.orderedIds },
    });
    return null;
  },
});

export const remove = mutation({
  args: { bannerId: v.id("homeBanners"), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    const banner = await ctx.db.get("homeBanners", args.bannerId);
    if (banner === null) return null;
    await ctx.db.delete("homeBanners", banner._id);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "banner.delete",
      targetTable: "homeBanners",
      targetId: banner._id,
      reason: args.reason,
      details: { title: banner.title },
    });
    return null;
  },
});
