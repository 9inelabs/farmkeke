// Farmkeke email templates (moved from farmkeke-docs/pending-backend/emails).
//
// Plain TypeScript with one import (env, for the website and image URLs); no
// Node APIs. Used by notifications/store.plan (order, message and farm emails)
// and notifications/deliver (welcome and account emails), and sent with
// sendEmail() from ./email.ts. Every function returns the same `Email` shape
// that sendEmail() takes. scripts/render-email-previews.mjs renders them all.
//
// Rules used throughout:
// - Money is always in kobo (integers) and shown with naira().
// - Everything that comes from users or the database is escaped with esc().
// - Layouts are tables with inline CSS, so they work in Gmail, Outlook and
//   Apple Mail. One lime button per email.
// - Dates and times are passed in as ready-made labels (for example
//   "Sun 18 Oct, 9am – 12pm"). lagosTime() below helps build them.

import { env } from "../_generated/server";

export type Email = { to: string; subject: string; html: string; text: string };

/** The default website. Links use env WEBSITE_URL when it's set. */
export const SITE_URL = "https://farmkeke.com";
const TAGLINE = "Farmkeke · from the farm directly to your home";

const trimSlash = (s: string) => s.replace(/\/+$/, "");
const envValue = (value: string | undefined) => (value && value.trim() ? trimSlash(value.trim()) : undefined);

/** The website links point to: env WEBSITE_URL, or https://farmkeke.com. */
export function siteUrl(): string {
  return envValue(env.WEBSITE_URL) ?? SITE_URL;
}

/**
 * The logo at the top of every email. env EMAIL_ASSETS_URL (a folder that
 * holds wordmark.png) wins; otherwise this deployment's own
 * GET /email/wordmark.png route (convex/http.ts).
 */
export function wordmarkUrl(): string {
  const assets = envValue(env.EMAIL_ASSETS_URL);
  if (assets) return `${assets}/wordmark.png`;
  const convexSite = envValue(env.CONVEX_SITE_URL);
  if (convexSite) return `${convexSite}/email/wordmark.png`;
  return `${SITE_URL}/brand/wordmark.png`;
}

/** Farm emails' button: a page that opens the Farmkeke app (GET /open-app). */
export function openAppUrl(): string {
  const convexSite = envValue(env.CONVEX_SITE_URL);
  return convexSite ? `${convexSite}/open-app` : `${siteUrl()}/get-the-app`;
}

const helpUrl = () => `${siteUrl()}/help`;
/** "farmkeke.com/help", from the website URL. */
const helpLabel = () => `${siteUrl().replace(/^https?:\/\//, "")}/help`;

// Brand colours
const FOREST = "#1E3B16";
const LIME = "#A9D654";
const BG = "#F4F5F1";
const INK = "#1A1A1A";
const MUTED = "#5A5E56";
const TINT = "#F2F8E6";
const LINE = "#E6E8E2"; // card borders
const DIVIDER = "#EEF0EB"; // rows inside a card (W-30, W-56)
const HELD_BG = "#E7EEE4"; // "held" badge (W-30, W-51)

const HEAD_FONT = "Montserrat, Arial, Helvetica, sans-serif";
const BODY_FONT = "Inter, Arial, Helvetica, sans-serif";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Kobo to a naira label: 1270000 -> "₦12,700", 450050 -> "₦4,500.50". */
export function naira(kobo: number): string {
  const k = Math.round(Number.isFinite(kobo) ? kobo : 0);
  const abs = Math.abs(k);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rest = abs % 100;
  return `${k < 0 ? "-" : ""}₦${whole}${rest ? "." + String(rest).padStart(2, "0") : ""}`;
}

/** Escape text for HTML (body and attributes). */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Subjects are plain text: keep them on one line. */
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A timestamp (ms) as Nigerian time, for example "Sun 18 Oct, 10:41".
 * Nigeria is UTC+1 all year (no daylight saving), so no Intl time zone data
 * is needed. Pass { time: false } for just "Sun 18 Oct".
 */
export function lagosTime(ms: number, opts: { time?: boolean } = {}): string {
  const d = new Date(ms + 60 * 60 * 1000);
  const day = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  if (opts.time === false) return day;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}, ${hh}:${mm}`;
}

// Website links
const id = (s: string) => encodeURIComponent(s);
export const links = {
  shop: () => `${siteUrl()}/shop`,
  account: () => `${siteUrl()}/account`,
  notifications: () => `${siteUrl()}/account/notifications`,
  signIn: () => `${siteUrl()}/signin`,
  forgotPassword: () => `${siteUrl()}/forgot-password`,
  help: () => helpUrl(),
  contact: () => `${siteUrl()}/contact`,
  findOrder: () => `${siteUrl()}/find-order`,
  product: (listingId: string) => `${siteUrl()}/shop/product/${id(listingId)}`,
  linkGuestOrders: (token: string) => `${siteUrl()}/account/orders?link=${encodeURIComponent(token)}`,
  order: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}`,
  // Delivery bill: works on any device for whoever has the link
  pay: (token: string) => `${siteUrl()}/pay/${id(token)}`,
  chat: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}/chat`,
  review: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}/review`,
  refund: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}/refund`,
  dispute: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}/dispute`,
  reportProblem: (orderId: string) => `${siteUrl()}/orders/${id(orderId)}/problem`,
  resetPassword: (email: string, code: string) =>
    `${siteUrl()}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
  openApp: () => openAppUrl(),
};

const firstName = (name?: string) => {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n || "";
};
const hi = (name?: string) => (firstName(name) ? `Hi ${firstName(name)},` : "Hi,");

// ---------------------------------------------------------------------------
// HTML building blocks (all inline CSS)
// ---------------------------------------------------------------------------

const P = (html: string, extra = "") =>
  `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:16px;line-height:24px;color:${INK};${extra}">${html}</p>`;

const SMALL = (html: string, extra = "") =>
  `<p style="margin:0 0 12px;font-family:${BODY_FONT};font-size:14px;line-height:21px;color:${MUTED};${extra}">${html}</p>`;

const H1 = (html: string) =>
  `<h1 style="margin:0 0 16px;font-family:${HEAD_FONT};font-size:24px;line-height:31px;font-weight:800;color:${FOREST};">${html}</h1>`;

const H2 = (html: string) =>
  `<h2 style="margin:0 0 8px;font-family:${HEAD_FONT};font-size:17px;line-height:24px;font-weight:700;color:${INK};">${html}</h2>`;

const LINK = (url: string, label: string) =>
  `<a href="${esc(url)}" style="color:${FOREST};font-weight:600;text-decoration:underline;">${esc(label)}</a>`;

/** A tinted box for the key fact (money held, refund amount, etc.). */
const NOTE = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td bgcolor="${TINT}" style="background:${TINT};border-radius:12px;padding:14px 16px;font-family:${BODY_FONT};font-size:15px;line-height:22px;color:${INK};">${html}</td></tr>
</table>`;

type Row = { label: string; value: string; strong?: boolean };

/** Label / value rows. Labels and values are plain text (escaped here). */
const ROWS = (rows: Row[]) => {
  const tr = rows
    .map((r, i) => {
      const border = i === 0 ? "" : `border-top:1px solid ${DIVIDER};`;
      const weight = r.strong ? "font-weight:700;color:" + INK : "color:" + INK;
      return `<tr>
<td style="${border}padding:10px 0;font-family:${BODY_FONT};font-size:15px;line-height:21px;color:${r.strong ? INK : MUTED};${r.strong ? "font-weight:700;" : ""}" valign="top">${esc(r.label)}</td>
<td style="${border}padding:10px 0 10px 12px;font-family:${BODY_FONT};font-size:15px;line-height:21px;${weight};" align="right" valign="top">${esc(r.value)}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">${tr}</table>`;
};

/** A bordered card around a block of content. */
const CARD = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td style="border:1px solid ${LINE};border-radius:12px;padding:16px 16px 0;">${html}</td></tr>
</table>`;

/** The single lime call-to-action button. Bulletproof enough for Outlook. */
const BUTTON = (url: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
<tr><td align="center" bgcolor="${LIME}" style="background:${LIME};border-radius:12px;">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${BODY_FONT};font-size:16px;line-height:20px;font-weight:700;color:${INK};text-decoration:none;border-radius:12px;">${esc(label)}</a>
</td></tr>
</table>`;

/** Small "held" badge, as on W-30 / W-51 ("₦19,400 held safely"). Plain text in. */
const BADGE = (label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr><td bgcolor="${HELD_BG}" style="background:${HELD_BG};border-radius:8px;padding:5px 10px;font-family:${BODY_FONT};font-size:13px;line-height:16px;font-weight:600;color:${FOREST};">${esc(label)}</td></tr>
</table>`;

/** Numbered steps (W-30 "What happens next"). Titles and notes are plain text. */
const STEPS = (steps: { title: string; note?: string }[]) => {
  const rows = steps
    .map(
      (s, i) => `<tr>
<td width="38" valign="top" style="padding:0 0 14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" bgcolor="${TINT}" style="background:${TINT};border-radius:13px;font-family:${HEAD_FONT};font-size:12px;font-weight:700;color:${FOREST};">${i + 1}</td></tr></table>
</td>
<td valign="top" style="padding:2px 0 14px;font-family:${BODY_FONT};font-size:15px;line-height:22px;color:${INK};">
<strong>${esc(s.title)}</strong>${s.note ? `<br><span style="font-size:14px;line-height:21px;color:${MUTED};">${esc(s.note)}</span>` : ""}
</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">${rows}</table>`;
};
const stepsText = (steps: { title: string; note?: string }[]) =>
  steps.map((s, i) => `${i + 1}. ${s.title}${s.note ? `\n   ${s.note}` : ""}`);

