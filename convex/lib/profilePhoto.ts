// A shopper's profile photo (APK #10), as a link for the app.
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** The link to a user's uploaded profile photo, or null when they have none. */
export async function photoUrlOf(ctx: QueryCtx, user: Doc<"users"> | null): Promise<string | null> {
  if (user === null || user.photoStorageId === undefined) return null;
  return await ctx.storage.getUrl(user.photoStorageId);
}

/** The same, looked up by id (chat rows show the shopper's photo to the farm). */
export async function photoUrlOfUser(ctx: QueryCtx, userId: Id<"users">): Promise<string | null> {
  return await photoUrlOf(ctx, await ctx.db.get("users", userId));
}
