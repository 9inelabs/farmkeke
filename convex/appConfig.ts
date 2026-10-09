import { query } from "./_generated/server";

/** Read by every app on launch: forced update (M-S4) and maintenance (M-S5). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "app"))
      .unique();
    return (
      config ?? {
        minAppVersion: "0.0.0",
        latestAppVersion: "0.0.0",
        androidStoreUrl: undefined,
        iosStoreUrl: undefined,
        maintenanceActive: false,
        maintenanceMessage: undefined,
        maintenanceUntil: undefined,
      }
    );
  },
});
