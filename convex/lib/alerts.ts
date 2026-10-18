// Notification preferences (W-48, M-87, F-75): each alert type has push, SMS
// and email switches. Every notification kind belongs to one alert type.
// Money alerts are locked on, so nobody misses a change to their money.
import type { Doc } from "../_generated/dataModel";

export type Side = "shop" | "farm";
export type Channel = "push" | "sms" | "email";
export const CHANNELS: Channel[] = ["push", "sms", "email"];

type Alert = {
  alert: string;
  title: string;
  description: string;
  locked?: boolean;
  defaults: Record<Channel, boolean>;
  kinds: string[];
};

const on = { push: true, sms: true, email: true };

const SHOP: Alert[] = [
  {
    alert: "order_updates",
    title: "Order updates",
    description: "Farm accepted, out for delivery, delivered, ready for pickup",
    defaults: on,
    kinds: [
      "order_accepted",
      "out_for_delivery",
      "ready_for_pickup",
      "order_delivered",
      "order_collected",
      "pickup_overdue",
      "order_cancelled",
      "dispute_opened",
    ],
  },
  {
    alert: "payments",
    title: "Payments and refunds",
    description: "Payment confirmed, money released, refunds",
    locked: true,
    defaults: on,
    kinds: ["order_placed", "order_completed", "order_declined", "order_expired", "refund_issued", "dispute_resolved"],
  },
  {
    alert: "messages",
    title: "Messages from farmers",
    description: "When a farm replies about your order",
    defaults: { push: true, sms: false, email: true },
    kinds: ["chat_message", "dispute_message", "support_reply"],
  },
  {
    alert: "reminders",
    title: "Reminders",
    description: "Confirm receipt and review your order",
    defaults: { push: true, sms: false, email: true },
    kinds: ["confirm_reminder", "review_reminder"],
  },
  {
    alert: "back_in_stock",
    title: "Back in stock",
    description: "When a saved item is available again",
    defaults: { push: true, sms: false, email: true },
    kinds: ["back_in_stock"],
  },
  {
    alert: "offers",
    title: "Offers and news",
    description: "Seasonal produce and Farmkeke news",
    defaults: { push: false, sms: false, email: false },
    kinds: ["offer"],
  },
];

const FARM: Alert[] = [
  {
    alert: "orders",
    title: "New orders and deadlines",
    description: "New orders, deadline near, expired or cancelled orders, rider collection",
    defaults: { push: true, sms: true, email: false },
    kinds: ["order_new", "order_deadline", "order_expired", "order_cancelled", "rider_assigned", "deadline_extended"],
  },
  {
    alert: "problems",
    title: "Problem reports",
    description: "A shopper reported a problem, and Farmkeke's decision",
    defaults: { push: true, sms: true, email: false },
    kinds: ["dispute_opened", "dispute_resolved", "dispute_message", "dispute_reply_reminder"],
  },
  {
    alert: "payments",
    title: "Payments and payouts",
    description: "Payment released, payout sent, payout account changed",
    locked: true,
    defaults: { push: true, sms: true, email: false },
    kinds: ["payment_released", "payout_sent", "payout_failed", "payout_account_changed"],
  },
  {
    alert: "messages",
    title: "Messages",
    description: "Shoppers' messages about their orders, and support replies",
    defaults: { push: true, sms: false, email: false },
    kinds: ["chat_message", "support_reply"],
  },
  {
    alert: "listings",
    title: "Listings",
    description: "Listing approved or sent back, low stock",
    defaults: { push: true, sms: false, email: false },
    kinds: ["listing_approved", "listing_sent_back", "low_stock"],
  },
  {
    alert: "reviews",
    title: "Reviews",
    description: "When a shopper rates an order",
    defaults: { push: true, sms: false, email: false },
    kinds: ["review_received"],
  },
];

// Kinds no alert type lists (none today) follow these.
const OTHER: Alert = {
  alert: "other",
  title: "Other",
  description: "",
  defaults: { push: true, sms: true, email: false },
  kinds: [],
};

export const alertsFor = (side: Side) => (side === "shop" ? SHOP : FARM);

export const findAlert = (side: Side, alert: string) => alertsFor(side).find((a) => a.alert === alert) ?? null;

export const alertOfKind = (side: Side, kind: string) =>
  alertsFor(side).find((a) => a.kinds.includes(kind)) ?? OTHER;

/**
 * Whether a channel is on: a row for this alert and channel wins, then a row
 * for the whole alert, then the default. Locked alerts are always on.
 */
export function channelOn(prefs: Doc<"notificationPrefs">[], a: Alert, side: Side, channel: Channel): boolean {
  if (a.locked) return a.defaults[channel];
  const rows = prefs.filter((p) => p.side === side && p.alert === a.alert);
  const exact = rows.find((p) => p.channel === channel);
  if (exact) return exact.on;
  const whole = rows.find((p) => p.channel === undefined);
  if (whole) return whole.on;
  return a.defaults[channel];
}

/** The W-48 / F-75 list for one side. */
export function preferenceRows(prefs: Doc<"notificationPrefs">[], side: Side) {
  return alertsFor(side).map((a) => ({
    alert: a.alert,
    title: a.title,
    description: a.description,
    locked: a.locked === true,
    push: channelOn(prefs, a, side, "push"),
    sms: channelOn(prefs, a, side, "sms"),
    email: channelOn(prefs, a, side, "email"),
  }));
}
