// Bundled help content for M-90 and M-92. Staff will edit help articles in
// the Admin Portal (A-88, Phase 10); until then they live here.

export type HelpTopic = "ordering" | "delivery" | "payment" | "problem";

export const HELP_TOPICS: { key: HelpTopic; title: string }[] = [
  { key: "ordering", title: "Ordering" },
  { key: "delivery", title: "Delivery and pickup" },
  { key: "payment", title: "Payment and buyer protection" },
  { key: "problem", title: "A problem with my order" },
];

export const FAQ: { topic: HelpTopic; question: string; answer: string }[] = [
  {
    topic: "payment",
    question: "When do I pay?",
    answer:
      "Only after the farm accepts your order. We send you a bill by email, text and in the app, and you have 12 hours to pay it by card, bank transfer or USSD through Paystack.",
  },
  {
    topic: "payment",
    question: "When does the farmer get paid?",
    answer:
      "When you pay. Paystack sends the farm its share straight away, and Farmkeke keeps its fee and the delivery fee. Farmkeke doesn't hold your money.",
  },
  {
    topic: "payment",
    question: "What protects me if something goes wrong?",
    answer:
      "Report it within a day of delivery or collection. Our team looks into it, and if you're owed money, Farmkeke refunds you, in full or for the affected items.",
  },
  {
    topic: "ordering",
    question: "Can I cancel an order?",
    answer:
      "Until the farm accepts, you haven't paid anything. Once you've paid, orders can't be cancelled from the app. If something must stop, contact Farmkeke support and our team will help. If a farm doesn't accept within 24 hours, the order is cancelled and you aren't charged.",
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
      "Tap Report a problem on the order within a day of delivery or collection, add photos, and tell us what happened. The farm has 12 hours to reply, and Farmkeke usually decides within a day. If you're owed a refund, Farmkeke sends it.",
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
      "Choose pickup at checkout. Once the farm accepts, we send your bill to pay within 12 hours. When the farm has your order ready, you'll get a 4-digit pickup code. Go to the farm within 3 days, give the farmer your code, and collect your produce. There's no fee for pickup.",
  },
  {
    topic: "ordering",
    question: "Can I order from more than one farm at once?",
    answer:
      "Yes. One cart can hold several farms. Once they've accepted, you pay one bill, and each farm packs and sends its own order.",
  },
  {
    topic: "payment",
    question: "What happens if a farm can't fill my order?",
    answer: "That farm's order is left off your bill, so you're not charged for it. Orders from your other farms carry on as normal.",
  },
  {
    topic: "payment",
    question: "How do refunds work?",
    answer:
      "If we decide you're owed money, you get a full refund (delivery fee included) or a part refund for the affected items. Farmkeke sends it back to the card or bank account you paid with, through Paystack. Banks usually take 3 to 10 working days to show it.",
  },
];

export const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "Choose your produce", body: "Shop from verified farms near you. One cart can hold several farms." },
  {
    title: "The farm accepts",
    body: "Each farm accepts within 24 hours. You don't pay anything before that.",
  },
  {
    title: "You pay your bill",
    body: "We send one bill once the farms accept (and, for delivery, once it's priced). Pay within 12 hours through Paystack, then the farm packs your order fresh.",
  },
  {
    title: "A rider brings it, or you collect",
    body: "A Farmkeke rider delivers to your door, or you collect from the farm with your pickup code.",
  },
  {
    title: "A day to report a problem",
    body: "Check everything arrived. Something wrong? Report it within a day and we'll sort it out. Otherwise, your order closes.",
  },
];

export const SUPPORT_EMAIL = "support@farmkeke.com";
/** Calls and WhatsApp, Monday to Saturday, 8am to 8pm */
export const SUPPORT_PHONE = "+234 816 040 4686";
export const SUPPORT_PHONE_TEL = "+2348160404686";
export const INFO_EMAIL = "info@farmkeke.com";
export const WEBSITE = "https://farmkeke.com";
