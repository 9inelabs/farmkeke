// Bundled help content for M-90 and M-92. Staff will edit help articles in
// the Admin Portal (A-88, Phase 10); until then they live here.

export type HelpTopic = "ordering" | "delivery" | "payment" | "problem";

export const HELP_TOPICS: { key: HelpTopic; title: string }[] = [
  { key: "ordering", title: "Ordering" },
  { key: "delivery", title: "Delivery and pickup" },
  { key: "payment", title: "Payment and escrow" },
  { key: "problem", title: "A problem with my order" },
];

export const FAQ: { topic: HelpTopic; question: string; answer: string }[] = [
  {
    topic: "payment",
    question: "When does the farmer get paid?",
    answer:
      "Only after you tap Confirm delivery. Until then Farmkeke holds your money. If something is wrong, report it and the money stays held while we sort it out.",
  },
  {
    topic: "ordering",
    question: "Can I cancel an order?",
    answer:
      "Orders can't be cancelled from the app once they're paid. If something must stop, contact Farmkeke support and our team will help. If a farm can't accept your order within 24 hours, you're refunded automatically.",
  },
  {
    topic: "delivery",
    question: "How long does delivery take?",
    answer:
      "Farms have up to 24 hours to accept. Once a farm accepts, we price the delivery and send you a bill to pay within 12 hours. The rider then agrees a delivery time with you. Delivery is usually the next day.",
  },
  {
    topic: "problem",
    question: "What if my produce arrives damaged?",
    answer:
      "Don't confirm delivery. Tap There's a problem on the order instead, add photos, and tell us what happened. The farm has 12 hours to reply, and Farmkeke usually decides within a day. The farm isn't paid while we look into it.",
  },
  {
    topic: "ordering",
    question: "Do I need an account to buy?",
    answer:
      "No. You can order as a guest with your name and phone number. An account saves your addresses and shows every order in one place.",
  },
  {
    topic: "delivery",
    question: "How does pickup work?",
    answer:
      "Choose pickup at checkout. When the farm has your order ready, you'll get a 4-digit pickup code. Go to the farm within 3 days, give the farmer your code, and collect your produce. There's no fee for pickup.",
  },
  {
    topic: "ordering",
    question: "Can I order from more than one farm at once?",
    answer:
      "Yes. One cart can hold several farms. You pay once, and each farm packs and sends its own order.",
  },
  {
    topic: "payment",
    question: "What happens if a farm can't fill my order?",
    answer: "You're refunded for that farm's order. Orders from your other farms carry on as normal.",
  },
  {
    topic: "payment",
    question: "How do refunds work?",
    answer:
      "You get a full refund if the farm doesn't accept or the whole order is affected, or a part refund for the affected items. Refunds go back to the card or bank account you paid with, through Paystack. Your bank may take up to 7 working days to show it.",
  },
];

export const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "Choose your produce", body: "Shop from verified farms near you. One cart can hold several farms." },
  {
    title: "Pay safely, held by Farmkeke",
    body: "Pickup orders are paid at checkout; delivery orders once the farm accepts and the delivery is priced. Farmkeke holds your payment until you confirm.",
  },
  { title: "The farm prepares it", body: "Each farm accepts within 24 hours, then packs your order fresh." },
  {
    title: "A rider brings it, or you collect",
    body: "A Farmkeke rider delivers to your door, or you collect from the farm with your pickup code.",
  },
  {
    title: "Confirm, and the farmer is paid",
    body: "Check everything arrived, then tap Confirm delivery. If not, report a problem and your money stays held.",
  },
];

export const SUPPORT_EMAIL = "support@farmkeke.com";
/** Calls and WhatsApp, Monday to Saturday, 8am to 8pm */
export const SUPPORT_PHONE = "+234 816 040 4686";
export const SUPPORT_PHONE_TEL = "+2348160404686";
export const INFO_EMAIL = "info@farmkeke.com";
export const WEBSITE = "https://farmkeke.com";
