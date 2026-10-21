// A-87 Site photos for the website (public): the sign-in and sign-up panel
// photos staff set in the Admin Portal. A slot with no photo returns null.
import { query } from "./_generated/server";
import { SLOTS } from "./lib/sitePhotos";

export const auth = query({
  args: {},
  handler: async (ctx) => {
    const out: Record<"signin" | "signup", { url: string; focus: "left" | "center" | "right" } | null> = { signin: null, signup: null };
    for (const slot of SLOTS) {
      const row = await ctx.db
        .query("sitePhotos")
        .withIndex("by_slot", (q) => q.eq("slot", slot))
        .unique();
      const url = row ? await ctx.storage.getUrl(row.storageId) : null;
      out[slot] = row && url ? { url, focus: row.focus } : null;
    }
    return out;
  },
});
