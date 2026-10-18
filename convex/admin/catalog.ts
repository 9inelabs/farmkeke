// Admin stand-ins for A-80 Categories and A-81 Units of measure, until the
// Farmkeke Admin Portal exists. Run from the Convex dashboard or CLI.
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { requireSlug, requireText } from "../lib/validate";

const CATALOG_ROLES = ["operations" as const];

export const listAllCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, CATALOG_ROLES);
    const categories = await ctx.db.query("categories").take(100);
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    illustration: v.optional(v.string()),
    hidden: v.optional(v.boolean()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null) throw new ConvexError("Category not found");
    const changes = {
      ...(args.name !== undefined && { name: requireText(args.name, "Name") }),
      ...(args.illustration !== undefined && {
        illustration: requireSlug(args.illustration),
      }),
      ...(args.hidden !== undefined && { hidden: args.hidden }),
    };
    await ctx.db.patch("categories", category._id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "category.update",
      targetTable: "categories",
      targetId: category._id,
      reason: args.reason,
      details: changes,
    });
  },
});

export const createCategory = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    illustration: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    const slug = requireSlug(args.slug);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing !== null) throw new ConvexError("A category with this slug already exists");
    const last = await ctx.db.query("categories").take(100);
    const sortOrder = last.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
    const categoryId = await ctx.db.insert("categories", {
      slug,
      name: requireText(args.name, "Name"),
      illustration: requireSlug(args.illustration),
      sortOrder,
      hidden: false,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "category.create",
      targetTable: "categories",
      targetId: categoryId,
      reason: args.reason,
    });
    return categoryId;
  },
});

/**
 * W-02 / W-03 sub-chips: replaces a category's subtypes, in display order.
 * Listings keep a removed subtype's slug until the farmer edits them; the
 * shop then just has no chip for it.
 */
export const setSubtypes = mutation({
  args: {
    categoryId: v.id("categories"),
    subtypes: v.array(v.object({ slug: v.string(), name: v.string() })),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null) throw new ConvexError("Category not found");
    if (args.subtypes.length > 30) throw new ConvexError("A category can have at most 30 subtypes");
    const subtypes = args.subtypes.map((s) => ({ slug: requireSlug(s.slug), name: requireText(s.name, "Subtype name") }));
    if (new Set(subtypes.map((s) => s.slug)).size !== subtypes.length) throw new ConvexError("Each subtype needs its own slug");
    await ctx.db.patch("categories", category._id, { subtypes });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "category.subtypes",
      targetTable: "categories",
      targetId: category._id,
      reason: args.reason,
      details: { from: category.subtypes ?? [], to: subtypes },
    });
  },
});

/** Sets display order to the order of the ids given. */
export const reorderCategories = mutation({
  args: { orderedIds: v.array(v.id("categories")), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    for (const [index, categoryId] of args.orderedIds.entries()) {
      await ctx.db.patch("categories", categoryId, { sortOrder: index + 1 });
    }
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "category.reorder",
      targetTable: "categories",
      targetId: "*",
      reason: args.reason,
      details: { orderedIds: args.orderedIds },
    });
  },
});

export const listAllUnits = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, CATALOG_ROLES);
    const units = await ctx.db.query("units").take(200);
    return units.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** New units appear at once in the listing form, app and website (A-81). */
export const createUnit = mutation({
  args: { slug: v.string(), singular: v.string(), plural: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    const slug = requireSlug(args.slug);
    const existing = await ctx.db
      .query("units")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing !== null) throw new ConvexError("A unit with this slug already exists");
    const all = await ctx.db.query("units").take(200);
    const unitId = await ctx.db.insert("units", {
      slug,
      singular: requireText(args.singular, "Singular name"),
      plural: requireText(args.plural, "Plural name"),
      sortOrder: all.reduce((max, u) => Math.max(max, u.sortOrder), 0) + 1,
      retired: false,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "unit.create",
      targetTable: "units",
      targetId: unitId,
      reason: args.reason,
    });
    return unitId;
  },
});

/** Rename a unit, or retire / restore it. Retired units stay on old listings. */
export const updateUnit = mutation({
  args: {
    unitId: v.id("units"),
    singular: v.optional(v.string()),
    plural: v.optional(v.string()),
    retired: v.optional(v.boolean()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, CATALOG_ROLES);
    const unit = await ctx.db.get("units", args.unitId);
    if (unit === null) throw new ConvexError("Unit not found");
    const changes = {
      ...(args.singular !== undefined && { singular: requireText(args.singular, "Singular name") }),
      ...(args.plural !== undefined && { plural: requireText(args.plural, "Plural name") }),
      ...(args.retired !== undefined && { retired: args.retired }),
    };
    await ctx.db.patch("units", unit._id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "unit.update",
      targetTable: "units",
      targetId: unit._id,
      reason: args.reason,
      details: changes,
    });
  },
});
