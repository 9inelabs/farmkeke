// Reviews (M-73, W-57, F-80, farm ratings on W-06 / W-07). One review per
// order, after it's completed. reviewStats keeps each farm's running totals so
// ratings are cheap to read.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { getViewer, requireUser } from "./lib/auth";
import { notify, notifyConsumer } from "./lib/notify";

const MAX_COMMENT = 1000;
const MAX_TAGS = 8;
const MAX_TAG = 40;

/** A day after the consumer confirms: "How was your order?" (section 5, push). */
export const remind = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "completed" || order.reviewedAt !== undefined) return;
    const farm = await ctx.db.get("farms", order.farmId);
    await notifyConsumer(
      ctx,
      order,
      "review_reminder",
      "How was your order?",
      `Rate ${farm?.name ?? "the farm"} to help other shoppers.`,
    );
  },
});

/** "Adaeze N." — first name and initial (W-57). */
function shortName(name: string | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Farmkeke shopper";
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

function summaryOf(stats: Doc<"reviewStats"> | null) {
  if (stats === null || stats.count === 0) return { average: null, count: 0, stars: [0, 0, 0, 0, 0] };
  return {
    average: Math.round((stats.totalStars / stats.count) * 10) / 10,
    count: stats.count,
    stars: [0, 1, 2, 3, 4].map((i) => stats.byStars[i] ?? 0),
  };
}

const statsFor = (ctx: QueryCtx, farmId: Id<"farms">) =>
  ctx.db
    .query("reviewStats")
    .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
    .unique();

const publicReview = (r: Doc<"reviews">) => ({
  _id: r._id,
  rating: r.rating,
  tags: r.tags,
  comment: r.comment ?? null,
  reviewerName: r.reviewerName ?? null,
  createdAt: r._creationTime,
});

async function viewerFarm(ctx: QueryCtx) {
  const user = await getViewer(ctx);
  if (user === null || user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

/** M-73 / W-57: the order to rate, and the review if it's already done. */
export const forOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (user === null || order === null || order.userId !== user._id) return null;
    const farm = await ctx.db.get("farms", order.farmId);
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .unique();
    return {
      orderId: order._id,
      number: order.number,
      status: order.status,
      farmId: order.farmId,
      farmName: farm?.name ?? "Farm",
      farmPhotoUrl: farm?.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
      deliveredAt: order.deliveredAt ?? null,
      items: await Promise.all(
        order.items.map(async (i) => ({
          name: i.name,
          quantity: i.quantity,
          imageUrl: i.photoId ? await ctx.storage.getUrl(i.photoId) : null,
        })),
      ),
      canReview: order.status === "completed" && review === null,
      review: review === null ? null : publicReview(review),
    };
  },
});

/** Posts the one review for an order: 1 to 5 stars, tags, an optional comment. */
export const submit = mutation({
  args: { comment: v.optional(v.string()), orderId: v.id("orders"), rating: v.number(), tags: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.status !== "completed") throw new ConvexError({ code: "NOT_COMPLETED", status: order.status });
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError({ code: "INVALID_RATING" });
    }
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .unique();
    if (existing !== null || order.reviewedAt !== undefined) throw new ConvexError({ code: "ALREADY_REVIEWED" });
    const tags = [...new Set(args.tags.map((t) => t.trim()).filter(Boolean))];
    if (tags.length > MAX_TAGS || tags.some((t) => t.length > MAX_TAG)) throw new ConvexError({ code: "INVALID_TAGS" });
    const comment = args.comment?.trim() || undefined;
    if (comment !== undefined && comment.length > MAX_COMMENT) {
      throw new ConvexError({ code: "COMMENT_TOO_LONG", max: MAX_COMMENT });
    }

    const reviewId = await ctx.db.insert("reviews", {
      orderId: order._id,
      userId: user._id,
      farmId: order.farmId,
      rating: args.rating,
      tags,
      comment,
      reviewerName: shortName(user.isAnonymous ? order.contact.name : (user.name ?? order.contact.name)),
    });
    await ctx.db.patch("orders", order._id, { reviewedAt: Date.now() });

    const stats = await statsFor(ctx, order.farmId);
    if (stats === null) {
      const byStars = [0, 0, 0, 0, 0];
      byStars[args.rating - 1] = 1;
      await ctx.db.insert("reviewStats", { farmId: order.farmId, count: 1, totalStars: args.rating, byStars });
    } else {
      const byStars = [0, 1, 2, 3, 4].map((i) => (stats.byStars[i] ?? 0) + (i === args.rating - 1 ? 1 : 0));
      await ctx.db.patch("reviewStats", stats._id, {
        count: stats.count + 1,
        totalStars: stats.totalStars + args.rating,
        byStars,
      });
    }

    const farm = await ctx.db.get("farms", order.farmId);
    if (farm !== null) {
      await notify(ctx, {
        userId: farm.userId,
        side: "farm",
        kind: "review_received",
        title: `New ${args.rating}-star review`,
        body: comment ? comment.slice(0, 140) : `For order ${order.number}.`,
        href: "/farm/reviews",
        orderId: order._id,
      });
    }
    return { reviewId };
  },
});

/** A farm's rating: average (one decimal), count, and stars[0] = 1★ … stars[4] = 5★. */
export const summary = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => summaryOf(await statsFor(ctx, args.farmId)),
});

/** A farm's reviews, newest first. */
export const listPublic = query({
  args: { farmId: v.id("farms"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("reviews")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.filter((r) => r.hidden !== true).map(publicReview) };
  },
});

/** F-80: the signed-in farm's rating. */
export const mySummary = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return null;
    return summaryOf(await statsFor(ctx, farm._id));
  },
});

/** F-80: the farm's reviews, newest first, optionally one star rating only. */
export const listMine = query({
  args: { paginationOpts: paginationOptsValidator, stars: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return { page: [], isDone: true, continueCursor: "" };
    const stars = args.stars;
    const result =
      stars === undefined
        ? await ctx.db
            .query("reviews")
            .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("reviews")
            .withIndex("by_farmId_and_rating", (q) => q.eq("farmId", farm._id).eq("rating", stars))
            .order("desc")
            .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const order = await ctx.db.get("orders", r.orderId);
          return { ...publicReview(r), orderId: r.orderId, orderNumber: order?.number ?? "", hidden: r.hidden === true };
        }),
      ),
    };
  },
});
