// A-87 Site photos: staff upload, replace or remove the photos on the
// website's sign-in and sign-up pages, and the header photos of the app's
// farmer sign-up screens. Replacing or removing a photo deletes
// the old file. Every change goes in the audit log.
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { ALL_SLOTS, clampPct, focusFromX, focusValidator, photoPosition, slotValidator, type Slot } from "../lib/sitePhotos";
import { validateImageUpload } from "../lib/uploads";

const bySlot = (ctx: MutationCtx, slot: Slot) =>
  ctx.db
    .query("sitePhotos")
    .withIndex("by_slot", (q) => q.eq("slot", slot))
    .unique();

/** Each slot with its current photo, or null when it shows the plain design. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "content.manage");
    return await Promise.all(
      ALL_SLOTS.map(async (slot) => {
        const row = await ctx.db
          .query("sitePhotos")
          .withIndex("by_slot", (q) => q.eq("slot", slot))
          .unique();
        if (row === null) return { slot, photo: null };
        const by = await ctx.db.get("users", row.updatedBy);
        return {
          slot,
          photo: {
            url: await ctx.storage.getUrl(row.storageId),
            focus: row.focus,
            ...photoPosition(row),
            updatedAt: row.updatedAt,
            updatedByName: by?.name ?? null,
          },
        };
      }),
    );
  },
});

/**
 * Puts an uploaded photo in a slot (or moves what stays in view), replacing any
 * photo there. The point to keep in view is `focusX`/`focusY` (0 to 100, set by
 * dragging the preview); `focus` (left/middle/right) is still accepted.
 */
export const set = mutation({
  args: {
    slot: slotValidator,
    storageId: v.optional(v.id("_storage")),
    focus: v.optional(focusValidator),
    focusX: v.optional(v.number()),
    focusY: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    const current = await bySlot(ctx, args.slot);
    if (args.storageId === undefined && current === null) throw new ConvexError({ code: "PHOTO_REQUIRED" });
    if (args.storageId !== undefined) await validateImageUpload(ctx, args.storageId);
    const storageId = args.storageId ?? current!.storageId;
    for (const n of [args.focusX, args.focusY]) {
      if (n !== undefined && !Number.isFinite(n)) throw new ConvexError({ code: "INVALID_POSITION" });
    }
    const focusX = args.focusX !== undefined ? clampPct(args.focusX) : undefined;
    const focusY = args.focusY !== undefined ? clampPct(args.focusY) : undefined;
    // Older app builds only read left/middle/right: keep it closest to the point.
    const focus = args.focus ?? (focusX !== undefined ? focusFromX(focusX) : (current?.focus ?? "center"));
    const row = { storageId, focus, focusX, focusY, updatedAt: Date.now(), updatedBy: actor._id };
    let id: Id<"sitePhotos">;
    if (current === null) {
      id = await ctx.db.insert("sitePhotos", { slot: args.slot, ...row });
    } else {
      if (current.storageId !== storageId) await ctx.storage.delete(current.storageId);
      await ctx.db.patch("sitePhotos", current._id, row);
      id = current._id;
    }
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "sitePhoto.set",
      targetTable: "sitePhotos",
      targetId: id,
      reason: args.reason,
      details: { slot: args.slot, focus, focusX, focusY, newPhoto: args.storageId !== undefined },
    });
    return null;
  },
});

/** Removes a slot's photo; the page goes back to the plain design. */
export const remove = mutation({
  args: { slot: slotValidator, reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "content.manage");
    const current = await bySlot(ctx, args.slot);
    if (current === null) return null;
    await ctx.storage.delete(current.storageId);
    await ctx.db.delete("sitePhotos", current._id);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "sitePhoto.remove",
      targetTable: "sitePhotos",
      targetId: current._id,
      reason: args.reason,
      details: { slot: args.slot },
    });
    return null;
  },
});
