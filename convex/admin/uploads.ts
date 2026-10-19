// Photo uploads from the Admin Portal: pickup point photos (A-82) and rider
// photos and ID documents (A-55). The browser uploads to the returned URL,
// then passes the storage id to the function that saves it.
import { mutation } from "../_generated/server";
import { requireStaff } from "../lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["areas.manage", "riders.manage"]);
    return await ctx.storage.generateUploadUrl();
  },
});
