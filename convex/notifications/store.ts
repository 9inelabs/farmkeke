// Notification store. Phase 3a: `create` (used through lib/notify.ts) and
// `logSms`. The live `plan`, `dropTokens` and `markAllReadBatch`, and push /
// SMS delivery in notifications/deliver.ts, are rebuilt in Phase 3b.
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { notify } from "../lib/notify";

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    side: v.union(v.literal("shop"), v.literal("farm")),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    href: v.string(),
    orderId: v.optional(v.id("orders")),
    smsTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => await notify(ctx, args),
});

export const logSms = internalMutation({
  args: {
    to: v.string(),
    body: v.string(),
    status: v.union(v.literal("recorded"), v.literal("sent"), v.literal("failed")),
    userId: v.optional(v.id("users")),
    notificationId: v.optional(v.id("notifications")),
    provider: v.optional(v.string()),
    providerReference: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("smsLog", args);
  },
});
