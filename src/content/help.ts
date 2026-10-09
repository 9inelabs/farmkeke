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
      "Farms have up to 24 hours to accept, so the earliest delivery is usually the next day. You choose a delivery window at checkout, and each farm's order arrives in that window.",
  },
  {
    topic: "problem",
    question: "What if my produce arrives damaged?",
    answer:
      "Don't confirm delivery. Tap There's a problem on the order instead, add photos, and tell us what happened. The farm isn't paid while we look into it.",
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
      "Choose a Farmkeke pickup point at checkout. When your order arrives there, you'll get a pickup code. Show it at the counter and collect within the time shown.",
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
];

export const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "Choose your produce", body: "Shop from verified farms near you. One cart can hold several farms." },
  {
    title: "Pay once, held safely",
    body: "Farmkeke holds your payment. The farmer can see it is paid but can't touch it yet.",
  },
  { title: "The farm prepares it", body: "Each farm accepts within 24 hours, then packs your order fresh." },
  {
    title: "A rider brings it, or you collect",
    body: "A Farmkeke rider delivers to your door or to the pickup point you chose.",
  },
  {
    title: "Confirm, and the farmer is paid",
    body: "Check everything arrived, then tap Confirm delivery. If not, report a problem and your money stays held.",
  },
];

export const LEGAL_DOCS = {
  terms: { title: "Terms of use", summary: "The rules for using Farmkeke" },
  privacy: { title: "Privacy policy", summary: "How we use and protect your data" },
  refunds: { title: "Refund and dispute policy", summary: "What happens when something goes wrong" },
} as const;

export type LegalDoc = keyof typeof LEGAL_DOCS;

export const SUPPORT_EMAIL = "support@farmkeke.com";
export const HELLO_EMAIL = "hello@farmkeke.com";
export const WEBSITE = "https://farmkeke.com";
