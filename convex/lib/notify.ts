// Notification store (Screen Inventory section 5). Phase 3a records the
// in-app notification and, where the rules call for SMS, an smsLog row with
// status "recorded" (no SMS provider yet). Push and SMS delivery
// (notifications/deliver.ts) arrive in Phase 3b.
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
  // Also record an SMS to this number
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
  });
  if (n.smsTo) {
    await ctx.db.insert("smsLog", {
      to: n.smsTo,
      body: `Farmkeke: ${n.title}. ${n.body}`,
      status: "recorded",
      userId: n.userId,
      notificationId,
    });
  }
  return notificationId;
}

/** Tells the shopper about their order. Guests get SMS only (no account to push to). */
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
    // Push or SMS: until push delivery exists (3b), record SMS for guests
    smsTo: user.isAnonymous ? order.contact.phone : undefined,
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

/** "₦12,500" or "₦12,500.50" from kobo, without relying on Intl. */
export function naira(kobo: number): string {
  const whole = Math.floor(Math.abs(kobo) / 100);
  const rest = Math.abs(kobo) % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${kobo < 0 ? "-" : ""}₦${grouped}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}
