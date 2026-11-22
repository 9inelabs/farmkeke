// APK #10: the account holder's profile photo, set from Edit profile.
// The app uploads the (square, shrunk) photo to a link from generateUploadUrl,
// then saves its storage id with set. Replacing or removing the photo deletes
// the old file. Guests can't have a photo.
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireAccount } from "./lib/auth";
import { hitLimit } from "./lib/rateLimit";
import { validateImageUpload } from "./lib/uploads";

// Upload links per hour, so storage can't be filled with junk
const UPLOADS_PER_HOUR = 20;
// The file must have been uploaded just now: a photo is set straight after
// its upload, so an old file id (someone else's) can't be claimed.
const MAX_UPLOAD_AGE_MS = 60 * 60_000;

/** Deletes a replaced photo, if the file is still there. */
async function deleteFile(ctx: MutationCtx, id: Id<"_storage">) {
  if ((await ctx.db.system.get("_storage", id)) !== null) await ctx.storage.delete(id);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    await hitLimit(ctx, `profile-photo-upload:${user._id}`, UPLOADS_PER_HOUR, 3_600_000);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Saves an uploaded photo as the profile photo, deleting the one it replaces. */
export const set = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    if (user.photoStorageId === args.storageId) return null;
    const meta = await ctx.db.system.get("_storage", args.storageId);
    if (meta === null) throw new ConvexError({ code: "UPLOAD_MISSING" });
    if (Date.now() - meta._creationTime > MAX_UPLOAD_AGE_MS) throw new ConvexError({ code: "UPLOAD_MISSING" });
    // Deletes the file and throws if it isn't a photo or is over 10 MB
    await validateImageUpload(ctx, args.storageId);
    const old = user.photoStorageId;
    await ctx.db.patch("users", user._id, { photoStorageId: args.storageId });
    if (old !== undefined) await deleteFile(ctx, old);
    return null;
  },
});

/** Removes the profile photo (the app goes back to initials) and deletes the file. */
export const remove = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    const old = user.photoStorageId;
    if (old === undefined) return null;
    await ctx.db.patch("users", user._id, { photoStorageId: undefined });
    await deleteFile(ctx, old);
    return null;
  },
});
