// Notifications (Screen Inventory section 5). Every notification is stored
// for the in-app list, then notifications/deliver.send pushes it (Expo),
// records the SMS (no provider chosen yet) and sends the email (Resend), each
// only when the alert type and the person's preferences allow it.
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type NotifyArgs = {
  userId: Id<"users">;
  side: "shop" | "farm";
  kind: string;
  title: string;
  body: string;
  href: string;
  orderId?: Id<"orders">;
  // Phone to text, if the preferences allow SMS
  smsTo?: string;
};

export async function notify(ctx: MutationCtx, n: NotifyArgs): Promise<Id<"notifications">> {
  const notificationId = await ctx.db.insert("notifications", {
    userId: n.userId,
    side: n.side,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    orderId: n.orderId,
    smsTo: n.smsTo,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver.send, { notificationId });
  return notificationId;
}

/**
 * Tells the shopper about their order: push, or SMS when there is no push
 * (guests always get SMS), plus email for the order emails.
 */
export async function notifyConsumer(
  ctx: MutationCtx,
  order: Doc<"orders">,
  kind: string,
  title: string,
  body: string,
) {
  const user = await ctx.db.get("users", order.userId);
  if (user === null) return;
  await notify(ctx, {
    userId: order.userId,
    side: "shop",
    kind,
    title,
    body,
    href: `/order/${order._id}`,
    orderId: order._id,
    smsTo: order.contact.phone,
  });
}

/** Tells the farm (push + SMS for order events). */
export async function notifyFarm(
  ctx: MutationCtx,
  order: Doc<"orders">,
  kind: string,
  title: string,
  body: string,
  sms = true,
) {
  const farm = await ctx.db.get("farms", order.farmId);
  if (farm === null) return;
  await notify(ctx, {
    userId: farm.userId,
    side: "farm",
    kind,
    title,
    body,
    href: `/farm-order/${order._id}`,
    orderId: order._id,
    smsTo: sms ? farm.phone : undefined,
  });
}

// Staff roles alerted about problem reports (A-12).
const STAFF_ALERT_ROLES = ["support", "operations"] as const;

/**
 * In-app alert for Farmkeke staff (A-12 "Problem reported → admin alert"):
 * one notifications row with side "staff" per support and operations user.
 * Not pushed or texted; staff read them with admin/staff.alerts.
 */
export async function notifyStaff(
  ctx: MutationCtx,
  n: { kind: string; title: string; body: string; href: string; orderId?: Id<"orders"> },
) {
  let sent = 0;
  for (const role of STAFF_ALERT_ROLES) {
    const staff = await ctx.db
      .query("users")
      .withIndex("by_staffRole", (q) => q.eq("staffRole", role))
      .take(100);
    for (const user of staff) {
      await ctx.db.insert("notifications", { userId: user._id, side: "staff", ...n });
      sent++;
    }
  }
  return sent;
}

/** "₦12,500" or "₦12,500.50" from kobo, without relying on Intl. */
export function naira(kobo: number): string {
  const whole = Math.floor(Math.abs(kobo) / 100);
  const rest = Math.abs(kobo) % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${kobo < 0 ? "-" : ""}₦${grouped}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

const READ_BATCH = 200;

/** Marks a batch of unread notifications read; schedules the next batch if more are left. */
export async function markReadBatch(ctx: MutationCtx, userId: Id<"users">, side: "shop" | "farm") {
  const now = Date.now();
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_userId_and_side_and_readAt", (q) => q.eq("userId", userId).eq("side", side).eq("readAt", undefined))
    .take(READ_BATCH);
  for (const n of unread) await ctx.db.patch("notifications", n._id, { readAt: now });
  if (unread.length === READ_BATCH) {
    await ctx.scheduler.runAfter(0, internal.notifications.store.markAllReadBatch, { userId, side });
  }
  return unread.length;
}
