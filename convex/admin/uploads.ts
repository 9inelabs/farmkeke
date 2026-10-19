// Photo uploads from the Admin Portal: pickup point photos (A-82), rider
// photos and ID documents (A-55), and photos in problem-report and support
// replies (A-71, A-76). The browser uploads to the returned URL,
// then passes the storage id to the function that saves it.
import { mutation } from "../_generated/server";
import { requireStaff } from "../lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["areas.manage", "riders.manage", "disputes.manage", "support.manage"]);
    return await ctx.storage.generateUploadUrl();
  },
});
