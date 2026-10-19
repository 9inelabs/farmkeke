// Renders every Farmkeke email with sample data to farmkeke-docs/email-previews/
// (<name>.html, plus index.html grouped as Shopper / Account / Farmer).
//
// Usage (from the repo root, Node 24+; it imports the TypeScript directly):
//   node scripts/render-email-previews.mjs
//
// convex/lib/emails.ts imports `env` from convex/_generated/server. A module
// hook swaps that for process.env, so nothing from Convex is loaded, and
// extensionless relative imports resolve to their .ts files.
import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "farmkeke-docs", "email-previews");

const ENV_STUB = "farmkeke-preview:env";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/(^|\/)_generated\/server(\.js)?$/.test(specifier)) return { url: ENV_STUB, shortCircuit: true };
    if (specifier.startsWith(".") && !path.extname(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        return nextResolve(`${specifier}.js`, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === ENV_STUB) return { format: "module", source: "export const env = process.env;", shortCircuit: true };
    return nextLoad(url, context);
  },
});

// Links go to the real website; the logo loads from the repo, so the files
// show it when opened locally (the live emails use GET /email/wordmark.png).
process.env.WEBSITE_URL = "https://farmkeke.com";
process.env.EMAIL_ASSETS_URL = "../../web/public/brand";
delete process.env.CONVEX_SITE_URL;

// Node notes that emails.ts is ESM in a package without "type"; that's expected.
process.removeAllListeners("warning");
const e = await import(pathToFileURL(path.join(root, "convex", "lib", "emails.ts")).href);

// ---------------------------------------------------------------------------
// Sample data (Nigerian names, places, banks; money in kobo)

const NOW = Date.UTC(2026, 9, 18, 9, 41); // Sun 18 Oct 2026, 10:41 in Lagos
const H = 3_600_000;
const D = 24 * H;
const t = (ms, time = true) => e.lagosTime(ms, { time });

const shopper = { to: "adaeze.nwosu@gmail.com", name: "Adaeze Nwosu" };
const order = { ...shopper, orderId: "k57abc123orderid", number: "FK-10234", farmName: "Okafor Family Farms" };
const point = {
  name: "Farmkeke Point, Ikenegbu",
  address: "14 Ikenegbu Layout, Owerri, Imo",
  hours: e.hoursLines([1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "19:00" }))),
  phone: "0803 555 0144",
};
const window = e.windowLabel({ day: "2026-10-19", from: "09:00", to: "12:00" });
const items = [
  { name: "Fresh tomatoes", quantity: 2, unit: "basket", totalKobo: 900000 },
  { name: "Ugu leaves", quantity: 3, unit: "bunch", totalKobo: 150000 },
  { name: "Ofada rice", quantity: 1, unit: "5 kg bag", totalKobo: 650000 },
];
const farmer = { to: "chinedu.okafor@yahoo.com", name: "Chinedu Okafor", farmName: "Okafor Family Farms" };

