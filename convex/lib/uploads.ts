import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Accepts an uploaded file only if it's an image under 10 MB; deletes it otherwise. */
export async function validateImageUpload(ctx: MutationCtx, storageId: Id<"_storage">) {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (meta === null) throw new ConvexError({ code: "UPLOAD_MISSING" });
  const isImage = (meta.contentType ?? "").startsWith("image/");
  if (!isImage || meta.size > MAX_IMAGE_BYTES) {
    await ctx.storage.delete(storageId);
    throw new ConvexError({ code: isImage ? "UPLOAD_TOO_LARGE" : "UPLOAD_NOT_IMAGE" });
  }
}
