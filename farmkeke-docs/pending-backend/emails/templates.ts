// Farmkeke email templates.
//
// Pure TypeScript: no imports, no dependencies, no Node APIs. It can be pasted
// into convex/lib/ (for example convex/lib/emailTemplates.ts) and used with
// sendEmail() from convex/lib/email.ts. Every function returns the same
// `Email` shape that sendEmail() takes.
//
// Rules used throughout:
// - Money is always in kobo (integers) and shown with naira().
// - Everything that comes from users or the database is escaped with esc().
// - Layouts are tables with inline CSS, so they work in Gmail, Outlook and
//   Apple Mail. One lime button per email.
// - Dates and times are passed in as ready-made labels (for example
//   "Sun 18 Oct, 9am – 12pm"). lagosTime() below helps build them.

export type Email = { to: string; subject: string; html: string; text: string };

export const SITE_URL = "https://farmkeke.com";
const WORDMARK_URL = `${SITE_URL}/brand/wordmark.png`;
const HELP_URL = `${SITE_URL}/help`;
const TAGLINE = "Farmkeke · from the farm directly to your home";

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
  shop: () => `${SITE_URL}/shop`,
  account: () => `${SITE_URL}/account`,
  help: () => HELP_URL,
  findOrder: () => `${SITE_URL}/find-order`,
  order: (orderId: string) => `${SITE_URL}/orders/${id(orderId)}`,
  review: (orderId: string) => `${SITE_URL}/orders/${id(orderId)}/review`,
  refund: (orderId: string) => `${SITE_URL}/orders/${id(orderId)}/refund`,
  dispute: (orderId: string) => `${SITE_URL}/orders/${id(orderId)}/dispute`,
  resetPassword: (email: string, code: string) =>
    `${SITE_URL}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
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
<a href="${SITE_URL}" target="_blank" style="text-decoration:none;color:${FOREST};"><img src="${WORDMARK_URL}" alt="Farmkeke" width="140" height="27" style="display:block;width:140px;height:27px;border:0;font-family:${HEAD_FONT};font-size:22px;line-height:27px;font-weight:800;color:${FOREST};"></a>
</td></tr>
<tr><td class="fk-card" bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:16px;border:1px solid ${LINE};padding:32px 32px 12px;">
${body}
${SMALL(`Need help? Reply to this email or visit ${LINK(HELP_URL, "farmkeke.com/help")}.`, "margin:0 0 20px;")}
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
    `Need help? Reply to this email or visit ${HELP_URL}`,
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
  /** For pickup: where to collect. */
  pickupPoint?: { name: string; address: string };
}): Email {
  const many = p.orders.length > 1;
  const first = p.orders[0];
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
        : "";
  const whereText =
    p.fulfilment === "delivery" && p.delivery
      ? `A Farmkeke rider will deliver to ${p.delivery.address}${p.delivery.window ? `, ${p.delivery.window}` : ""}.`
      : p.fulfilment === "pickup" && p.pickupPoint
        ? `You'll collect from ${p.pickupPoint.name}, ${p.pickupPoint.address}. We'll email your pickup code when it's ready.`
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

  const body = [
    H1(many ? "Your orders are placed" : "Your order is placed"),
    P(`${esc(hi(p.name))} thank you. We've sent your ${many ? "orders" : "order"} to the ${many ? "farms" : "farm"}.`),
    NOTE(
      `<strong>${esc(naira(p.totalKobo))} is held safely by Farmkeke.</strong> The farm is paid only after you confirm you got everything.`,
    ),
    orderCards,
    many ? ROWS([{ label: "Total paid", value: naira(p.totalKobo), strong: true }]) : "",
    H2("What happens next"),
    P(`Farms have <strong>24 hours</strong> to accept. If a farm doesn't, that order is refunded in full.`),
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
      many ? "Your orders are placed" : "Your order is placed",
      "",
      `${hi(p.name)} thank you. We've sent your ${many ? "orders" : "order"} to the ${many ? "farms" : "farm"}.`,
      `${naira(p.totalKobo)} is held safely by Farmkeke. The farm is paid only after you confirm you got everything.`,
      ...orderText,
      ...(many ? ["", `Total paid: ${naira(p.totalKobo)}`] : []),
      "",
      "What happens next",
      "Farms have 24 hours to accept. If a farm doesn't, that order is refunded in full.",
      ...(whereText ? [whereText] : []),
      "When it arrives, check everything. Then confirm receipt. Something wrong? Report it before you confirm.",
      ...guestText,
    ],
    cta,
    reason,
  });

  return {
    to: p.to,
    subject: oneLine(many ? `Your ${p.orders.length} Farmkeke orders are placed` : `Order placed: ${first.number}`),
    html: page({
      preheader: `${naira(p.totalKobo)} held safely until you confirm. Farms have 24 hours to accept.`,
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
    /** Pickup point name, for pickup orders. */
    pickupPointName?: string;
  },
): Email {
  const cta = { label: "Track your order", url: links.order(p.orderId) };
  const reason = orderReason(p.number);
  const next =
    p.fulfilment === "delivery"
      ? `A Farmkeke rider will bring it to you${p.window ? ` on <strong>${esc(p.window)}</strong>` : ""}. We'll email you when it's on its way.`
      : `It will go to ${p.pickupPointName ? `<strong>${esc(p.pickupPointName)}</strong>` : "your pickup point"}. We'll email your pickup code when it's ready.`;
  const nextText =
    p.fulfilment === "delivery"
      ? `A Farmkeke rider will bring it to you${p.window ? ` on ${p.window}` : ""}. We'll email you when it's on its way.`
      : `It will go to ${p.pickupPointName ?? "your pickup point"}. We'll email your pickup code when it's ready.`;
  const body = [
    H1("Your order was accepted"),
    P(`${esc(hi(p.name))} <strong>${esc(p.farmName)}</strong> accepted order <strong>${esc(p.number)}</strong>. They're getting it ready now.`),
    P(next),
    NOTE("Your money is still held safely by Farmkeke."),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order was accepted",
      "",
      `${hi(p.name)} ${p.farmName} accepted order ${p.number}. They're getting it ready now.`,
      nextText,
      "Your money is still held safely by Farmkeke.",
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
  const rows: Row[] = [
    { label: "Pickup point", value: pt.name },
    { label: "Address", value: pt.address },
    ...pt.hours.map((h, i) => ({ label: i === 0 ? "Open" : "", value: h })),
    ...(pt.phone ? [{ label: "Phone", value: pt.phone }] : []),
    { label: "Collect by", value: p.collectBy, strong: true },
  ];
  const body = [
    H1("Your order is ready for pickup"),
    P(`${esc(hi(p.name))} order <strong>${esc(p.number)}</strong> from ${esc(p.farmName)} is waiting for you.`),
    CODE(p.pickupCode),
    SMALL("Show this code at the counter. Only share it when you are collecting your order.", "text-align:center;margin:-8px 0 20px;"),
    ROWS(rows),
    NOTE(`Please collect within <strong>${days} days</strong>, by <strong>${esc(p.collectBy)}</strong>.`),
    P("Check everything at the counter. Something wrong? Report it before you confirm."),
    BUTTON(cta.url, cta.label),
  ].join("\n");
  const text = plain({
    lines: [
      "Your order is ready for pickup",
      "",
      `${hi(p.name)} order ${p.number} from ${p.farmName} is waiting for you.`,
      "",
      `YOUR PICKUP CODE: ${p.pickupCode}`,
      "Show this code at the counter. Only share it when you are collecting your order.",
      "",
      `Pickup point: ${pt.name}`,
      `Address: ${pt.address}`,
      ...pt.hours.map((h) => `Open: ${h}`),
      ...(pt.phone ? [`Phone: ${pt.phone}`] : []),
      "",
      `Please collect within ${days} days, by ${p.collectBy}.`,
      "Check everything at the counter. Something wrong? Report it before you confirm.",
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
      `Something wrong? ${LINK(links.dispute(p.orderId), "Report a problem")} <strong>before</strong> you confirm. Confirming can't be undone.` +
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
      `Report a problem: ${links.dispute(p.orderId)}`,
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