const shopperEmails = [
  ["welcome", "Welcome (after sign-up, app and website)", e.welcomeEmail(shopper)],
  [
    "order-confirmation",
    "Order placed and paid",
    e.orderConfirmationEmail({
      ...shopper,
      isGuest: false,
      orders: [{ orderId: order.orderId, number: order.number, farmName: order.farmName, items, itemsKobo: 1700000, deliveryFeeKobo: 150000, totalKobo: 1850000 }],
      totalKobo: 1850000,
      fulfilment: "delivery",
      delivery: { address: "53b Nob Oluwa Street, New Owerri", window },
    }),
  ],
  [
    "order-confirmation-guest-two-farms",
    "Order placed: guest, two farms, pickup",
    e.orderConfirmationEmail({
      to: "tunde.bakare@outlook.com",
      name: "Tunde Bakare",
      isGuest: true,
      phone: "0803 111 2222",
      orders: [
        { orderId: "k57guest1", number: "FK-10235", farmName: "Okafor Family Farms", items: items.slice(0, 2), itemsKobo: 1050000, totalKobo: 1050000 },
        { orderId: "k57guest2", number: "FK-10236", farmName: "Mama Nkechi Poultry", items: [{ name: "Eggs", quantity: 1, unit: "crate of 30", totalKobo: 520000 }], itemsKobo: 520000, totalKobo: 520000 },
      ],
      totalKobo: 1570000,
      fulfilment: "pickup",
      pickupPoint: { name: point.name, address: point.address },
    }),
  ],
  ["order-accepted", "Farm accepted the order", e.orderAcceptedEmail({ ...order, fulfilment: "delivery", window })],
  ["order-preparing", "Order being prepared", e.orderPreparingEmail({ ...order, fulfilment: "delivery", window })],
  ["out-for-delivery", "Out for delivery", e.outForDeliveryEmail({ ...order, window: "today, 12pm – 3pm", address: "53b Nob Oluwa Street, New Owerri", riderName: "Emeka Eze" })],
  ["ready-for-pickup", "Ready for pickup (with code)", e.readyForPickupEmail({ ...order, pickupCode: "482913", pickupPoint: point, collectBy: t(NOW + 3 * D, false), collectWithinDays: 3 })],
  ["pickup-reminder", "Pickup reminder (a day before collect-by)", e.pickupReminderEmail({ ...order, pickupCode: "482913", pickupPoint: point, collectBy: t(NOW + D) })],
  ["pickup-window-ended", "Pickup window ended", e.pickupWindowEndedEmail({ ...order, pointName: point.name, heldKobo: 1700000 })],
  ["order-delivered", "Delivered: check and confirm", e.orderDeliveredEmail({ ...order, how: "delivered", heldKobo: 1850000 })],
  ["confirm-reminder", "Confirm-receipt reminder", e.confirmReminderEmail({ ...order, how: "delivered", heldKobo: 1850000 })],
  ["farm-did-not-accept", "Farm declined or didn't answer: full refund", e.farmDidNotAcceptEmail({ ...order, refundKobo: 1850000, why: "timeout", paymentMethod: "card ending 4081" })],
  ["order-cancelled", "Cancelled by Farmkeke: full refund", e.orderCancelledEmail({ ...order, refundKobo: 1850000, deliveryFeeKobo: 150000, paymentMethod: "card ending 4081" })],
  ["problem-report-received", "Problem report received", e.problemReportReceivedEmail({ ...order, caseNumber: "DSP-2041", problem: "Damaged or spoiled · Fresh tomatoes × 2", farmReplyBy: t(NOW + 12 * H), heldKobo: 1850000 })],
  ["dispute-message", "New message on a problem report", e.disputeMessageEmail({ ...order, caseNumber: "DSP-2041", from: "Farmkeke support", preview: "Thanks for the photos. We've asked the farm for their side and will decide by tomorrow." })],
  ["problem-decision", "Problem decision (part refund)", e.problemDecisionEmail({ ...order, caseNumber: "DSP-2041", outcome: "part_refund", reason: "The photos show one basket of tomatoes was crushed. The rest of the order was fine.", refundKobo: 450000, releasedKobo: 1250000, deliveryFeeKobo: 150000 })],
  ["refund-sent", "Refund sent", e.refundSentEmail({ ...order, amountKobo: 450000, kind: "part", method: "card ending 4081", reference: "RF-58213", deliveryFeeKobo: 150000 })],
  ["payment-released", "Thanks for confirming (payment released)", e.paymentReleasedEmail({ ...order, amountKobo: 1700000 })],
  ["review-reminder", "Review reminder", e.reviewReminderEmail(order)],
  ["chat-message", "Chat message from the farm", e.chatMessageEmail({ ...order, preview: "Good morning! The tomatoes were picked today. Would you like the riper ones for stew?" })],
  ["support-reply", "Support reply (no order)", e.supportReplyEmail({ ...shopper, ticketNumber: "SUP-1042", preview: "Hi Adaeze, yes, we deliver to Ikeja from next month. We'll let you know when it starts." })],
];

