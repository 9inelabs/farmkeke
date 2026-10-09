import { v } from "convex/values";
import { query } from "./_generated/server";

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
