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
  /** Not shown in the preference lists (W-48, M-87, F-75) and can't be changed. */
  hidden?: boolean;
  defaults: Record<Channel, boolean>;
  kinds: string[];
};

const on = { push: true, sms: true, email: true };

// Admin → Messages service updates, on both sides
const UPDATES: Alert = {
  alert: "farmkeke_updates",
  title: "Updates from Farmkeke",
  description: "",
  locked: true,
  hidden: true,
  defaults: { push: true, sms: false, email: false },
  kinds: ["broadcast"],
};

const SHOP: Alert[] = [
  {
    alert: "order_updates",
    title: "Order updates",
    description: "Farm accepted, out for delivery, delivered, ready for pickup",
    defaults: on,
    kinds: [
      "order_accepted",
      "order_preparing",
      "order_packed",
      "out_for_delivery",
      "ready_for_pickup",
      "order_delivered",
      "order_collected",
      "pickup_reminder",
      "pickup_overdue",
      "order_cancelled",
      "dispute_opened",
    ],
  },
  {
    alert: "payments",
    title: "Payments and refunds",
    description: "Bills, payment confirmed, money released, refunds",
    locked: true,
    defaults: on,
    kinds: [
      "order_placed",
      "order_completed",
      "order_declined",
      "order_expired",
      "refund_issued",
      "dispute_resolved",
      // Delivery orders: received unpaid, then the bill (always sent; bills also text)
      "order_received",
      "bill_ready",
      "bill_reminder",
      "bill_expired",
    ],
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
  },  // Admin → Messages service updates (delivery paused, new hours): always in
  // the app and by push; never texted or emailed
  UPDATES,
];

const FARM: Alert[] = [
  {
    alert: "orders",
    title: "New orders and deadlines",
    description: "New orders, deadline near, expired or cancelled orders, rider collection",
    defaults: { push: true, sms: true, email: true },
    kinds: ["order_new", "order_deadline", "order_expired", "order_cancelled", "rider_assigned", "deadline_extended", "order_paid"],
  },
  {
    alert: "problems",
    title: "Problem reports",
    description: "A shopper reported a problem, and Farmkeke's decision",
    defaults: { push: true, sms: true, email: true },
    kinds: ["dispute_opened", "dispute_resolved", "dispute_message", "dispute_reply_reminder", "dispute_reply_overdue"],
  },
  {
    alert: "payments",
    title: "Payments and payouts",
    description: "Payment released, payout sent, payout account changed",
    locked: true,
    defaults: { push: true, sms: true, email: true },
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
    defaults: { push: true, sms: false, email: true },
    kinds: ["listing_approved", "listing_sent_back", "listing_unpublished", "low_stock"],
  },
  {
    alert: "reviews",
    title: "Reviews",
    description: "When a shopper rates an order",
    defaults: { push: true, sms: false, email: false },
    kinds: ["review_received"],
  },
  {
    // F-09: the application decision reaches applicants before they have a
    // farm (and its F-75 settings), so it is always on and not listed.
    alert: "application",
    title: "Your application",
    description: "Application received, more information needed, approved or not approved",
    locked: true,
    hidden: true,
    defaults: { push: true, sms: false, email: true },
    kinds: ["application_received", "application_more_info", "application_approved", "application_rejected"],
  },
  {
    alert: "news",
    title: "Farmkeke news",
    description: "Offers, tips and news from Farmkeke",
    // Promotions only reach phones that opted in (as for shoppers' offers)
    defaults: { push: false, sms: false, email: false },
    kinds: ["offer"],
  },
  UPDATES,
];

// Kinds no alert type lists (none today) follow these.
const OTHER: Alert = {
  alert: "other",
  title: "Other",
  description: "",
  defaults: { push: true, sms: true, email: false },
  kinds: [],
};

const allAlerts = (side: Side) => (side === "shop" ? SHOP : FARM);

/** The alert types people can see and change. */
export const alertsFor = (side: Side) => allAlerts(side).filter((a) => !a.hidden);

export const findAlert = (side: Side, alert: string) => alertsFor(side).find((a) => a.alert === alert) ?? null;

export const alertOfKind = (side: Side, kind: string) =>
  allAlerts(side).find((a) => a.kinds.includes(kind)) ?? OTHER;

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
  return alertsFor(side).map((a) => {
    // Only alerts that contain a texting event offer an SMS switch.
    const smsAvailable = a.kinds.some((k) => SMS_KINDS[side].has(k));
    return {
      alert: a.alert,
      title: a.title,
      description: a.description,
      locked: a.locked === true,
      smsAvailable,
      push: channelOn(prefs, a, side, "push"),
      sms: smsAvailable && smsWanted(prefs, a, side),
      email: channelOn(prefs, a, side, "email"),
    };
  });
}

/**
 * The only events that send a text message (owner's cost decision, 21 Oct 2026).
 * Everything else goes by email, in-app notification and push. Keep this list
 * short: every text costs money.
 *  - shop: the delivery bill with its pay link; order ready for pickup (code)
 *  - farm: application received and approved; new order (24h to accept);
 *          payout bank account changed (security)
 */
export const SMS_KINDS: Record<Side, ReadonlySet<string>> = {
  shop: new Set(["bill_ready", "ready_for_pickup"]),
  farm: new Set(["application_received", "application_approved", "order_new", "payout_account_changed"]),
};

export const textsFor = (side: string, kind: string) =>
  (side === "shop" || side === "farm") && SMS_KINDS[side].has(kind);

/**
 * Texting events go out unless the person explicitly switched SMS off for that
 * alert (locked money/application alerts can't be switched off).
 */
export function smsWanted(prefs: Doc<"notificationPrefs">[], a: Alert, side: Side): boolean {
  if (a.locked) return true;
  const rows = prefs.filter((p) => p.side === side && p.alert === a.alert);
  const exact = rows.find((p) => p.channel === "sms");
  if (exact) return exact.on;
  const whole = rows.find((p) => p.channel === undefined);
  return whole ? whole.on : true;
}
