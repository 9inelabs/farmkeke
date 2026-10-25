import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Photo formats only. SVG is left out on purpose: it's a document that can
// carry scripts, and the storage link would open it in a browser.
const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);

/** Accepts an uploaded file only if it's a photo under 10 MB; deletes it otherwise. */
export async function validateImageUpload(ctx: MutationCtx, storageId: Id<"_storage">) {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (meta === null) throw new ConvexError({ code: "UPLOAD_MISSING" });
  const isImage = IMAGE_TYPES.has((meta.contentType ?? "").toLowerCase().split(";")[0]!.trim());
  if (!isImage || meta.size > MAX_IMAGE_BYTES) {
    await ctx.storage.delete(storageId);
    throw new ConvexError({ code: isImage ? "UPLOAD_TOO_LARGE" : "UPLOAD_NOT_IMAGE" });
  }
}