/** Big pickup code, digits spaced out so it's easy to read at the counter. */
const CODE = (code: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td align="center" bgcolor="${TINT}" style="background:${TINT};border:2px solid ${LIME};border-radius:16px;padding:20px 12px;">
<p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:13px;line-height:18px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Your pickup code</p>
<p style="margin:0;font-family:${HEAD_FONT};font-size:40px;line-height:48px;font-weight:800;color:${FOREST};letter-spacing:10px;">${esc(code)}</p>
</td></tr>
</table>`;

type Layout = {
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  /** Inner HTML of the white card (already escaped). */
  body: string;
  /** Why the person got this email (plain text). Omit for none. */
  reason?: string;
};

function page({ preheader, body, reason }: Layout): string {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Farmkeke</title>
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
<!--<![endif]-->
<!--[if mso]>
<style>body,table,td,p,a,h1,h2{font-family:Arial,Helvetica,sans-serif !important;}</style>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
table{border-collapse:collapse;}
a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
@media only screen and (max-width:620px){
  .fk-card{padding:24px 20px !important;}
  .fk-outer{padding:16px 12px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${BG};" bgcolor="${BG}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BG};opacity:0;">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};">
<tr><td align="center" class="fk-outer" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 4px 20px;">
<a href="${esc(siteUrl())}" target="_blank" style="text-decoration:none;color:${FOREST};"><img src="${esc(wordmarkUrl())}" alt="Farmkeke" width="140" height="27" style="display:block;width:140px;height:27px;border:0;font-family:${HEAD_FONT};font-size:22px;line-height:27px;font-weight:800;color:${FOREST};"></a>
</td></tr>
<tr><td class="fk-card" bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:16px;border:1px solid ${LINE};padding:32px 32px 12px;">
${body}
${SMALL(`Need help? Reply to this email or visit ${LINK(helpUrl(), helpLabel())}.`, "margin:0 0 20px;")}
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${BODY_FONT};font-size:12px;line-height:18px;color:${MUTED};">
${reason ? `<p style="margin:0 0 8px;">${esc(reason)}</p>` : ""}
<p style="margin:0;font-weight:600;color:${FOREST};">${esc(TAGLINE)}</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** The plain-text part. `lines` are plain text; "" makes a blank line. */
function plain(opts: { lines: string[]; cta: { label: string; url: string }; extra?: string[]; reason?: string }): string {
  return [
    "Farmkeke",
    "",
    ...opts.lines,
    "",
    `${opts.cta.label}: ${opts.cta.url}`,
    ...(opts.extra && opts.extra.length ? ["", ...opts.extra] : []),
    "",
    `Need help? Reply to this email or visit ${helpUrl()}`,
    "",
    "--",
    ...(opts.reason ? [opts.reason] : []),
    TAGLINE,
  ].join("\n");
}

const orderReason = (number: string) =>
  `You're getting this email because you placed order ${number} on Farmkeke.`;

// ---------------------------------------------------------------------------
// Shared data shapes
// ---------------------------------------------------------------------------

export type OrderItem = {
  name: string;
  quantity: number;
  /** Unit label, e.g. "basket" or "crate of 30". Optional. */
  unit?: string;
  /** Line total in kobo (price × quantity). */
  totalKobo: number;
};

const itemLabel = (it: OrderItem) =>
  `${it.name}${it.unit ? ` (${it.unit})` : ""} × ${it.quantity}`;

export type PickupPoint = {
  name: string;
  address: string;
  /** "farm": pickup is at the farm itself (the default since pickup points went away). */
  kind?: "farm" | "point";
  /** Opening hours as display lines, e.g. ["Mon – Sat, 8am – 7pm"]. */
  hours: string[];
  phone?: string;
};

// ---------------------------------------------------------------------------
// 1. Welcome (after sign-up; there is no verification step)
// ---------------------------------------------------------------------------

export function welcomeEmail(p: { to: string; name?: string }): Email {
  const cta = { label: "Start shopping", url: links.shop() };
  const reason = "You're getting this email because you created a Farmkeke account with this address.";
  const body = [
    H1("Welcome to Farmkeke"),
    P(esc(hi(p.name))),
    P("Your account is ready. You can now buy fresh food straight from Nigerian farms."),
    P("Here is how it works:"),
    ROWS([
      { label: "1. Choose", value: "Pick fresh produce from verified farms." },
      { label: "2. Pay safely", value: "Farmkeke holds your money." },
      { label: "3. Receive", value: "Delivery to your door, or pickup." },
      { label: "4. Confirm", value: "Then the farm is paid." },
    ]),
    BUTTON(cta.url, cta.label),
    SMALL(`You can change your details any time in ${LINK(links.account(), "your account")}.`),
  ].join("\n");
  const text = plain({
    lines: [
      "Welcome to Farmkeke",
      "",
      hi(p.name),
      "Your account is ready. You can now buy fresh food straight from Nigerian farms.",
      "",
      "How it works:",
      "1. Choose fresh produce from verified farms.",
      "2. Pay safely. Farmkeke holds your money.",
      "3. Get it delivered to your door, or pick it up.",
      "4. Confirm you got everything. Then the farm is paid.",
    ],
    cta,
    extra: [`Your account: ${links.account()}`],
    reason,
  });
  return {
    to: p.to,
    subject: "Welcome to Farmkeke",
    html: page({ preheader: "Your account is ready. Fresh food from the farm, paid safely.", body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. Password reset. Same signature as the existing function in
//    convex/lib/email.ts, so it can replace it directly.
// ---------------------------------------------------------------------------

export function passwordResetEmail(to: string, link: string): Email {
  const cta = { label: "Make a new password", url: link };
  const reason = "You're getting this email because someone asked to reset the password for this address.";
  const body = [
    H1("Reset your password"),
    P(`Tap the button to make a new password for <strong>${esc(to)}</strong>.`),
    NOTE("The link works for <strong>30 minutes</strong>, and only <strong>once</strong>."),
    BUTTON(cta.url, cta.label),
    SMALL("Didn't ask for this? You can ignore this email. Your password won't change."),
    SMALL(`Link not working? Copy this into your browser:<br><span style="word-break:break-all;">${esc(link)}</span>`),
  ].join("\n");
  const text = plain({
    lines: [
      "Reset your password",
      "",
      `Use the link below to make a new password for ${to}.`,
      "The link works for 30 minutes, and only once.",
    ],
    cta,
    extra: ["Didn't ask for this? You can ignore this email. Your password won't change."],
    reason,
  });
  return {
    to,
    subject: "Reset your Farmkeke password",
    html: page({ preheader: "The link works for 30 minutes, and only once.", body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. Order confirmation (after payment). One email per checkout.
// ---------------------------------------------------------------------------

export type ConfirmedOrder = {
  orderId: string;
  /** Order number, e.g. "FK-10234" */
  number: string;
  farmName: string;
  items: OrderItem[];
  itemsKobo: number;
  /** Delivery fee for this farm's order. 0 or omitted for pickup. */
  deliveryFeeKobo?: number;
  /** Any other fee the shopper pays on this order. Omit if none. */
  serviceFeeKobo?: number;
  totalKobo: number;
  /** Delivery window for this order if it differs per farm. */
  window?: string;
};

export function orderConfirmationEmail(p: {
  to: string;
  name?: string;
  /** True when checked out without an account. */
  isGuest: boolean;
  /** Phone given at checkout (shown to guests for Find my order). */
  phone?: string;
  orders: ConfirmedOrder[];
  /** Everything paid in this checkout. */
  totalKobo: number;
  fulfilment: "delivery" | "pickup";
  /** For delivery: the address line and the default delivery window. */
  delivery?: { address: string; window?: string };
  /** For pickup through a pickup point (older orders). Without it, pickup is at each farm. */
  pickupPoint?: { name: string; address: string };
  /** Delivery: this is the bill being paid, after the farms accepted. */
  paidBill?: boolean;
}): Email {
  if (p.orders.length === 0) throw new Error("orderConfirmationEmail needs at least one order");
  const many = p.orders.length > 1;
  const first = p.orders[0]!;
  const cta =
    many && !p.isGuest
      ? { label: "Track your orders", url: links.account() }
      : { label: many ? `Track order ${first.number}` : "Track your order", url: links.order(first.orderId) };
  const numbers = p.orders.map((o) => o.number).join(", ");
  const reason = `You're getting this email because you placed ${many ? "orders" : "order"} ${numbers} on Farmkeke.`;

  const orderRows = (o: ConfirmedOrder): Row[] => [
    ...o.items.map((it) => ({ label: itemLabel(it), value: naira(it.totalKobo) })),
    { label: "Items", value: naira(o.itemsKobo) },
    ...(o.deliveryFeeKobo ? [{ label: "Delivery fee", value: naira(o.deliveryFeeKobo) }] : []),
    ...(o.serviceFeeKobo ? [{ label: "Service fee", value: naira(o.serviceFeeKobo) }] : []),
    { label: "Order total", value: naira(o.totalKobo), strong: true },
  ];

  const orderCards = p.orders
    .map((o) =>
      CARD(
        H2(`${esc(o.number)} · ${esc(o.farmName)}`) +
          (o.window ? SMALL(`Delivery: ${esc(o.window)}`, "margin:0 0 4px;") : "") +
          ROWS(orderRows(o)) +
          (many ? SMALL(LINK(links.order(o.orderId), `Track ${o.number}`), "margin:-8px 0 16px;") : ""),
      ),
    )
    .join("\n");

  const where =
    p.fulfilment === "delivery" && p.delivery
      ? `A Farmkeke rider will deliver to <strong>${esc(p.delivery.address)}</strong>${p.delivery.window ? `, <strong>${esc(p.delivery.window)}</strong>` : ""}.`
      : p.fulfilment === "pickup" && p.pickupPoint
        ? `You'll collect from <strong>${esc(p.pickupPoint.name)}</strong>, ${esc(p.pickupPoint.address)}. We'll email your pickup code when it's ready.`
        : p.fulfilment === "pickup"
          ? `You'll collect ${many ? "each order at its farm" : "it at the farm"}. We'll email the address and your pickup code when it's ready.`
          : "";
  const whereText =
    p.fulfilment === "delivery" && p.delivery
      ? `A Farmkeke rider will deliver to ${p.delivery.address}${p.delivery.window ? `, ${p.delivery.window}` : ""}.`
      : p.fulfilment === "pickup" && p.pickupPoint
        ? `You'll collect from ${p.pickupPoint.name}, ${p.pickupPoint.address}. We'll email your pickup code when it's ready.`
        : p.fulfilment === "pickup"
          ? `You'll collect ${many ? "each order at its farm" : "it at the farm"}. We'll email the address and your pickup code when it's ready.`
          : "";

  const guestHtml = p.isGuest
    ? NOTE(
        `<strong>You ordered as a guest.</strong> Only the phone or computer you ordered on can confirm delivery. ` +
          `On another device, use ${LINK(links.findOrder(), "Find my order")} with your order number${p.phone ? ` and ${esc(p.phone)}` : " and phone number"}. You can see your order there, but not confirm it.`,
      )
    : "";
  const guestText = p.isGuest
    ? [
        "",
        "You ordered as a guest. Only the phone or computer you ordered on can confirm delivery.",
        `On another device, use Find my order with your order number${p.phone ? ` and ${p.phone}` : " and phone number"}: ${links.findOrder()}`,
        "You can see your order there, but not confirm it.",
      ]
    : [];

  const heading = p.paidBill ? "Thank you for paying" : many ? "Your orders are placed" : "Your order is placed";
  const intro = p.paidBill
    ? `thank you. The ${many ? "farms have" : "farm has"} your ${many ? "orders" : "order"} ready, and a Farmkeke rider will collect and deliver ${many ? "them" : "it"}.`
    : `thank you. We've sent your ${many ? "orders" : "order"} to the ${many ? "farms" : "farm"}.`;
  const acceptLine = p.paidBill ? "" : "Farms have 24 hours to accept. If a farm doesn't, that order is refunded in full.";
  const body = [
    H1(heading),
    P(`${esc(hi(p.name))} ${esc(intro)}`),
    NOTE(
      `<strong>${esc(naira(p.totalKobo))} is held safely by Farmkeke.</strong> The farm is paid only after you confirm you got everything.`,
    ),
    orderCards,
    many ? ROWS([{ label: "Total paid", value: naira(p.totalKobo), strong: true }]) : "",
    H2("What happens next"),
    acceptLine ? P(`Farms have <strong>24 hours</strong> to accept. If a farm doesn't, that order is refunded in full.`) : "",
    where ? P(where) : "",
    P("When it arrives, check everything. Then confirm receipt. Something wrong? Report it before you confirm."),
    guestHtml,
    BUTTON(cta.url, cta.label),
  ].join("\n");

  const orderText = p.orders.flatMap((o) => [
    "",
    `${o.number} · ${o.farmName}`,
    ...(o.window ? [`Delivery: ${o.window}`] : []),
    ...o.items.map((it) => `  ${itemLabel(it)}: ${naira(it.totalKobo)}`),
    `  Items: ${naira(o.itemsKobo)}`,
    ...(o.deliveryFeeKobo ? [`  Delivery fee: ${naira(o.deliveryFeeKobo)}`] : []),
    ...(o.serviceFeeKobo ? [`  Service fee: ${naira(o.serviceFeeKobo)}`] : []),
    `  Order total: ${naira(o.totalKobo)}`,
    ...(many ? [`  Track: ${links.order(o.orderId)}`] : []),
  ]);

  const text = plain({
    lines: [
      heading,
      "",
      `${hi(p.name)} ${intro}`,
      `${naira(p.totalKobo)} is held safely by Farmkeke. The farm is paid only after you confirm you got everything.`,
      ...orderText,
      ...(many ? ["", `Total paid: ${naira(p.totalKobo)}`] : []),
      "",
      "What happens next",
      ...(acceptLine ? [acceptLine] : []),
      ...(whereText ? [whereText] : []),
      "When it arrives, check everything. Then confirm receipt. Something wrong? Report it before you confirm.",
      ...guestText,
    ],
    cta,
    reason,
  });

  return {
    to: p.to,
    subject: oneLine(
      p.paidBill
        ? `Paid: order ${p.orders.map((o) => o.number).join(", ")}`
        : many
          ? `Your ${p.orders.length} Farmkeke orders are placed`
          : `Order placed: ${first.number}`,
    ),
    html: page({
      preheader: p.paidBill
        ? `${naira(p.totalKobo)} held safely until you confirm. A rider is on the way to the farm.`
        : `${naira(p.totalKobo)} held safely until you confirm. Farms have 24 hours to accept.`,
      body,
      reason,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Shared input for the single-order emails below
// ---------------------------------------------------------------------------

type OrderRef = {
  to: string;
  name?: string;
  orderId: string;
  /** Order number, e.g. "FK-10234" */
  number: string;
  farmName: string;
};

// ---------------------------------------------------------------------------
// 4. Order accepted by the farm
// ---------------------------------------------------------------------------

export function orderAcceptedEmail(
  p: OrderRef & {
    fulfilment: "delivery" | "pickup";
    /** Delivery window label, e.g. "Sun 18 Oct, 9am – 12pm". */
    window?: string;
    /** Pickup point name, for pickup orders through a point (older orders). */
    pickupPointName?: string;
    /** Delivery placed before payment: the bill comes next. */
    unpaid?: boolean;
  },
): Email {
  const cta = { label: "Track your order", url: links.order(p.orderId) };
  const reason = orderReason(p.number);
  const next =
    p.fulfilment === "delivery" && p.unpaid
      ? "Farmkeke is arranging a rider. We'll send your bill, with the delivery price, as soon as it's set. You'll have 12 hours to pay."
      : p.fulfilment === "delivery"
        ? `A Farmkeke rider will bring it to you${p.window ? ` on <strong>${esc(p.window)}</strong>` : ""}. We'll email you when it's on its way.`
        : p.pickupPointName
          ? `It will go to <strong>${esc(p.pickupPointName)}</strong>. We'll email your pickup code when it's ready.`
          : "You'll collect it at the farm. We'll email the address and your pickup code when it's ready.";
  const nextText =
    p.fulfilment === "delivery" && p.unpaid
      ? "Farmkeke is arranging a rider. We'll send your bill, with the delivery price, as soon as it's set. You'll have 12 hours to pay."
      : p.fulfilment === "delivery"
        ? `A Farmkeke rider will bring it to you${p.window ? ` on ${p.window}` : ""}. We'll email you when it's on its way.`
        : p.pickupPointName
          ? `It will go to ${p.pickupPointName}. We'll email your pickup code when it's ready.`
          : "You'll collect it at the farm. We'll email the address and your pickup code when it's ready.";
  const moneyNote = p.unpaid ? "You haven't paid anything yet." : "Your money is still held safely by Farmkeke.";
  const body = [
    H1("Your order was accepted"),
    P(`${esc(hi(p.name))} <strong>${esc(p.farmName)}</strong> accepted order <strong>${esc(p.number)}</strong>. They're getting it ready now.`),
    P(next),
    NOTE(esc(moneyNote)),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order was accepted",
      "",
      `${hi(p.name)} ${p.farmName} accepted order ${p.number}. They're getting it ready now.`,
      nextText,
      moneyNote,
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`${p.farmName} accepted order ${p.number}`),
    html: page({ preheader: "The farm is getting your order ready.", body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 5. Out for delivery
// ---------------------------------------------------------------------------

export function outForDeliveryEmail(
  p: OrderRef & {
    /** When it should arrive, e.g. "today, 12pm – 3pm". */
    window: string;
    address?: string;
    riderName?: string;
  },
): Email {
  const cta = { label: "Track your order", url: links.order(p.orderId) };
  const reason = orderReason(p.number);
  const rows: Row[] = [
    { label: "Arriving", value: p.window },
    ...(p.address ? [{ label: "Delivering to", value: p.address }] : []),
    ...(p.riderName ? [{ label: "Your rider", value: p.riderName }] : []),
    { label: "From", value: p.farmName },
  ];
  const body = [
    H1("Your order is on its way"),
    P(`${esc(hi(p.name))} a Farmkeke rider is bringing order <strong>${esc(p.number)}</strong>.`),
    ROWS(rows),
    P("Please check every item when it arrives. Then confirm receipt on the order page."),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order is on its way",
      "",
      `${hi(p.name)} a Farmkeke rider is bringing order ${p.number}.`,
      ...rows.map((r) => `${r.label}: ${r.value}`),
      "",
      "Please check every item when it arrives. Then confirm receipt on the order page.",
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Your order ${p.number} is on its way`),
    html: page({ preheader: `Arriving ${p.window}.`, body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 6. Ready for pickup
// ---------------------------------------------------------------------------

export function readyForPickupEmail(
  p: OrderRef & {
    pickupCode: string;
    pickupPoint: PickupPoint;
    /** Last day to collect, e.g. "Fri 23 Oct". */
    collectBy: string;
    /** Days the point holds the order. PRD: 3. */
    collectWithinDays?: number;
  },
): Email {
  const days = p.collectWithinDays ?? 3;
  const cta = { label: "See pickup details", url: links.order(p.orderId) };
  const reason = orderReason(p.number);
  const pt = p.pickupPoint;
  const atFarm = pt.kind !== "point";
  const place = atFarm ? "the farm" : "the counter";
  const rows: Row[] = [
    { label: atFarm ? "Farm" : "Pickup point", value: pt.name },
    { label: "Address", value: pt.address },
    ...pt.hours.map((h, i) => ({ label: i === 0 ? "Open" : "", value: h })),
    ...(pt.phone ? [{ label: "Phone", value: pt.phone }] : []),
    { label: "Collect by", value: p.collectBy, strong: true },
  ];
  const body = [
    H1("Your order is ready for pickup"),
    P(`${esc(hi(p.name))} order <strong>${esc(p.number)}</strong> from ${esc(p.farmName)} is waiting for you.`),
    CODE(p.pickupCode),
    SMALL(`Show this code at ${place}. Only share it when you are collecting your order.`, "text-align:center;margin:-8px 0 20px;"),
    ROWS(rows),
    NOTE(`Please collect within <strong>${days} days</strong>, by <strong>${esc(p.collectBy)}</strong>.`),
    P(`Check everything at ${place}. Something wrong? Report it before you confirm.`),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order is ready for pickup",
      "",
      `${hi(p.name)} order ${p.number} from ${p.farmName} is waiting for you.`,
      "",
      `YOUR PICKUP CODE: ${p.pickupCode}`,
      `Show this code at ${place}. Only share it when you are collecting your order.`,
      "",
      `${atFarm ? "Farm" : "Pickup point"}: ${pt.name}`,
      `Address: ${pt.address}`,
      ...pt.hours.map((h) => `Open: ${h}`),
      ...(pt.phone ? [`Phone: ${pt.phone}`] : []),
      "",
      `Please collect within ${days} days, by ${p.collectBy}.`,
      `Check everything at ${place}. Something wrong? Report it before you confirm.`,
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Ready for pickup: order ${p.number}`),
    html: page({ preheader: `Collect from ${pt.name} by ${p.collectBy}. Your code is inside.`, body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 7. Delivered or collected: check, then confirm (or report a problem first)
// ---------------------------------------------------------------------------

export function orderDeliveredEmail(
  p: OrderRef & {
    /** "delivered" for delivery orders, "collected" for pickup. */
    how: "delivered" | "collected";
    /** Money held for this order. */
    heldKobo?: number;
    isGuest?: boolean;
  },
): Email {
  const cta = { label: "Check and confirm", url: links.order(p.orderId) };
  const reason = orderReason(p.number);
  const word = p.how === "collected" ? "collected" : "delivered";
  const body = [
    H1(`Your order was ${word}`),
    P(`${esc(hi(p.name))} order <strong>${esc(p.number)}</strong> from ${esc(p.farmName)} was ${word}.`),
    P("<strong>1.</strong> Check every item.<br><strong>2.</strong> If all is well, confirm receipt. Then the farm is paid."),
    NOTE(
      `Something wrong? ${LINK(links.reportProblem(p.orderId), "Report a problem")} <strong>before</strong> you confirm. Confirming can't be undone.` +
        (p.heldKobo ? ` Until then, ${esc(naira(p.heldKobo))} stays held by Farmkeke.` : ""),
    ),
    p.isGuest ? SMALL("You ordered as a guest, so please confirm on the phone or computer you ordered on.") : "",
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      `Your order was ${word}`,
      "",
      `${hi(p.name)} order ${p.number} from ${p.farmName} was ${word}.`,
      "1. Check every item.",
      "2. If all is well, confirm receipt. Then the farm is paid.",
      "",
      `Something wrong? Report a problem BEFORE you confirm. Confirming can't be undone.${p.heldKobo ? ` Until then, ${naira(p.heldKobo)} stays held by Farmkeke.` : ""}`,
      `Report a problem: ${links.reportProblem(p.orderId)}`,
      ...(p.isGuest ? ["", "You ordered as a guest, so please confirm on the phone or computer you ordered on."] : []),
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Order ${p.number} ${word}. Please check and confirm`),
    html: page({ preheader: "Check everything, then confirm. Something wrong? Report it first.", body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 8. The farm did not accept (declined or 24 hours passed): full refund
// ---------------------------------------------------------------------------

export function farmDidNotAcceptEmail(
  p: OrderRef & {
    refundKobo: number;
    /** "declined" if the farm said no, "timeout" if 24 hours passed. */
    why: "declined" | "timeout";
    /** How they paid, e.g. "card ending 4081" or "bank account". Optional. */
    paymentMethod?: string;
  },
): Email {
  const cta = { label: "See your refund", url: links.refund(p.orderId) };
  const reason = orderReason(p.number);
  const what =
    p.why === "timeout"
      ? `${p.farmName} didn't accept order ${p.number} within 24 hours.`
      : `${p.farmName} couldn't take order ${p.number}.`;
  const back = p.paymentMethod ? `your ${p.paymentMethod}` : "the way you paid";
  const body = [
    H1("Your order wasn't accepted"),
    P(`${esc(hi(p.name))} sorry. ${esc(what)}`),
    NOTE(`<strong>You'll get a full refund of ${esc(naira(p.refundKobo))}.</strong> It goes back to ${esc(back)}.`),
    P("Card and bank refunds can take a few working days to show."),
    BUTTON(cta.url, cta.label),
    SMALL(`Other farms may have what you need. ${LINK(links.shop(), "Shop again")}.`),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order wasn't accepted",
      "",
      `${hi(p.name)} sorry. ${what}`,
      `You'll get a full refund of ${naira(p.refundKobo)}. It goes back to ${back}.`,
      "Card and bank refunds can take a few working days to show.",
    ],
    cta,
    extra: [`Shop again: ${links.shop()}`],
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Order ${p.number} wasn't accepted. Full refund on the way`),
    html: page({ preheader: `Full refund of ${naira(p.refundKobo)} on the way.`, body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 9. Problem report received
// ---------------------------------------------------------------------------

export function problemReportReceivedEmail(
  p: OrderRef & {
    /** Case number, e.g. "DSP-2041" */
    caseNumber: string;
    /** Plain label, e.g. "Damaged or spoiled · 1 basket" */
    problem: string;
    /** When the farm must reply by, e.g. "Sun 18 Oct, 23:20" (12 hours). */
    farmReplyBy: string;
    /** Money held for this order. */
    heldKobo?: number;
  },
): Email {
  const cta = { label: "Follow this case", url: links.dispute(p.orderId) };
  const reason = orderReason(p.number);
  const rows: Row[] = [
    { label: "Case number", value: p.caseNumber },
    { label: "Order", value: `${p.number} · ${p.farmName}` },
    { label: "Problem", value: p.problem },
    { label: "Farm can reply by", value: p.farmReplyBy },
  ];
  const held = p.heldKobo ? `${naira(p.heldKobo)} stays held` : "Your payment stays held";
  const body = [
    H1("We've got your report"),
    P(`${esc(hi(p.name))} thanks for telling us. Here is what happens now:`),
    P("<strong>1.</strong> The farm has <strong>12 hours</strong> to reply.<br><strong>2.</strong> Farmkeke decides within <strong>about 1 day</strong>."),
    NOTE(`<strong>${esc(held)}</strong> by Farmkeke until we decide. The farm isn't paid yet.`),
    ROWS(rows),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "We've got your report",
      "",
      `${hi(p.name)} thanks for telling us. Here is what happens now:`,
      "1. The farm has 12 hours to reply.",
      "2. Farmkeke decides within about 1 day.",
      `${held} by Farmkeke until we decide. The farm isn't paid yet.`,
      "",
      ...rows.map((r) => `${r.label}: ${r.value}`),
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`We've got your report (case ${p.caseNumber})`),
    html: page({ preheader: "Your payment stays held while we look into it.", body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 10. Problem decision
// ---------------------------------------------------------------------------

export function problemDecisionEmail(
  p: OrderRef & {
    caseNumber: string;
    /**
     * Map from admin/disputes:resolve `outcome`:
     * "refunded" -> "full_refund", "split" -> "part_refund", "released" -> "no_refund".
     */
    outcome: "full_refund" | "part_refund" | "no_refund";
    /** Why, in plain words from Farmkeke support. */
    reason: string;
    /** Refund to the shopper (full or part). */
    refundKobo?: number;
    /** Paid to the farm. */
    releasedKobo?: number;
    /** Delivery fee on the order (not refunded on a part refund). */
    deliveryFeeKobo?: number;
  },
): Email {
  const refunding = p.outcome !== "no_refund";
  const cta = refunding
    ? { label: "See your refund", url: links.refund(p.orderId) }
    : { label: "See the case", url: links.dispute(p.orderId) };
  const why = orderReason(p.number);
  const title =
    p.outcome === "full_refund" ? "Full refund" : p.outcome === "part_refund" ? "Part refund" : "No refund";
  const headline =
    p.outcome === "full_refund"
      ? `You'll get a full refund of ${naira(p.refundKobo ?? 0)}.`
      : p.outcome === "part_refund"
        ? `You'll get a part refund of ${naira(p.refundKobo ?? 0)}.`
        : `This time there's no refund. The payment goes to ${p.farmName}.`;
  const rows: Row[] = [
    { label: "Case number", value: p.caseNumber },
    { label: "Order", value: `${p.number} · ${p.farmName}` },
    { label: "Decision", value: title, strong: true },
    ...(refunding && p.refundKobo !== undefined ? [{ label: "Refund to you", value: naira(p.refundKobo) }] : []),
    ...(p.releasedKobo ? [{ label: `Paid to ${p.farmName}`, value: naira(p.releasedKobo) }] : []),
  ];
  const extraLines: string[] = [];
  if (refunding) extraLines.push("The refund goes back to the card or bank account you paid with. Banks can take a few working days.");
  if (p.outcome === "part_refund")
    extraLines.push(
      `The delivery fee${p.deliveryFeeKobo ? ` (${naira(p.deliveryFeeKobo)})` : ""} isn't refunded, because the delivery still happened.`,
    );
  const body = [
    H1(`Decision on case ${esc(p.caseNumber)}`),
    P(`${esc(hi(p.name))} we've looked at your report for order <strong>${esc(p.number)}</strong>.`),
    NOTE(`<strong>${esc(headline)}</strong>`),
    H2("Why"),
    P(esc(p.reason)),
    ROWS(rows),
    ...extraLines.map((l) => P(esc(l))),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      `Decision on case ${p.caseNumber}`,
      "",
      `${hi(p.name)} we've looked at your report for order ${p.number}.`,
      headline,
      "",
      `Why: ${p.reason}`,
      "",
      ...rows.map((r) => `${r.label}: ${r.value}`),
      ...(extraLines.length ? ["", ...extraLines] : []),
    ],
    cta,
    reason: why,
  });
  return {
    to: p.to,
    subject: oneLine(`Decision on case ${p.caseNumber}: ${title.toLowerCase()}`),
    html: page({ preheader: headline, body, reason: why }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 11. Refund sent
// ---------------------------------------------------------------------------

export function refundSentEmail(
  p: OrderRef & {
    amountKobo: number;
    /** "full" or "part". A part refund leaves out the delivery fee. */
    kind: "full" | "part";
    /** Where it's going, e.g. "card ending 4081" or "bank account". */
    method: string;
    /** Refund reference, e.g. "RF-58213". Optional. */
    reference?: string;
    deliveryFeeKobo?: number;
  },
): Email {
  const cta = { label: "See refund status", url: links.refund(p.orderId) };
  const reason = orderReason(p.number);
  const rows: Row[] = [
    { label: "Refund", value: naira(p.amountKobo), strong: true },
    { label: "Order", value: `${p.number} · ${p.farmName}` },
    { label: "Back to", value: p.method },
    ...(p.reference ? [{ label: "Refund reference", value: p.reference }] : []),
  ];
  const partLine =
    p.kind === "part"
      ? `This is a part refund. The delivery fee${p.deliveryFeeKobo ? ` (${naira(p.deliveryFeeKobo)})` : ""} isn't refunded, because the delivery still happened.`
      : "";
  const body = [
    H1("Your refund is on its way"),
    P(`${esc(hi(p.name))} we've sent <strong>${esc(naira(p.amountKobo))}</strong> back to your ${esc(p.method)}.`),
    ROWS(rows),
    NOTE("Card and bank refunds can take a few working days to show on your statement."),
    partLine ? P(esc(partLine)) : "",
    SMALL(
      `Not there after 7 working days? Share the refund reference with your bank, or reply to this email and we'll check.`,
    ),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your refund is on its way",
      "",
      `${hi(p.name)} we've sent ${naira(p.amountKobo)} back to your ${p.method}.`,
      "",
      ...rows.map((r) => `${r.label}: ${r.value}`),
      "",
      "Card and bank refunds can take a few working days to show on your statement.",
      ...(partLine ? [partLine] : []),
      "Not there after 7 working days? Share the refund reference with your bank, or reply to this email and we'll check.",
    ],
    cta,
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Your refund of ${naira(p.amountKobo)} is on its way`),
    html: page({ preheader: `Back to your ${p.method}. It can take a few working days.`, body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 12. Payment released to the farm: thanks, leave a review
// ---------------------------------------------------------------------------

export function paymentReleasedEmail(p: OrderRef & { amountKobo: number }): Email {
  const cta = { label: "Leave a review", url: links.review(p.orderId) };
  const reason = orderReason(p.number);
  const body = [
    H1("Thanks for confirming"),
    P(`${esc(hi(p.name))} <strong>${esc(naira(p.amountKobo))}</strong> has been paid to <strong>${esc(p.farmName)}</strong> for order <strong>${esc(p.number)}</strong>.`),
    P("How was your order? Your review helps other shoppers, and helps the farm grow."),
    BUTTON(cta.url, cta.label),
    SMALL(`Fancy more? ${LINK(links.shop(), "Shop again")}.`),
  ].join("\n");
  const text = plain({
    lines: [
      "Thanks for confirming",
      "",
      `${hi(p.name)} ${naira(p.amountKobo)} has been paid to ${p.farmName} for order ${p.number}.`,
      "How was your order? Your review helps other shoppers, and helps the farm grow.",
    ],
    cta,
    extra: [`Shop again: ${links.shop()}`],
    reason,
  });
  return {
    to: p.to,
    subject: oneLine(`Thanks for confirming order ${p.number}`),
    html: page({ preheader: `How was your order from ${p.farmName}? Leave a quick review.`, body, reason }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Label helpers for the backend (Nigerian time, UTC+1, no Intl needed)
// ---------------------------------------------------------------------------

/** "09:00" -> "9am", "12:30" -> "12:30pm". */
export function clockLabel(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${suffix}`;
}

/** A delivery window { day: "2026-10-18", from: "09:00", to: "12:00" } -> "Sun 18 Oct, 9am – 12pm". */
export function windowLabel(w: { day: string; from: string; to: string }): string {
  const [y, mo, d] = w.day.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1));
  const day = `${DAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return `${day}, ${clockLabel(w.from)} – ${clockLabel(w.to)}`;
}

/** Opening hours as display lines, one per day: ["Mon, 8am – 7pm", …]. */
export function hoursLines(hours: { day: number; opens: string; closes: string }[]): string[] {
  return [...hours]
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
    .map((h) => `${DAYS[h.day] ?? ""}, ${clockLabel(h.opens)} – ${clockLabel(h.closes)}`);
}

// ===========================================================================
// Emails added in phase 9 (shopper updates, messages, account security and
// the farm side). They share one composer so every email has the same parts:
// a heading, blocks with a plain-text twin, one lime button, the help line and
// a footer saying why it was sent.
// ===========================================================================

/** Rich text: plain strings, bold parts and links. Everything is escaped. */
type Part = string | { b: string } | { link: string; label: string };
const partHtml = (p: Part) =>
  typeof p === "string" ? esc(p) : "b" in p ? `<strong>${esc(p.b)}</strong>` : LINK(p.link, p.label);
const partText = (p: Part) => (typeof p === "string" ? p : "b" in p ? p.b : `${p.label} (${p.link})`);
const richHtml = (parts: Part[]) => parts.map(partHtml).join("");
const richText = (parts: Part[]) => parts.map(partText).join("");

type Block = { html: string; text: string[] };

const b = {
  p: (...parts: Part[]): Block => ({ html: P(richHtml(parts)), text: [richText(parts)] }),
  small: (...parts: Part[]): Block => ({ html: SMALL(richHtml(parts)), text: [richText(parts)] }),
  note: (...parts: Part[]): Block => ({ html: NOTE(richHtml(parts)), text: [richText(parts)] }),
  h2: (title: string): Block => ({ html: H2(esc(title)), text: [title] }),
  rows: (rows: Row[]): Block => ({
    html: ROWS(rows),
    text: rows.map((r) => (r.label ? `${r.label}: ${r.value}` : `  ${r.value}`)),
  }),
  steps: (steps: { title: string; note?: string }[]): Block => ({ html: STEPS(steps), text: stepsText(steps) }),
  code: (code: string): Block => ({
    html:
      CODE(code) +
      SMALL("Show this code at the counter. Only share it when you are collecting your order.", "text-align:center;margin:-8px 0 20px;"),
    text: [`YOUR PICKUP CODE: ${code}`, "Show this code at the counter. Only share it when you are collecting your order."],
  }),
  /** A message someone sent, shown as a quote. */
  quote: (from: string, body: string): Block => ({
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td bgcolor="${TINT}" style="border-left:4px solid ${LIME};background:${TINT};border-radius:0 12px 12px 0;padding:12px 16px;font-family:${BODY_FONT};">
<p style="margin:0 0 4px;font-size:13px;line-height:18px;font-weight:600;color:${MUTED};">${esc(from)}</p>
<p style="margin:0;font-size:15px;line-height:22px;color:${INK};white-space:pre-line;">${esc(body)}</p>
</td></tr></table>`,
    text: [`${from}:`, ...body.split("\n").map((l) => `> ${l}`)],
  }),
  /** Farm emails: where to find this in the app. */
  inApp: (path: string[]): Block => ({
    html: NOTE(`<strong>In the Farmkeke app:</strong> ${path.map((s) => esc(s)).join(" &rarr; ")}`),
    text: [`In the Farmkeke app: ${path.join(" > ")}`],
  }),
};

type Composed = {
  to: string;
  subject: string;
  preheader: string;
  title: string;
  blocks: Block[];
  cta: { label: string; url: string };
  /** Blocks under the button (secondary links). */
  after?: Block[];
  reason: string;
};

function compose(p: Composed): Email {
  const body = [
    H1(esc(p.title)),
    ...p.blocks.map((x) => x.html),
    BUTTON(p.cta.url, p.cta.label),
    ...(p.after ?? []).map((x) => x.html),
  ].join("\n");
  const lines = [p.title, ""];
  p.blocks.forEach((x, i) => {
    if (i > 0) lines.push("");
    lines.push(...x.text);
  });
  const text = plain({ lines, cta: p.cta, extra: p.after?.flatMap((x) => x.text), reason: p.reason });
  return {
    to: p.to,
    subject: oneLine(p.subject),
    html: page({ preheader: p.preheader, body, reason: p.reason }),
    text,
  };
}

/** Order emails a shopper can turn off (messages, reminders). */
const optionalOrderReason = (number: string, isGuest?: boolean) =>
  orderReason(number) + (isGuest ? "" : " You can turn these emails off in Account, Notifications.");

const SECURITY_REASON =
  "This is a security email about your Farmkeke account. We always send these, even if you've turned other emails off.";

// ---------------------------------------------------------------------------
// 13. Order being prepared (the farm started preparing)
// ---------------------------------------------------------------------------

export function orderPreparingEmail(
  p: OrderRef & { fulfilment: "delivery" | "pickup"; window?: string; pickupPointName?: string; isGuest?: boolean; unpaid?: boolean },
): Email {
  const next: Part[] =
    p.fulfilment === "delivery" && p.unpaid
      ? ["We'll send your bill, with the delivery price, as soon as a rider is arranged. The rider collects it once you've paid."]
      : p.fulfilment === "delivery"
        ? ["When it's packed, a Farmkeke rider collects it and brings it to you", ...(p.window ? [" on ", { b: p.window }] : []), "."]
        : p.pickupPointName
          ? ["When it's packed, a rider takes it to ", { b: p.pickupPointName }, ". We'll email your pickup code when it's ready."]
          : ["When it's ready, you'll collect it at the farm. We'll email the address and your pickup code."];
  return compose({
    to: p.to,
    subject: `${p.farmName} is preparing order ${p.number}`,
    preheader: "Your order is being packed at the farm.",
    title: "Your order is being prepared",
    blocks: [
      b.p(hi(p.name), " ", { b: p.farmName }, " has started preparing order ", { b: p.number }, "."),
      b.p(...next),
      b.note(p.unpaid ? "You haven't paid anything yet." : "Your money is still held safely by Farmkeke."),
    ],
    cta: { label: "Track your order", url: links.order(p.orderId) },
    reason: optionalOrderReason(p.number, p.isGuest),
  });
}

// ---------------------------------------------------------------------------
// 14. Order cancelled by Farmkeke (A-52): full refund, delivery fee included
// ---------------------------------------------------------------------------

export function orderCancelledEmail(
  p: OrderRef & { refundKobo: number; deliveryFeeKobo?: number; paymentMethod?: string; unpaid?: boolean },
): Email {
  const back = p.paymentMethod ? `your ${p.paymentMethod}` : "the way you paid";
  // A delivery order cancelled before its bill was paid: nothing to refund
  if (p.unpaid) {
    return compose({
      to: p.to,
      subject: `Order ${p.number} was cancelled`,
      preheader: "You weren't charged.",
      title: "Your order was cancelled",
      blocks: [
        b.p(hi(p.name), " sorry. Farmkeke had to cancel order ", { b: p.number }, ` from ${p.farmName}.`),
        b.note({ b: "You weren't charged." }, " The order hadn't been paid yet."),
      ],
      cta: { label: "Shop again", url: links.shop() },
      reason: orderReason(p.number),
    });
  }
  return compose({
    to: p.to,
    subject: `Order ${p.number} was cancelled. Full refund on the way`,
    preheader: `Full refund of ${naira(p.refundKobo)} on the way.`,
    title: "Your order was cancelled",
    blocks: [
      b.p(hi(p.name), " sorry. Farmkeke had to cancel order ", { b: p.number }, ` from ${p.farmName}.`),
      b.note(
        { b: `You'll get a full refund of ${naira(p.refundKobo)}` },
        p.deliveryFeeKobo ? ", delivery fee included" : "",
        `. It goes back to ${back}.`,
      ),
      b.p("Card and bank refunds can take a few working days to show. We'll email you when it's sent."),
    ],
    cta: { label: "See your refund", url: links.refund(p.orderId) },
    after: [b.small("Other farms may have what you need. ", { link: links.shop(), label: "Shop again" }, ".")],
    reason: orderReason(p.number),
  });
}

// ---------------------------------------------------------------------------
// 14a. Delivery orders: received (unpaid), the bill and its reminder, and the
// bill lapsing. Delivery is priced per order once a rider is arranged.
// ---------------------------------------------------------------------------

export type BillOrder = {
  orderId: string;
  number: string;
  farmName: string;
  items: OrderItem[];
  itemsKobo: number;
  deliveryFeeKobo: number;
};

const billRows = (o: BillOrder, withDelivery: boolean): Row[] => [
  ...o.items.map((it) => ({ label: itemLabel(it), value: naira(it.totalKobo) })),
  { label: "Products", value: naira(o.itemsKobo) },
  ...(withDelivery ? [{ label: "Delivery", value: naira(o.deliveryFeeKobo) }] : []),
];

export function orderReceivedEmail(p: { to: string; name?: string; orders: BillOrder[]; address: string; isGuest: boolean }): Email {
  const many = p.orders.length > 1;
  const first = p.orders[0]!;
  const numbers = p.orders.map((o) => o.number).join(", ");
  const productsKobo = p.orders.reduce((sum, o) => sum + o.itemsKobo, 0);
  return compose({
    to: p.to,
    subject: `We've got your order ${numbers}`,
    preheader: "Nothing to pay yet. Your bill comes once the delivery is priced.",
    title: many ? "We've got your orders" : "We've got your order",
    blocks: [
      b.p(hi(p.name), " thank you. We've sent ", many ? "your orders to the farms" : `your order to ${first.farmName}`, "."),
      b.note({ b: "Nothing to pay yet." }, " Products come to ", { b: naira(productsKobo) }, ". Delivery is priced once a rider is arranged."),
      ...p.orders.flatMap((o) => [b.h2(`${o.number} · ${o.farmName}`), b.rows(billRows(o, false))]),
      b.h2("What happens next"),
      b.steps([
        { title: "The farm accepts", note: "Farms have 24 hours to accept." },
        { title: "We arrange a rider and price the delivery", note: `To ${p.address}.` },
        { title: "You get your bill", note: "By email, text and in the app. You'll have 12 hours to pay." },
        { title: "The rider brings your order", note: "Your money is held safely until you confirm it arrived." },
      ]),
    ],
    cta: { label: many ? "See your orders" : "See your order", url: many && !p.isGuest ? links.account() : links.order(first.orderId) },
    reason: `You're getting this email because you placed ${many ? "orders" : "order"} ${numbers} on Farmkeke.`,
  });
}

export function billEmail(p: {
  to: string;
  name?: string;
  orders: BillOrder[];
  totalKobo: number;
  deliveryFeeKobo: number;
  /** "Tue 20 Oct, 9:15pm" */
  payBy: string;
  link: string;
  reminder?: boolean;
}): Email {
  const numbers = p.orders.map((o) => o.number).join(", ");
  return compose({
    to: p.to,
    subject: p.reminder ? `Reminder: pay ${naira(p.totalKobo)} for order ${numbers}` : `Your bill for order ${numbers}: ${naira(p.totalKobo)}`,
    preheader: `${naira(p.totalKobo)}, delivery included. Pay by ${p.payBy}.`,
    title: p.reminder ? "Your bill is still waiting" : "Your bill is ready",
    blocks: [
      b.p(
        hi(p.name),
        p.reminder
          ? " your order is packed and waiting at the farm. Pay now so the rider can bring it."
          : " the farm has accepted your order and a rider is arranged. Here's your bill, delivery included.",
      ),
      ...p.orders.flatMap((o) => [b.h2(`${o.number} · ${o.farmName}`), b.rows(billRows(o, true))]),
      b.rows([
        { label: "Delivery", value: naira(p.deliveryFeeKobo) },
        { label: "Total to pay", value: naira(p.totalKobo), strong: true },
      ]),
      b.note({ b: `Pay by ${p.payBy}.` }, " If it isn't paid by then, the order is cancelled and the farm is told."),
      b.p("Your money is held safely by Farmkeke. The farm is paid only after you confirm you got everything."),
    ],
    cta: { label: `Pay ${naira(p.totalKobo)}`, url: p.link },
    after: [b.small("The link works on any phone or computer. Anyone you share it with can pay this bill, so keep it to yourself.")],
    reason: `You're getting this email because you placed order ${numbers} on Farmkeke. We always send bills.`,
  });
}

export function billExpiredEmail(p: { to: string; name?: string; numbers: string[] }): Email {
  const numbers = p.numbers.join(", ");
  return compose({
    to: p.to,
    subject: `Order ${numbers} was cancelled`,
    preheader: "The bill wasn't paid in time. You weren't charged.",
    title: "Your order was cancelled",
    blocks: [
      b.p(hi(p.name), " the bill for order ", { b: numbers }, " wasn't paid within 12 hours, so the order is cancelled."),
      b.note({ b: "You weren't charged." }, " The farm has been told."),
      b.p("Still want it? You can order again any time."),
    ],
    cta: { label: "Shop again", url: links.shop() },
    reason: `You're getting this email because you placed order ${numbers} on Farmkeke.`,
  });
}

// ---------------------------------------------------------------------------
// 15. Pickup reminder (a day before collect-by)
// ---------------------------------------------------------------------------

export function pickupReminderEmail(
  p: OrderRef & { pickupCode: string; pickupPoint: PickupPoint; collectBy: string },
): Email {
  const pt = p.pickupPoint;
  return compose({
    to: p.to,
    subject: `Reminder: collect order ${p.number} by ${p.collectBy}`,
    preheader: `Your order is waiting at ${pt.name}. Your code is inside.`,
    title: "Your order is still waiting",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, ` from ${p.farmName} is waiting for you at `, { b: pt.name }, "."),
      b.code(p.pickupCode),
      b.rows([
        { label: pt.kind === "point" ? "Pickup point" : "Farm", value: pt.name },
        { label: "Address", value: pt.address },
        ...pt.hours.map((h, i) => ({ label: i === 0 ? "Open" : "", value: h })),
        ...(pt.phone ? [{ label: "Phone", value: pt.phone }] : []),
        { label: "Collect by", value: p.collectBy, strong: true },
      ]),
      b.note("Please collect it by ", { b: p.collectBy }, ". Can't make it? Reply to this email and we'll help."),
    ],
    cta: { label: "See pickup details", url: links.order(p.orderId) },
    reason: orderReason(p.number),
  });
}

// ---------------------------------------------------------------------------
// 16. Pickup window ended (pickup_overdue)
// ---------------------------------------------------------------------------

export function pickupWindowEndedEmail(p: OrderRef & { pointName: string; heldKobo?: number; atFarm?: boolean }): Email {
  return compose({
    to: p.to,
    subject: p.atFarm ? `Order ${p.number} is still waiting at the farm` : `Order ${p.number} is still at the pickup point`,
    preheader: "Your collection time has passed. Here is what happens next.",
    title: "Your collection time has passed",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, ` from ${p.farmName} is still at `, { b: p.pointName }, ", and the time to collect it has ended."),
      b.h2("What happens next"),
      b.steps([
        { title: "Contact Farmkeke support", note: "Reply to this email, or use the help page, so we can sort it out." },
        { title: "We agree what happens to your order", note: "A new time to collect, or what to do if the food can't wait." },
        {
          title: "Your money stays held",
          note: p.heldKobo ? `${naira(p.heldKobo)} stays with Farmkeke until it's sorted.` : "Farmkeke keeps holding it until it's sorted.",
        },
      ]),
    ],
    cta: { label: "See your order", url: links.order(p.orderId) },
    reason: orderReason(p.number),
  });
}

// ---------------------------------------------------------------------------
// 17. Confirm-receipt reminder (a day after delivery, still unconfirmed)
// ---------------------------------------------------------------------------

export function confirmReminderEmail(
  p: OrderRef & { how: "delivered" | "collected"; heldKobo?: number; isGuest?: boolean },
): Email {
  return compose({
    to: p.to,
    subject: `Did order ${p.number} arrive?`,
    preheader: "Please confirm, or tell us about a problem. The farm is paid once you confirm.",
    title: "Did your order arrive?",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, ` from ${p.farmName} was ${p.how}, but it isn't confirmed yet.`),
      b.p("If everything was right, please confirm receipt. Then the farm is paid."),
      b.note(
        "Something wrong? ",
        { link: links.reportProblem(p.orderId), label: "Report a problem" },
        " before you confirm.",
        p.heldKobo ? ` Until then, ${naira(p.heldKobo)} stays held by Farmkeke.` : "",
      ),
      ...(p.isGuest ? [b.small("You ordered as a guest, so please confirm on the phone or computer you ordered on.")] : []),
    ],
    cta: { label: "Check and confirm", url: links.order(p.orderId) },
    reason: optionalOrderReason(p.number, p.isGuest),
  });
}

// ---------------------------------------------------------------------------
// 18. Review reminder (a day after confirming)
// ---------------------------------------------------------------------------

export function reviewReminderEmail(p: OrderRef & { isGuest?: boolean }): Email {
  return compose({
    to: p.to,
    subject: `How was your order from ${p.farmName}?`,
    preheader: "Rate the farm to help other shoppers.",
    title: "How was your order?",
    blocks: [
      b.p(hi(p.name), " you confirmed order ", { b: p.number }, " from ", { b: p.farmName }, "."),
      b.p("A quick rating helps other shoppers choose, and helps the farm grow. It takes less than a minute."),
    ],
    cta: { label: "Leave a review", url: links.review(p.orderId) },
    reason: optionalOrderReason(p.number, p.isGuest),
  });
}

// ---------------------------------------------------------------------------
// 19. Messages: order chat, problem report and support replies
//     (at most one email per thread every 30 minutes; notifications/store)
// ---------------------------------------------------------------------------

export function chatMessageEmail(p: OrderRef & { preview: string; isGuest?: boolean }): Email {
  return compose({
    to: p.to,
    subject: `${p.farmName} sent you a message about order ${p.number}`,
    preheader: p.preview,
    title: `New message from ${p.farmName}`,
    blocks: [
      b.p(hi(p.name), " ", { b: p.farmName }, " wrote about order ", { b: p.number }, ":"),
      b.quote(p.farmName, p.preview),
      b.small("We send at most one email per conversation every 30 minutes. Open the chat to see every message."),
    ],
    cta: { label: "Reply in the chat", url: links.chat(p.orderId) },
    reason: optionalOrderReason(p.number, p.isGuest),
  });
}

export function disputeMessageEmail(
  p: OrderRef & { caseNumber: string; from: string; preview: string; isGuest?: boolean },
): Email {
  return compose({
    to: p.to,
    subject: `New message on case ${p.caseNumber}`,
    preheader: `${p.from}: ${p.preview}`,
    title: `New message on case ${p.caseNumber}`,
    blocks: [
      b.p(hi(p.name), " there's a new message about your problem report for order ", { b: p.number }, "."),
      b.quote(p.from, p.preview),
      b.small("We send at most one email per case every 30 minutes. Open the case to see every message."),
    ],
    cta: { label: "See the case", url: links.dispute(p.orderId) },
    reason: optionalOrderReason(p.number, p.isGuest),
  });
}

export function supportReplyEmail(p: {
  to: string;
  name?: string;
  /** "SUP-1001" */
  ticketNumber?: string;
  preview: string;
  /** The order the conversation is about, if any. */
  order?: { orderId: string; number: string };
  isGuest?: boolean;
}): Email {
  const ref = p.ticketNumber ? ` (${p.ticketNumber})` : "";
  const cta = p.order
    ? { label: "See your order", url: links.order(p.order.orderId) }
    : { label: "Write back to support", url: links.contact() };
  return compose({
    to: p.to,
    subject: `Farmkeke support replied${ref}`,
    preheader: p.preview,
    title: "Farmkeke support replied",
    blocks: [
      b.p(hi(p.name), ` we've replied to your message${ref}`, p.order ? ` about order ${p.order.number}` : "", ":"),
      b.quote("Farmkeke support", p.preview),
      b.small("Reply to this email to write back. We usually answer within a day."),
    ],
    cta,
    reason:
      `You're getting this email because you contacted Farmkeke support${ref}.` +
      (p.isGuest ? "" : " You can turn these emails off in Account, Notifications."),
  });
}

// ---------------------------------------------------------------------------
// 20. Account security emails (always sent, whatever the preferences)
// ---------------------------------------------------------------------------

/** W-42d: after changing the password, or after a reset link was used. */
export function passwordChangedEmail(p: { to: string; name?: string; how: "changed" | "reset"; at: string }): Email {
  return compose({
    to: p.to,
    subject: "Your Farmkeke password was changed",
    preheader: "If this wasn't you, contact support straight away.",
    title: "Your password is changed",
    blocks: [
      b.p(hi(p.name), " the password for ", { b: p.to }, p.how === "reset" ? " was reset with an email link on " : " was changed on ", { b: p.at }, "."),
      b.p("Sign in with your new password on the website or in the Farmkeke app. Other phones and computers were signed out."),
      b.note({ b: "Didn't change your password?" }, " Contact support straight away by replying to this email, then reset your password."),
    ],
    cta: { label: "Sign in", url: links.signIn() },
    after: [b.small("Need to reset it? ", { link: links.forgotPassword(), label: "Forgot password" }, ".")],
    reason: SECURITY_REASON,
  });
}

/** Sent to the OLD address when the sign-in email changes. */
export function emailChangedNoticeEmail(p: { to: string; name?: string; newEmail: string; at: string }): Email {
  return compose({
    to: p.to,
    subject: "Your Farmkeke email address was changed",
    preheader: "If this wasn't you, contact support straight away.",
    title: "Your email address was changed",
    blocks: [
      b.p(hi(p.name), " the email address for your Farmkeke account was changed on ", { b: p.at }, "."),
      b.rows([
        { label: "Old address", value: p.to },
        { label: "New address", value: p.newEmail, strong: true },
      ]),
      b.p("From now on you sign in, and get Farmkeke emails, at the new address. This is the last email we'll send here."),
      b.note({ b: "Didn't make this change?" }, " Reply to this email straight away so we can secure your account."),
    ],
    cta: { label: "Contact support", url: links.contact() },
    reason: SECURITY_REASON,
  });
}

/** Sent to the NEW address when the sign-in email changes. */
export function emailChangedConfirmEmail(p: { to: string; name?: string; oldEmail: string }): Email {
  return compose({
    to: p.to,
    subject: "This is now your Farmkeke email address",
    preheader: "Sign in with this address from now on.",
    title: "Your new email address is set",
    blocks: [
      b.p(hi(p.name), " ", { b: p.to }, " is now the email address for your Farmkeke account."),
      b.p("Use it to sign in on the website and in the app. Your password hasn't changed. Order updates and receipts now come here."),
      b.small(`We've also told your old address (${p.oldEmail}) about this change.`),
    ],
    cta: { label: "Go to your account", url: links.account() },
    reason: SECURITY_REASON,
  });
}

/** M-95 / W-49: deleted now, or waiting for orders in progress to finish. */
export function accountDeletionEmail(
  p: { to: string; name?: string } & ({ status: "deleted" } | { status: "waiting"; orders: number }),
): Email {
  if (p.status === "waiting") {
    const n = p.orders === 1 ? "1 order" : `${p.orders} orders`;
    const isAre = p.orders === 1 ? "it's" : "they're";
    return compose({
      to: p.to,
      subject: "Your Farmkeke account will be deleted soon",
      preheader: `We'll delete it once your ${n} in progress ${p.orders === 1 ? "is" : "are"} finished.`,
      title: "We'll delete your account soon",
      blocks: [
        b.p(hi(p.name), " you asked us to delete your Farmkeke account."),
        b.note("You have ", { b: `${n} in progress` }, `. We'll delete your account automatically once ${isAre} finished, and email you when it's done.`),
        b.p("Until then you can still sign in to confirm receipt or report a problem. Your money stays held safely until each order is finished."),
        b.h2("What happens when we delete it"),
        b.steps([
          { title: "Your saved addresses, saved items and preferences are erased" },
          { title: "You can no longer see past orders or receipts" },
          { title: "We keep a record of past payments for accounting" },
        ]),
      ],
      cta: { label: "See your orders", url: `${siteUrl()}/account/orders` },
      after: [b.small("Changed your mind? Reply to this email before your orders finish.")],
      reason: SECURITY_REASON,
    });
  }
  return compose({
    to: p.to,
    subject: "Your Farmkeke account is deleted",
    preheader: "Your account and saved details have been removed.",
    title: "Your account is deleted",
    blocks: [
      b.p(hi(p.name), " your Farmkeke account has been deleted, on the website and in the app."),
      b.steps([
        { title: "Your saved addresses, saved items and preferences are erased" },
        { title: "You can't sign in with this email any more" },
        { title: "We keep a record of past payments for accounting" },
      ]),
      b.p("Thank you for buying from Nigerian farms with us. To shop again, you can create a new account any time."),
      b.note({ b: "Didn't ask for this?" }, " Reply to this email straight away."),
    ],
    cta: { label: "Visit Farmkeke", url: siteUrl() },
    reason: "This is the last email about your deleted Farmkeke account.",
  });
}

/** After a guest's orders are added to their account (W-44). */
export function guestOrdersAddedEmail(p: { to: string; name?: string; numbers: string[]; total: number }): Email {
  const n = p.total === 1 ? "1 order" : `${p.total} orders`;
  const shown = p.numbers.slice(0, 10);
  return compose({
    to: p.to,
    subject: p.total === 1 ? "Your guest order is now in your account" : `${p.total} guest orders are now in your account`,
    preheader: "Track them, confirm them and report problems from any device.",
    title: "Your guest orders are in your account",
    blocks: [
      b.p(hi(p.name), " we've added ", { b: n }, " you placed as a guest to your Farmkeke account."),
      b.rows(shown.map((number, i) => ({ label: i === 0 ? "Orders" : "", value: number }))),
      ...(p.total > shown.length ? [b.small(`And ${p.total - shown.length} more.`)] : []),
      b.p("You can now track them, confirm receipt and report problems from any phone or computer you sign in on."),
      b.small("Didn't do this? Reply to this email straight away."),
    ],
    cta: { label: "See your orders", url: `${siteUrl()}/account/orders` },
    reason: SECURITY_REASON,
  });
}

/**
 * W-42 / W-44: guest orders placed with this email on another device. The
 * link proves the address is the shopper's before the orders are added.
 */
export function guestOrdersConfirmEmail(p: { to: string; name?: string; total: number; link: string }): Email {
  const n = p.total === 1 ? "1 order" : `${p.total} orders`;
  return compose({
    to: p.to,
    subject: p.total === 1 ? "Add your guest order to your account" : `Add your ${p.total} guest orders to your account`,
    preheader: "Confirm it's your email, and we'll add them.",
    title: "Add your guest orders",
    blocks: [
      b.p(hi(p.name), " we found ", { b: n }, " placed as a guest with ", { b: p.to }, "."),
      b.p("Confirm this is your email and we'll add them to your Farmkeke account. You can then track them, confirm receipt and report problems from any device."),
      b.small("The link works once, for 24 hours, while you're signed in to your account. Didn't ask for this? You can ignore this email."),
    ],
    cta: { label: "Add them to my account", url: p.link },
    reason: SECURITY_REASON,
  });
}

// ---------------------------------------------------------------------------
// 20b. Back in stock (W-47 "Notify me")
// ---------------------------------------------------------------------------

export function backInStockEmail(p: {
  to: string;
  name?: string;
  listingId: string;
  listingName: string;
  farmName: string;
  priceKobo?: number;
  unit?: string;
}): Email {
  return compose({
    to: p.to,
    subject: `${p.listingName} is back in stock`,
    preheader: `${p.farmName} has ${p.listingName} again.`,
    title: `${p.listingName} is back`,
    blocks: [
      b.p(hi(p.name), " you asked us to tell you when ", { b: p.listingName }, " from ", { b: p.farmName }, " was back. It is."),
      ...(p.priceKobo !== undefined
        ? [b.rows([{ label: p.listingName, value: `${naira(p.priceKobo)}${p.unit ? ` / ${p.unit}` : ""}` }])]
        : []),
      b.p("Fresh produce sells out quickly, so order soon if you'd like some."),
    ],
    cta: { label: "See it in the shop", url: links.product(p.listingId) },
    reason:
      "You're getting this email because you tapped Notify me on a saved item. We only send it once. You can turn these emails off in Account, Notifications.",
  });
}

// ---------------------------------------------------------------------------
// 21. Farm emails. Farmers work in the app, so each one says where to look,
//     and the button opens the app (GET /open-app on this deployment).
// ---------------------------------------------------------------------------

type FarmRef = { to: string; name?: string; farmName: string };

const openApp = () => ({ label: "Open the Farmkeke app", url: links.openApp() });
const farmReason = (farmName: string) =>
  `You're getting this email because ${farmName} sells on Farmkeke. Choose which emails you get in the app: Farm, Notifications.`;
const FARM_MONEY_REASON =
  "You're getting this email because you sell on Farmkeke. Payment emails can't be turned off, so you never miss a change to your money.";
const APPLICATION_REASON = "You're getting this email because you applied to sell on Farmkeke.";
const APPLICATION_PATH = ["Account", "Selling", "Your application"];
const farmOrderPath = (number: string, ...more: string[]) => ["Switch to farmer mode", "Orders", `Order ${number}`, ...more];

export function applicationReceivedEmail(p: { to: string; name?: string; reference: string; decisionBy: string }): Email {
  return compose({
    to: p.to,
    subject: `We received your application (${p.reference})`,
    preheader: `Expect a decision by ${p.decisionBy}.`,
    title: "We received your application",
    blocks: [
      b.p(hi(p.name), " thank you for applying to sell on Farmkeke."),
      b.rows([
        { label: "Reference", value: p.reference },
        { label: "Expect a decision by", value: p.decisionBy, strong: true },
      ]),
      b.p("Our team checks your farm details and documents. We'll email you as soon as we decide, or if we need anything else."),
      b.inApp(APPLICATION_PATH),
    ],
    cta: openApp(),
    reason: APPLICATION_REASON,
  });
}

export function applicationApprovedEmail(p: { to: string; name?: string; farmName: string }): Email {
  return compose({
    to: p.to,
    subject: `You're approved: ${p.farmName} can now sell on Farmkeke`,
    preheader: "Switch to farmer mode to finish setting up your farm.",
    title: "You're approved",
    blocks: [
      b.p(hi(p.name), " welcome to Farmkeke. ", { b: p.farmName }, " is approved, and farmer mode is now open in your app."),
      b.h2("Next steps in the app"),
      b.steps([
        { title: "Switch to farmer mode", note: "Account, Switch to farmer mode." },
        { title: "Complete your farm profile" },
        { title: "Confirm when riders can collect" },
        { title: "Add your first listing", note: "Listings, Add. We check new listings before they go live." },
      ]),
      b.note("Shoppers pay Farmkeke first. We hold the money safely and pay you once they confirm they got their order."),
    ],
    cta: openApp(),
    reason: APPLICATION_REASON,
  });
}

export function applicationRejectedEmail(p: {
  to: string;
  name?: string;
  reference?: string;
  reason: string;
  note?: string;
  /** "Mon 2 Nov"; omit when they can apply again now. */
  reapplyFrom?: string;
}): Email {
  return compose({
    to: p.to,
    subject: `Your Farmkeke application${p.reference ? ` (${p.reference})` : ""} wasn't approved`,
    preheader: p.reapplyFrom ? `You can apply again from ${p.reapplyFrom}.` : "You can apply again.",
    title: "Not approved this time",
    blocks: [
      b.p(hi(p.name), " thank you for applying to sell on Farmkeke. We're sorry, but we couldn't approve your application this time."),
      b.h2("Why"),
      b.p(p.reason),
      ...(p.note ? [b.quote("Note from Farmkeke", p.note)] : []),
      p.reapplyFrom
        ? b.note("You can apply again from ", { b: p.reapplyFrom }, ". Your bank details are kept.")
        : b.note("You can start a new application now. Your bank details are kept."),
      b.inApp(APPLICATION_PATH),
    ],
    cta: openApp(),
    reason: APPLICATION_REASON,
  });
}

export function applicationMoreInfoEmail(p: {
  to: string;
  name?: string;
  reference?: string;
  sections: string[];
  note: string;
}): Email {
  return compose({
    to: p.to,
    subject: `We need a bit more for your application${p.reference ? ` (${p.reference})` : ""}`,
    preheader: "Update the sections below, then resubmit.",
    title: "We need a bit more",
    blocks: [
      b.p(hi(p.name), " we've looked at your application to sell on Farmkeke. Please update a few things, then resubmit."),
      b.quote("Note from Farmkeke", p.note),
      b.h2("Sections to update"),
      b.steps(p.sections.map((s) => ({ title: s }))),
      b.inApp([...APPLICATION_PATH, "Review and resubmit"]),
    ],
    cta: openApp(),
    reason: APPLICATION_REASON,
  });
}

export function farmNewOrderEmail(
  p: FarmRef & {
    number: string;
    items: OrderItem[];
    itemsKobo: number;
    fulfilment: "delivery" | "pickup";
    /** "Mon 19 Oct, 14:30" */
    acceptBy: string;
    hours: number;
    /** Delivery orders arrive unpaid: the shopper pays once the delivery is priced. */
    unpaid?: boolean;
  },
): Email {
  return compose({
    to: p.to,
    subject: `New order ${p.number}: accept within ${p.hours} hours`,
    preheader: `Accept or decline by ${p.acceptBy}.`,
    title: "You have a new order",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, p.unpaid ? ` is waiting for ${p.farmName}.` : ` is paid and waiting for ${p.farmName}.`),
      b.rows([
        ...p.items.map((it) => ({ label: itemLabel(it), value: naira(it.totalKobo) })),
        { label: "Order value", value: naira(p.itemsKobo), strong: true },
        {
          label: "How it goes",
          value:
            p.fulfilment === "delivery"
              ? "A Farmkeke rider collects it from you and delivers it"
              : "The shopper collects it from you with a 4-digit code",
        },
      ]),
      b.note(
        { b: `Accept or decline within ${p.hours} hours, by ${p.acceptBy}.` },
        p.unpaid ? " If you don't answer in time, the order expires." : " If you don't answer in time, the order expires and the shopper is refunded.",
      ),
      b.p(
        p.unpaid
          ? "It isn't paid yet. Once you accept, Farmkeke prices the delivery and the shopper pays. The rider only collects after they've paid, and you're paid once they confirm they got everything."
          : "The money is already held safely by Farmkeke. You're paid once the shopper confirms they got everything.",
      ),
      b.inApp(farmOrderPath(p.number)),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmDeadlineEmail(p: FarmRef & { number: string; acceptBy: string; hoursLeft: number }): Email {
  const left = `${p.hoursLeft} hour${p.hoursLeft === 1 ? "" : "s"}`;
  return compose({
    to: p.to,
    subject: `About ${left} left to accept order ${p.number}`,
    preheader: `Accept or decline by ${p.acceptBy}, or it expires.`,
    title: "An order is waiting for you",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, ` is still waiting for an answer from ${p.farmName}.`),
      b.note({ b: `About ${left} left, until ${p.acceptBy}.` }, " After that it expires and the shopper is refunded."),
      b.inApp(farmOrderPath(p.number)),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmDeadlineExtendedEmail(p: FarmRef & { number: string; acceptBy: string; hours?: number }): Email {
  return compose({
    to: p.to,
    subject: `More time to accept order ${p.number}`,
    preheader: `You now have until ${p.acceptBy}.`,
    title: "You have more time",
    blocks: [
      b.p(hi(p.name), " Farmkeke gave you ", { b: p.hours ? `${p.hours} more hours` : "more time" }, " to accept or decline order ", { b: p.number }, "."),
      b.rows([{ label: "New deadline", value: p.acceptBy, strong: true }]),
      b.inApp(farmOrderPath(p.number)),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmOrderEndedEmail(p: FarmRef & { number: string; why: "cancelled" | "expired"; reason?: string }): Email {
  const cancelled = p.why === "cancelled";
  return compose({
    to: p.to,
    subject: cancelled ? `Order ${p.number} was cancelled` : `Order ${p.number} expired`,
    preheader: cancelled ? "Farmkeke cancelled this order. Please don't send it." : "It wasn't answered in time, so the shopper was refunded.",
    title: cancelled ? `Order ${p.number} was cancelled` : `Order ${p.number} expired`,
    blocks: cancelled
      ? [
          b.p(hi(p.name), " Farmkeke cancelled order ", { b: p.number }, ". The shopper gets a full refund."),
          ...(p.reason ? [b.quote("Reason", p.reason)] : []),
          b.note({ b: "Please don't prepare or hand over this order." }, " If a rider was booked, they won't come for it."),
          b.inApp(farmOrderPath(p.number)),
        ]
      : [
          b.p(hi(p.name), " order ", { b: p.number }, " wasn't accepted or declined in time, so it expired. The shopper was refunded in full."),
          b.p("Answering quickly helps shoppers trust your farm. If you can't take orders for a while, turn on holiday mode."),
          b.inApp(["Switch to farmer mode", "Farm", "Availability"]),
        ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmRiderAssignedEmail(
  p: FarmRef & { number: string; riderName: string; riderPhone: string; collectAt?: string; changed?: boolean },
): Email {
  return compose({
    to: p.to,
    subject: `${p.changed ? "New rider" : "Rider"} for order ${p.number}`,
    preheader: `${p.riderName} will collect it${p.collectAt ? ` on ${p.collectAt}` : ""}.`,
    title: p.changed ? "A new rider is collecting" : "A rider is coming",
    blocks: [
      b.p(hi(p.name), " ", { b: p.riderName }, " will collect order ", { b: p.number }, ". Have it packed and ready."),
      b.rows([
        { label: "Rider", value: p.riderName },
        { label: "Phone", value: p.riderPhone },
        ...(p.collectAt ? [{ label: "Collecting", value: p.collectAt, strong: true }] : []),
      ]),
      b.p("When you hand it over, mark it as handed to the rider in the app."),
      b.inApp(farmOrderPath(p.number)),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmProblemReportedEmail(
  p: FarmRef & { number: string; caseNumber: string; problem: string; note?: string; replyBy: string; replyHours: number },
): Email {
  return compose({
    to: p.to,
    subject: `Problem reported on order ${p.number}: reply within ${p.replyHours} hours`,
    preheader: `Reply by ${p.replyBy}. The payment is held until Farmkeke decides.`,
    title: "A shopper reported a problem",
    blocks: [
      b.p(hi(p.name), " the shopper reported a problem with order ", { b: p.number }, "."),
      b.rows([
        { label: "Case number", value: p.caseNumber },
        { label: "Problem", value: p.problem },
        { label: "Reply by", value: p.replyBy, strong: true },
      ]),
      ...(p.note ? [b.quote("The shopper wrote", p.note)] : []),
      b.note(
        { b: `Please reply within ${p.replyHours} hours.` },
        " Tell your side and add photos if you can. Farmkeke then decides within about 1 day. The payment is held until then.",
      ),
      b.inApp(farmOrderPath(p.number, "Problem report")),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmReplyReminderEmail(
  p: FarmRef & { number: string; caseNumber: string; replyBy: string; overdue: boolean; hoursLeft?: number },
): Email {
  const left = `${p.hoursLeft ?? 1} hour${(p.hoursLeft ?? 1) === 1 ? "" : "s"}`;
  return compose({
    to: p.to,
    subject: p.overdue ? `Reply time ended: ${p.caseNumber}` : `Reply needed: ${p.caseNumber}`,
    preheader: p.overdue ? "Farmkeke will now decide without your reply." : `About ${left} left to reply.`,
    title: p.overdue ? "Your reply time has ended" : "Please reply to the problem report",
    blocks: p.overdue
      ? [
          b.p(hi(p.name), " the time to reply to case ", { b: p.caseNumber }, " on order ", { b: p.number }, ` ended on ${p.replyBy}.`),
          b.note("Farmkeke will now decide without your reply. You can still add a message on the case, and we'll read it."),
          b.inApp(farmOrderPath(p.number, "Problem report")),
        ]
      : [
          b.p(hi(p.name), " you haven't replied to case ", { b: p.caseNumber }, " on order ", { b: p.number }, " yet."),
          b.note({ b: `About ${left} left, until ${p.replyBy}.` }, " After that, Farmkeke decides without your reply."),
          b.inApp(farmOrderPath(p.number, "Problem report")),
        ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmProblemDecisionEmail(
  p: FarmRef & {
    number: string;
    caseNumber: string;
    outcome: "full_refund" | "part_refund" | "no_refund";
    reason: string;
    refundKobo?: number;
    releasedKobo?: number;
  },
): Email {
  const headline =
    p.outcome === "full_refund"
      ? "The shopper gets a full refund. No payment is released for this order."
      : p.outcome === "part_refund"
        ? `Part refund to the shopper. ${naira(p.releasedKobo ?? 0)} of the order is released to you.`
        : "No refund. The payment is released to you.";
  return compose({
    to: p.to,
    subject: `Decision on case ${p.caseNumber}`,
    preheader: headline,
    title: `Decision on case ${p.caseNumber}`,
    blocks: [
      b.p(hi(p.name), " Farmkeke has decided on the problem report for order ", { b: p.number }, "."),
      b.note({ b: headline }),
      b.h2("Why"),
      b.p(p.reason || "See the case in the app for details."),
      b.rows([
        { label: "Case number", value: p.caseNumber },
        ...(p.refundKobo ? [{ label: "Refund to the shopper", value: naira(p.refundKobo) }] : []),
        ...(p.releasedKobo ? [{ label: "Released to you", value: naira(p.releasedKobo), strong: true }] : []),
      ]),
      ...(p.releasedKobo ? [b.p("Released money goes to your payout account, less Farmkeke's commission. We'll email you when it's sent.")] : []),
      b.inApp(farmOrderPath(p.number, "Problem report")),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmMessageEmail(
  p: FarmRef & { kind: "chat" | "dispute" | "support"; from: string; preview: string; number?: string; caseNumber?: string },
): Email {
  const title =
    p.kind === "support"
      ? "Farmkeke support replied"
      : p.kind === "dispute" && p.caseNumber
        ? `New message on case ${p.caseNumber}`
        : p.number
          ? `New message about order ${p.number}`
          : "You have a new message";
  const path =
    p.kind === "support"
      ? ["Switch to farmer mode", "Farm", "Contact support"]
      : p.number
        ? farmOrderPath(p.number, p.kind === "dispute" ? "Problem report" : "Chat")
        : ["Switch to farmer mode", "Orders"];
  return compose({
    to: p.to,
    subject: title,
    preheader: `${p.from}: ${p.preview}`,
    title,
    blocks: [
      b.p(
        hi(p.name),
        p.kind === "support" ? " Farmkeke support replied to your message." : p.number ? ` you have a new message about order ${p.number}.` : " you have a new message.",
      ),
      b.quote(p.from, p.preview),
      b.inApp(path),
      b.small("We send at most one email per conversation every 30 minutes."),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmPaymentReleasedEmail(p: FarmRef & { number: string; amountKobo: number; bank?: string }): Email {
  return compose({
    to: p.to,
    subject: `Payment released: ${naira(p.amountKobo)} for order ${p.number}`,
    preheader: "It's on its way to your bank.",
    title: "Payment released",
    blocks: [
      b.p(hi(p.name), " order ", { b: p.number }, " is complete, so Farmkeke released your payment."),
      b.rows([
        { label: "Order", value: p.number },
        { label: "Paid to you", value: naira(p.amountKobo), strong: true },
        ...(p.bank ? [{ label: "Going to", value: p.bank }] : []),
      ]),
      b.p("This is after Farmkeke's commission. We'll email you again when the bank transfer is sent."),
      b.inApp(["Switch to farmer mode", "Earnings"]),
    ],
    cta: openApp(),
    reason: FARM_MONEY_REASON,
  });
}

export function farmPayoutSentEmail(p: FarmRef & { amountKobo: number; bank: string; reference: string }): Email {
  return compose({
    to: p.to,
    subject: `Payout sent: ${naira(p.amountKobo)}`,
    preheader: `Sent to ${p.bank}.`,
    title: "Your payout is sent",
    blocks: [
      b.p(hi(p.name), " we've sent ", { b: naira(p.amountKobo) }, " to ", { b: p.bank }, "."),
      b.rows([
        { label: "Amount", value: naira(p.amountKobo), strong: true },
        { label: "To", value: p.bank },
        { label: "Reference", value: p.reference },
      ]),
      b.small("Most transfers arrive within minutes. Not there after a working day? Share the reference with your bank, or reply to this email."),
      b.inApp(["Switch to farmer mode", "Earnings"]),
    ],
    cta: openApp(),
    reason: FARM_MONEY_REASON,
  });
}

export function farmPayoutFailedEmail(
  p: FarmRef & { amountKobo: number; bank: string; reference: string; reason?: string },
): Email {
  return compose({
    to: p.to,
    subject: `We couldn't send your payout of ${naira(p.amountKobo)}`,
    preheader: "Your money is safe. Please check your payout account.",
    title: "Your payout didn't go through",
    blocks: [
      b.p(hi(p.name), " we tried to send ", { b: naira(p.amountKobo) }, " to ", { b: p.bank }, ", but the bank transfer failed."),
      b.rows([
        { label: "Amount", value: naira(p.amountKobo), strong: true },
        { label: "To", value: p.bank },
        { label: "Reference", value: p.reference },
        ...(p.reason ? [{ label: "What the bank said", value: p.reason }] : []),
      ]),
      b.note({ b: "Your money is safe with Farmkeke." }, " Nothing is lost."),
      b.h2("What to do"),
      b.steps([
        { title: "Check your payout account", note: "Make sure the bank and account number are right, and the account is open." },
        { title: "Fix it in the app if needed", note: "Switch to farmer mode, Earnings, Payout account." },
        { title: "Farmkeke sends it again", note: "Our team retries failed payouts. Reply to this email if you have questions." },
      ]),
    ],
    cta: openApp(),
    reason: FARM_MONEY_REASON,
  });
}

export function farmPayoutAccountChangedEmail(p: FarmRef & { bank: string; accountName?: string; at: string }): Email {
  return compose({
    to: p.to,
    subject: "Your Farmkeke payout account was changed",
    preheader: "If this wasn't you, contact Farmkeke support now.",
    title: "Your payout account was changed",
    blocks: [
      b.p(hi(p.name), ` the bank account ${p.farmName} is paid into was changed on `, { b: p.at }, "."),
      b.rows([
        { label: "New payout account", value: p.bank, strong: true },
        ...(p.accountName ? [{ label: "Account name", value: p.accountName }] : []),
      ]),
      b.p("From now on, released payments go to this account."),
      b.note({ b: "Didn't make this change?" }, " Reply to this email or contact Farmkeke support now, and change your password."),
      b.inApp(["Switch to farmer mode", "Earnings", "Payout account"]),
    ],
    cta: openApp(),
    reason: `${SECURITY_REASON} It's about where ${p.farmName} is paid.`,
  });
}

export function farmListingEmail(
  p: FarmRef & { listingName: string; outcome: "approved" | "sent_back" | "unpublished"; reason?: string },
): Email {
  if (p.outcome === "approved") {
    return compose({
      to: p.to,
      subject: `${p.listingName} is live on Farmkeke`,
      preheader: "Shoppers can now find and buy it.",
      title: "Your listing is live",
      blocks: [
        b.p(hi(p.name), " we've checked ", { b: p.listingName }, ". It's now live, so shoppers can find and buy it."),
        b.p("Keep your stock up to date so shoppers only order what you have."),
        b.inApp(["Switch to farmer mode", "Listings", p.listingName]),
      ],
      cta: openApp(),
      reason: farmReason(p.farmName),
    });
  }
  const unpublished = p.outcome === "unpublished";
  return compose({
    to: p.to,
    subject: unpublished ? `${p.listingName} was taken down` : `${p.listingName} needs changes`,
    preheader: "See what to fix, then send it for review again.",
    title: unpublished ? "Your listing was taken down" : "Your listing needs changes",
    blocks: [
      b.p(
        hi(p.name),
        " ",
        { b: p.listingName },
        unpublished ? " is no longer shown to shoppers." : " isn't live yet.",
        " Please fix the following, then send it for review again.",
      ),
      b.quote("What to fix", p.reason || "See the note on the listing in the app."),
      b.inApp(["Switch to farmer mode", "Listings", p.listingName]),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmLowStockEmail(p: FarmRef & { listingName: string; unit: string; stock: number }): Email {
  const left = p.stock <= 0 ? "Sold out" : `${p.stock} left`;
  return compose({
    to: p.to,
    subject: `Running low: ${p.listingName} (${left})`,
    preheader: "Add stock so shoppers can keep ordering.",
    title: "Running low",
    blocks: [
      b.p(hi(p.name), " ", { b: p.listingName }, " is selling well."),
      b.rows([
        { label: "Unit", value: p.unit },
        { label: "Stock", value: left, strong: true },
      ]),
      b.p(p.stock <= 0 ? "Shoppers can't order it until you add more." : "When it reaches 0, shoppers can't order it until you add more."),
      b.inApp(["Switch to farmer mode", "Listings", p.listingName, "Quick update"]),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

export function farmReviewEmail(p: FarmRef & { number: string; rating: number; comment?: string; reviewer?: string }): Email {
  const r = Math.max(0, Math.min(5, Math.round(p.rating)));
  const stars = "★".repeat(r) + "☆".repeat(5 - r);
  return compose({
    to: p.to,
    subject: `New ${r}-star review for ${p.farmName}`,
    preheader: p.comment ? p.comment : `For order ${p.number}.`,
    title: "You have a new review",
    blocks: [
      b.p(hi(p.name), " a shopper rated order ", { b: p.number }, "."),
      b.rows([{ label: "Rating", value: `${stars} (${r} of 5)`, strong: true }]),
      ...(p.comment ? [b.quote(p.reviewer ?? "The shopper", p.comment)] : []),
      b.inApp(["Switch to farmer mode", "Farm", "Reviews"]),
    ],
    cta: openApp(),
    reason: farmReason(p.farmName),
  });
}

// ===========================================================================
// Admin Portal staff emails (A-01, A-02, A-89): sign-in codes, password
// links, applications and role changes. Links go to env ADMIN_URL (e.g.
// https://admin.farmkeke.com), or the website's /admin, which the website
// sends on to the admin host once it has one.
// ===========================================================================

const adminUrl = (path = "") => `${envValue(env.ADMIN_URL) ?? `${siteUrl()}/admin`}${path}`;
export const adminLinks = {
  home: () => adminUrl(),
  signIn: () => adminUrl("/signin"),
  forgotPassword: () => adminUrl("/forgot-password"),
  application: (memberId: string) => adminUrl(`/staff/${id(memberId)}`),
  setPassword: (email: string, code: string) =>
    adminUrl(`/set-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`),
};
const STAFF_REASON = "You're getting this email because this address is used for the Farmkeke admin portal.";
const STAFF_MANAGER_REASON =
  "You're getting this email because you can approve staff on the Farmkeke admin portal.";

/** The big 6-digit code (same look as the pickup code). Plain text in. */
const STAFF_CODE = (code: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td align="center" bgcolor="${TINT}" style="background:${TINT};border:2px solid ${LIME};border-radius:16px;padding:20px 12px;">
<p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:13px;line-height:18px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Your code</p>
<p style="margin:0;font-family:${HEAD_FONT};font-size:40px;line-height:48px;font-weight:800;color:${FOREST};letter-spacing:10px;">${esc(code)}</p>
</td></tr>
</table>`;

export function staffCodeEmail(p: { to: string; name?: string; code: string; purpose: "confirm" | "signin"; minutes: number }): Email {
  const confirm = p.purpose === "confirm";
  const what = confirm
    ? "confirm your email and send your application to the Farmkeke admin portal"
    : "finish signing in to the Farmkeke admin portal";
  return compose({
    to: p.to,
    subject: `${p.code} is your Farmkeke admin code`,
    preheader: `It works for ${p.minutes} minutes, and only once.`,
    title: confirm ? "Confirm your email" : "Your sign-in code",
    blocks: [
      b.p(hi(p.name), ` enter this code to ${what}.`),
      { html: STAFF_CODE(p.code), text: [`YOUR CODE: ${p.code}`] },
      b.note("The code works for ", { b: `${p.minutes} minutes` }, ", and only ", { b: "once" }, ". Never share it, not even with Farmkeke staff."),
      b.small(
        confirm
          ? "Didn't apply? You can ignore this email. Nothing happens without the code."
          : "Didn't try to sign in? Someone may know your password. ",
        ...(confirm ? [] : [{ link: adminLinks.forgotPassword(), label: "Make a new password now" }, "."]),
      ),
    ],
    cta: { label: "Open the admin portal", url: adminLinks.signIn() },
    reason: STAFF_REASON,
  });
}

export function staffPasswordLinkEmail(p: { to: string; name?: string; link: string; invite: boolean; minutes: number }): Email {
  return compose({
    to: p.to,
    subject: p.invite ? "Set up your Farmkeke admin account" : "Reset your Farmkeke admin password",
    preheader: `The link works for ${p.minutes} minutes, and only once.`,
    title: p.invite ? "Set up your admin account" : "Reset your password",
    blocks: p.invite
      ? [
          b.p(hi(p.name), " your Farmkeke admin portal account is ready. You have the ", { b: "Founder" }, " role."),
          b.p("Make a password for ", { b: p.to }, " to sign in. You'll approve staff and choose their roles from the portal."),
          b.note("The link works for ", { b: `${p.minutes} minutes` }, ", and only once. If it runs out, use \"Forgot password\" on the sign-in page."),
        ]
      : [
          b.p(hi(p.name), " tap the button to make a new password for ", { b: p.to }, " on the Farmkeke admin portal."),
          b.note("The link works for ", { b: `${p.minutes} minutes` }, ", and only once."),
          b.small("Didn't ask for this? You can ignore this email. Your password won't change."),
        ],
    cta: { label: p.invite ? "Make my password" : "Make a new password", url: p.link },
    after: [b.small("Link not working? Copy this into your browser: ", p.link)],
    reason: STAFF_REASON,
  });
}

export function staffApplicationReceivedEmail(p: { to: string; name?: string; jobTitle: string }): Email {
  return compose({
    to: p.to,
    subject: "We received your Farmkeke admin application",
    preheader: "We'll email you when it's decided, with the role you've been given.",
    title: "We received your application",
    blocks: [
      b.p(hi(p.name), " thank you for applying for access to the Farmkeke admin portal."),
      b.rows([
        { label: "Email", value: p.to },
        { label: "Your job", value: p.jobTitle },
        { label: "Status", value: "Waiting for review", strong: true },
      ]),
      b.p("The Founder reviews every application. We'll email you as soon as it's decided, and tell you which role you've been given."),
    ],
    cta: { label: "Check your application", url: adminLinks.home() },
    reason: "You're getting this email because you applied for the Farmkeke admin portal with this address.",
  });
}

export function staffNewApplicationEmail(p: {
  to: string;
  name?: string;
  memberId: string;
  applicant: string;
  applicantEmail: string;
  jobTitle: string;
  note?: string;
  updated?: boolean;
}): Email {
  return compose({
    to: p.to,
    subject: p.updated ? `${p.applicant} updated their staff application` : `New staff application: ${p.applicant}`,
    preheader: `${p.jobTitle} · ${p.applicantEmail}`,
    title: p.updated ? "An application was updated" : "New staff application",
    blocks: [
      b.p(
        hi(p.name),
        p.updated
          ? " this applicant answered your request for more information."
          : " someone applied for access to the Farmkeke admin portal.",
      ),
      b.rows([
        { label: "Name", value: p.applicant, strong: true },
        { label: "Email", value: p.applicantEmail },
        { label: "Job", value: p.jobTitle },
      ]),
      ...(p.note ? [b.quote(`${p.applicant} wrote`, p.note)] : []),
      b.p("Approve it with a role, ask for more information, or reject it."),
    ],
    cta: { label: "Review the application", url: adminLinks.application(p.memberId) },
    reason: STAFF_MANAGER_REASON,
  });
}

export function staffApprovedEmail(p: { to: string; name?: string; role: string; roleDescription: string; can: string[] }): Email {
  return compose({
    to: p.to,
    subject: `You're approved: your Farmkeke admin role is ${p.role}`,
    preheader: p.roleDescription,
    title: "You're approved",
    blocks: [
      b.p(hi(p.name), " welcome to the Farmkeke team. Your application for the admin portal is approved."),
      b.rows([{ label: "Your role", value: p.role, strong: true }]),
      b.p(p.roleDescription),
      b.h2("What you can do"),
      b.steps(p.can.slice(0, 12).map((title) => ({ title }))),
      b.note("Each time you sign in, we email you a 6-digit code to finish signing in."),
    ],
    cta: { label: "Sign in to the admin portal", url: adminLinks.signIn() },
    reason: STAFF_REASON,
  });
}

export function staffRejectedEmail(p: { to: string; name?: string; reason: string }): Email {
  return compose({
    to: p.to,
    subject: "Your Farmkeke admin application wasn't approved",
    preheader: "You can apply again if something changes.",
    title: "Not approved",
    blocks: [
      b.p(hi(p.name), " thank you for applying for the Farmkeke admin portal. We couldn't approve your application."),
      b.quote("Note from Farmkeke", p.reason),
      b.p("If you think this is a mistake, reply to this email."),
    ],
    cta: { label: "Open the admin portal", url: adminLinks.home() },
    reason: STAFF_REASON,
  });
}

export function staffMoreInfoEmail(p: { to: string; name?: string; message: string }): Email {
  return compose({
    to: p.to,
    subject: "We need a bit more for your Farmkeke admin application",
    preheader: p.message,
    title: "We need a bit more",
    blocks: [
      b.p(hi(p.name), " we've looked at your application for the Farmkeke admin portal and have a question."),
      b.quote("Note from Farmkeke", p.message),
      b.p("Sign in to the portal to update your application. It goes back for review straight away."),
    ],
    cta: { label: "Update my application", url: adminLinks.home() },
    reason: STAFF_REASON,
  });
}

export function staffRoleChangedEmail(p: {
  to: string;
  name?: string;
  from: string;
  role: string;
  roleDescription: string;
  reason: string;
}): Email {
  return compose({
    to: p.to,
    subject: `Your Farmkeke admin role is now ${p.role}`,
    preheader: p.roleDescription,
    title: "Your role changed",
    blocks: [
      b.p(hi(p.name), " your role on the Farmkeke admin portal has changed."),
      b.rows([
        { label: "Before", value: p.from },
        { label: "Now", value: p.role, strong: true },
      ]),
      b.p(p.roleDescription),
      b.quote("Note from Farmkeke", p.reason),
    ],
    cta: { label: "Open the admin portal", url: adminLinks.signIn() },
    reason: STAFF_REASON,
  });
}

export function staffAccessEmail(p: { to: string; name?: string; removed: boolean; reason: string; role?: string }): Email {
  return compose({
    to: p.to,
    subject: p.removed ? "Your Farmkeke admin access was removed" : "Your Farmkeke admin access is back",
    preheader: p.removed ? "You've been signed out of the admin portal." : `Your role is ${p.role ?? "unchanged"}.`,
    title: p.removed ? "Your access was removed" : "Your access is back",
    blocks: p.removed
      ? [
          b.p(hi(p.name), " your access to the Farmkeke admin portal has been removed, and you've been signed out."),
          b.quote("Note from Farmkeke", p.reason),
          b.p("Your Farmkeke shopping account still works. If you think this is a mistake, reply to this email."),
        ]
      : [
          b.p(hi(p.name), " your access to the Farmkeke admin portal is back."),
          ...(p.role ? [b.rows([{ label: "Your role", value: p.role, strong: true }])] : []),
          b.quote("Note from Farmkeke", p.reason),
        ],
    cta: p.removed ? { label: "Go to Farmkeke", url: siteUrl() } : { label: "Sign in to the admin portal", url: adminLinks.signIn() },
    reason: STAFF_REASON,
  });
}