const accountEmails = [
  ["password-reset", "Password reset link", e.passwordResetEmail(shopper.to, "https://happy-otter-123.convex.site/reset-password?email=adaeze.nwosu%40gmail.com&code=3f9a1c")],
  ["password-changed", "Password changed", e.passwordChangedEmail({ ...shopper, how: "changed", at: t(NOW) })],
  ["password-reset-done", "Password changed with a reset link", e.passwordChangedEmail({ ...shopper, how: "reset", at: t(NOW) })],
  ["email-changed-notice", "Email changed (to the old address)", e.emailChangedNoticeEmail({ ...shopper, newEmail: "adaeze@nwosu.ng", at: t(NOW) })],
  ["email-changed-confirm", "Email changed (to the new address)", e.emailChangedConfirmEmail({ to: "adaeze@nwosu.ng", name: shopper.name, oldEmail: shopper.to })],
  ["account-deletion-waiting", "Deletion waiting for orders", e.accountDeletionEmail({ ...shopper, status: "waiting", orders: 2 })],
  ["account-deleted", "Account deleted", e.accountDeletionEmail({ ...shopper, status: "deleted" })],
  ["guest-orders-added", "Guest orders added to the account", e.guestOrdersAddedEmail({ ...shopper, numbers: ["FK-10235", "FK-10236"], total: 2 })],
];

const farmOrder = { ...farmer, number: "FK-10234" };
const farmerEmails = [
  ["application-received", "Application received", e.applicationReceivedEmail({ to: farmer.to, name: farmer.name, reference: "FA-10012", decisionBy: t(NOW + 2 * D, false) })],
  ["application-approved", "Application approved", e.applicationApprovedEmail(farmer)],
  ["application-rejected", "Application not approved", e.applicationRejectedEmail({ to: farmer.to, name: farmer.name, reference: "FA-10012", reason: "We couldn't confirm the farm's address from the documents.", note: "The utility bill is for a Lagos address, but the farm is in Imo.", reapplyFrom: t(NOW + 30 * D, false) })],
  ["application-more-info", "More information needed", e.applicationMoreInfoEmail({ to: farmer.to, name: farmer.name, reference: "FA-10012", sections: ["Documents", "Payout details"], note: "The ID photo is blurry, and the account name doesn't match your name. Please upload a clear photo and check the account." })],
  ["farm-new-order", "New order (24-hour deadline)", e.farmNewOrderEmail({ ...farmOrder, items, itemsKobo: 1700000, fulfilment: "delivery", acceptBy: t(NOW + 24 * H), hours: 24 })],
  ["farm-deadline", "Deadline near", e.farmDeadlineEmail({ ...farmOrder, acceptBy: t(NOW + 3 * H), hoursLeft: 3 })],
  ["farm-deadline-extended", "Deadline extended", e.farmDeadlineExtendedEmail({ ...farmOrder, acceptBy: t(NOW + 12 * H), hours: 6 })],
  ["farm-order-cancelled", "Order cancelled by Farmkeke", e.farmOrderEndedEmail({ ...farmOrder, why: "cancelled", reason: "The shopper's area is flooded, so we can't deliver this week." })],
  ["farm-order-expired", "Order expired", e.farmOrderEndedEmail({ ...farmOrder, why: "expired" })],
  ["farm-rider-assigned", "Rider assigned", e.farmRiderAssignedEmail({ ...farmOrder, riderName: "Emeka Eze", riderPhone: "0803 555 0000", collectAt: t(NOW + 5 * H) })],
  ["farm-problem-reported", "Problem reported", e.farmProblemReportedEmail({ ...farmOrder, caseNumber: "DSP-2041", problem: "Damaged or spoiled · Fresh tomatoes × 2", note: "One basket was crushed at the bottom.", replyBy: t(NOW + 12 * H), replyHours: 12 })],
  ["farm-reply-reminder", "Problem reply reminder", e.farmReplyReminderEmail({ ...farmOrder, caseNumber: "DSP-2041", replyBy: t(NOW + 2 * H), overdue: false, hoursLeft: 2 })],
  ["farm-reply-overdue", "Problem reply time ended", e.farmReplyReminderEmail({ ...farmOrder, caseNumber: "DSP-2041", replyBy: t(NOW), overdue: true })],
  ["farm-problem-decision", "Problem decision", e.farmProblemDecisionEmail({ ...farmOrder, caseNumber: "DSP-2041", outcome: "part_refund", reason: "One basket of tomatoes was crushed. The rest of the order was fine.", refundKobo: 450000, releasedKobo: 1250000 })],
  ["farm-message", "Message from a shopper (off by default)", e.farmMessageEmail({ ...farmOrder, kind: "chat", from: "Adaeze", preview: "Can you add one more bunch of ugu? I'll pay the difference." })],
  ["farm-review", "New review (off by default)", e.farmReviewEmail({ ...farmOrder, rating: 5, comment: "Very fresh tomatoes, well packed. Will buy again!", reviewer: "Adaeze N." })],
  ["farm-payment-released", "Payment released", e.farmPaymentReleasedEmail({ ...farmOrder, amountKobo: 1615000, bank: "GTBank ••6789" })],
  ["farm-payout-sent", "Payout sent", e.farmPayoutSentEmail({ ...farmer, amountKobo: 1615000, bank: "GTBank ••6789", reference: "PO-FK-10234-1" })],
  ["farm-payout-failed", "Payout failed", e.farmPayoutFailedEmail({ ...farmer, amountKobo: 1615000, bank: "GTBank ••6789", reference: "PO-FK-10234-1", reason: "Account number is invalid" })],
  ["farm-payout-account-changed", "Payout account changed (security)", e.farmPayoutAccountChangedEmail({ ...farmer, bank: "Access Bank ••1122", accountName: "Chinedu Okafor", at: t(NOW) })],
  ["farm-listing-approved", "Listing approved", e.farmListingEmail({ ...farmer, listingName: "Fresh tomatoes", outcome: "approved" })],
  ["farm-listing-sent-back", "Listing sent back", e.farmListingEmail({ ...farmer, listingName: "Fresh tomatoes", outcome: "sent_back", reason: "Photos look like stock images, not your own produce. Please take photos of your own tomatoes." })],
  ["farm-low-stock", "Low stock", e.farmLowStockEmail({ ...farmer, listingName: "Fresh tomatoes", unit: "basket", stock: 2 })],
];

