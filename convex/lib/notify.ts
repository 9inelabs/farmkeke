// Notifications (Screen Inventory section 5). Every notification is stored
// for the in-app list, then notifications/deliver.send pushes it (Expo),
// records the SMS (no provider chosen yet) and sends the email (Resend), each
// only when the alert type and the person's preferences allow it.
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Permission } from "./permissions";
import { smsConfigured } from "./sms";

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
  broadcastId?: Id<"broadcasts">;
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
    broadcastId: n.broadcastId,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver.send, { notificationId });
  return notificationId;
}

/**
 * Tells the shopper about their order: push, or SMS when there is no push
 * (guests always get SMS; bills always go by SMS), plus email for the order
 * emails.
 */
export async function notifyConsumer(
  ctx: MutationCtx,
  order: Doc<"orders">,
  kind: string,
  title: string,
  body: string,
  opts: { href?: string } = {},
) {
  const user = await ctx.db.get("users", order.userId);
  if (user === null) return;
  await notify(ctx, {
    userId: order.userId,
    side: "shop",
    kind,
    title,
    body,
    href: opts.href ?? `/order/${order._id}`,
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

/**
 * Approved staff whose role has the permission (portal alerts and emails).
 * Capped at 200 members.
 */
export async function staffWithPermission(ctx: QueryCtx | MutationCtx, permission: Permission) {
  const members = await ctx.db
    .query("staffMembers")
    .withIndex("by_status", (q) => q.eq("status", "approved"))
    .take(200);
  const roles = new Map<Id<"staffRoles">, boolean>();
  const found: Doc<"staffMembers">[] = [];
  for (const member of members) {
    if (member.roleId === undefined) continue;
    let allowed = roles.get(member.roleId);
    if (allowed === undefined) {
      const role = await ctx.db.get("staffRoles", member.roleId);
      allowed = role !== null && role.permissions.includes(permission);
      roles.set(member.roleId, allowed);
    }
    if (allowed) found.push(member);
  }
  return found;
}

/**
 * In-app alert for Farmkeke staff (A-12 "Problem reported → admin alert"):
 * one notifications row with side "staff" for each member whose role can
 * handle problem reports. Not pushed or texted; staff read them in the portal.
 */
export async function notifyStaff(
  ctx: MutationCtx,
  n: { kind: string; title: string; body: string; href: string; orderId?: Id<"orders"> },
  permission: Permission = "disputes.manage",
) {
  const staff = await staffWithPermission(ctx, permission);
  for (const member of staff) {
    await ctx.db.insert("notifications", { userId: member.userId, side: "staff", ...n });
  }
  return staff.length;
}

/**
 * Whether texts actually go out: true once Termii is set up (see lib/sms.ts).
 * While false, texts are only recorded in smsLog, and delivery orders need an
 * email so the shopper can get their bill.
 */
export const smsSending = () => smsConfigured();

/** "₦12,500" or "₦12,500.50" from kobo, without relying on Intl. */
export function naira(kobo: number): string {
  const whole = Math.floor(Math.abs(kobo) / 100);
  const rest = Math.abs(kobo) % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${kobo < 0 ? "-" : ""}₦${grouped}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/**
 * A once-per-window gate (notificationThrottles): true the first time a key
 * is used in `windowMs`, false after that. Used for message emails and
 * low-stock alerts. Runs in a mutation, so it can't race.
 */
export async function claimSlot(ctx: MutationCtx, key: string, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const row = await ctx.db
    .query("notificationThrottles")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (row !== null && now - row.lastAt < windowMs) return false;
  if (row === null) await ctx.db.insert("notificationThrottles", { key, lastAt: now });
  else await ctx.db.patch("notificationThrottles", row._id, { lastAt: now });
  return true;
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
