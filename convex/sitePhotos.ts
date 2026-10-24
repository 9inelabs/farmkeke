// A-87 Site photos (public): the photos staff set in the Admin Portal, for the
// website's sign-in and sign-up panels and the app's farmer sign-up screens.
// A slot with no photo returns null.
import { query, type QueryCtx } from "./_generated/server";
import { FARMER_SCENES, farmerSlot, SLOTS, type FarmerScene, type Focus, type Slot } from "./lib/sitePhotos";

async function photoIn(ctx: QueryCtx, slot: Slot): Promise<{ url: string; focus: Focus } | null> {
  const row = await ctx.db
    .query("sitePhotos")
    .withIndex("by_slot", (q) => q.eq("slot", slot))
    .unique();
  const url = row ? await ctx.storage.getUrl(row.storageId) : null;
  return row && url ? { url, focus: row.focus } : null;
}

export const auth = query({
  args: {},
  handler: async (ctx) => {
    const out: Record<"signin" | "signup", { url: string; focus: Focus } | null> = { signin: null, signup: null };
    for (const slot of SLOTS) out[slot as "signin" | "signup"] = await photoIn(ctx, slot);
    return out;
  },
});

/** The header photo for each screen of the app's farmer sign-up. */
export const farmerSignup = query({
  args: {},
  handler: async (ctx) => {
    const out = {} as Record<FarmerScene, { url: string; focus: Focus } | null>;
    for (const scene of FARMER_SCENES) out[scene] = await photoIn(ctx, farmerSlot(scene));
    return out;
  },
});
