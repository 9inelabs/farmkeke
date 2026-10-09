import { query } from "./_generated/server";
import { getViewer } from "./lib/auth";

/** The signed-in user's own profile, or null when signed out. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null) return null;
    return {
      _id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      isGuest: user.isAnonymous === true,
      staffRole: user.staffRole ?? null,
    };
  },
});

/**
 * "revoked" when the caller holds a token whose session has ended (password
 * reset elsewhere, blocked, deleted). The app then signs out and shows M-S6.
 */
export const sessionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return "none" as const;
    return (await getViewer(ctx)) === null ? ("revoked" as const) : ("active" as const);
  },
});
