import { v } from "convex/values";
import { query } from "./_generated/server";
import { readCount, subtypeKey } from "./lib/listingCounts";

/** Visible categories in display order (M-11, home category row). */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_hidden_and_sortOrder", (q) => q.eq("hidden", false))
      .take(50);
  },
});

export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return category === null || category.hidden ? null : category;
  },
});

/** Units farmers can choose for new listings (retired units are hidden). */
export const listUnits = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("units")
      .withIndex("by_retired_and_sortOrder", (q) => q.eq("retired", false))
      .take(100);
  },
});

/**
 * W-02 All categories: visible categories in display order, each with its
 * product count (live listings of open farms) and its subtypes with counts.
 */
export const listCategoriesWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_hidden_and_sortOrder", (q) => q.eq("hidden", false))
      .take(50);
    return await Promise.all(
      categories.map(async (c) => ({
        ...c,
        subtypes: await Promise.all(
          (c.subtypes ?? []).map(async (s) => ({
            slug: s.slug,
            name: s.name,
            count: await readCount(ctx, "subtype", subtypeKey(c._id, s.slug)),
          })),
        ),
        productCount: await readCount(ctx, "category", c._id),
      })),
    );
  },
});
