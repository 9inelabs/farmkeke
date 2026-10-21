// Photo uploads from the Admin Portal: pickup point photos (A-82), rider
// photos and ID documents (A-55), photos in problem-report and support
// replies (A-71, A-76), and site photos (A-87). The browser uploads to the returned URL,
// then passes the storage id to the function that saves it.
import { mutation } from "../_generated/server";
import { requireStaff } from "../lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["areas.manage", "riders.manage", "disputes.manage", "support.manage", "content.manage"]);
    return await ctx.storage.generateUploadUrl();
  },
});
