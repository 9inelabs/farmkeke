// Admin stand-ins for A-30 Farmers, A-31 Farmer detail (incl. Trusted toggle),
// A-32 Suspend or reactivate and A-33 Edit farmer details.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { farmVisibilityChanged } from "../lib/listingCounts";
import { normalizeNigerianPhone } from "../lib/phone";


export const list = query({
  args: { status: v.optional(v.union(v.literal("active"), v.literal("suspended"))), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "farmers.view");
    const page = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", args.status ?? "active"))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((f) => ({
        _id: f._id,
        name: f.name,
        state: f.state,
        lga: f.lga,
        status: f.status,
        trusted: f.trusted,
        // "Approved but not set up" (A-30)
        setUp: f.profileConfirmedAt !== undefined && f.collectionConfirmedAt !== undefined,
      })),
    };
  },
});

export const get = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "farmers.view");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) return null;
    const user = await ctx.db.get("users", farm.userId);
    const docs = await ctx.db
      .query("farmerDocuments")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", farm.applicationId))
      .take(50);
    const activity = await ctx.db
      .query("auditLog")
      .withIndex("by_targetTable_and_targetId", (q) => q.eq("targetTable", "farms").eq("targetId", farm._id))
      .order("desc")
      .take(50);
    return {
      farm,
      owner: user === null ? null : { _id: user._id, name: user.name, email: user.email, phone: user.phone },
      documents: await Promise.all(docs.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) }))),
      activity,
    };
  },
});

/** A-32: suspending blocks selling (F-15); shopping still works. */
export const setSuspended = mutation({
  args: { farmId: v.id("farms"), suspended: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.manage");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) throw new ConvexError("Farm not found");
    const status = args.suspended ? ("suspended" as const) : ("active" as const);
    await ctx.db.patch("farms", farm._id, {
      status,
      suspendedReason: args.suspended ? args.reason.trim() : undefined,
    });
    await farmVisibilityChanged(ctx, farm, { ...farm, status });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: args.suspended ? "farm.suspend" : "farm.reactivate",
      targetTable: "farms",
      targetId: farm._id,
      reason: args.reason,
    });
  },
});

/** A-31: trusted farms' listings go live without review (Phase 4). */
export const setTrusted = mutation({
  args: { farmId: v.id("farms"), trusted: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.manage");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) throw new ConvexError("Farm not found");
    await ctx.db.patch("farms", farm._id, { trusted: args.trusted });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: args.trusted ? "farm.trust" : "farm.untrust",
      targetTable: "farms",
      targetId: farm._id,
      reason: args.reason,
    });
  },
});

/** A-33: correct farm details on the farmer's behalf. */
export const updateDetails = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.manage");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) throw new ConvexError("Farm not found");
    const changes: Record<string, string> = {};
    if (args.name?.trim()) changes.name = args.name.trim();
    if (args.address?.trim()) changes.address = args.address.trim();
    if (args.state?.trim()) changes.state = args.state.trim();
    if (args.lga?.trim()) changes.lga = args.lga.trim();
    if (args.phone !== undefined) {
      const phone = normalizeNigerianPhone(args.phone);
      if (phone === null) throw new ConvexError("Enter a Nigerian mobile number");
      const owner = await ctx.db.query("users").withIndex("phone", (q) => q.eq("phone", phone)).first();
      if (owner !== null && owner._id !== farm.userId) throw new ConvexError("Another account uses this number");
      changes.phone = phone;
      await ctx.db.patch("users", farm.userId, { phone });
    }
    await ctx.db.patch("farms", farm._id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "farm.updateDetails",
      targetTable: "farms",
      targetId: farm._id,
      reason: args.reason,
      details: changes,
    });
  },
});

/** A-31 Documents tab: approve, ask for a new photo, or mark a document expired (F-73). */
export const reviewDocument = mutation({
  args: {
    documentId: v.id("farmerDocuments"),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    note: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "farmers.manage");
    const doc = await ctx.db.get("farmerDocuments", args.documentId);
    if (doc === null) throw new ConvexError("Document not found");
    const note = args.note?.trim();
    if (args.status !== "approved" && !note) throw new ConvexError("Tell the farmer what to fix");
    await ctx.db.patch("farmerDocuments", doc._id, { status: args.status, note: args.status === "approved" ? undefined : note });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: `farmerDocument.${args.status}`,
      targetTable: "farmerDocuments",
      targetId: doc._id,
      reason: args.reason,
      details: { kind: doc.kind, note: note ?? null },
    });
  },
});