// ---------------------------------------------------------------------------

const groups = [
  ["Shopper", shopperEmails],
  ["Account", accountEmails],
  ["Farmer", farmerEmails],
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
let count = 0;
const sections = groups
  .map(([group, list]) => {
    const rows = list
      .map(([name, label, email]) => {
        fs.writeFileSync(path.join(outDir, `${name}.html`), email.html);
        count++;
        return `<li><a href="${name}.html">${esc(label)}</a><span>${esc(email.subject)}</span>
<details><summary>Plain text</summary><pre>${esc(email.text)}</pre></details></li>`;
      })
      .join("\n");
    return `<h2>${group} <small>${list.length}</small></h2>\n<ul>${rows}</ul>`;
  })
  .join("\n");

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farmkeke email previews</title>
<style>
body{margin:0;background:#F4F5F1;font-family:Inter,Arial,sans-serif;color:#1A1A1A}
main{max-width:760px;margin:0 auto;padding:32px 16px}
h1{font-family:Montserrat,Arial,sans-serif;color:#1E3B16;margin:0 0 4px}
h2{font-family:Montserrat,Arial,sans-serif;font-size:18px;margin:32px 0 8px;color:#1E3B16}h2 small{color:#5A5E56;font-weight:600}
p{color:#5A5E56;margin:0 0 16px}
ul{list-style:none;margin:0;padding:0;background:#fff;border:1px solid #E6E8E2;border-radius:12px}
li{padding:12px 16px;border-top:1px solid #EEF0EB}li:first-child{border-top:0}
li a{font-weight:700;color:#1E3B16}li span{display:block;font-size:14px;color:#5A5E56;margin-top:2px}
details{margin-top:6px;font-size:13px}pre{white-space:pre-wrap;background:#F2F8E6;border-radius:8px;padding:12px;font-size:12px}
</style></head><body><main>
<h1>Farmkeke email previews</h1>
<p>${count} emails, rendered from convex/lib/emails.ts with sample data by scripts/render-email-previews.mjs. Each has an HTML part (open it) and a plain-text part (expand it).</p>
${sections}
</main></body></html>`,
);
console.log(`${count} emails written to ${path.relative(root, outDir)}`);
