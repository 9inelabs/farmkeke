"use client";

// W-85 Help: search, topic tabs and the FAQ accordion.
import {
  ArrowRight,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Sprout,
  TriangleAlert,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { routes } from "@/lib/routes";
import { Tile, h3b } from "./ui";

type Topic = { name: string; icon: LucideIcon; faqs: Array<[string, string]> };

const TOPICS: Topic[] = [
  {
    name: "Ordering",
    icon: Package,
    faqs: [
      [
        "Do I need an account to order?",
        "No. You can check out as a guest with your name and phone number. You can save your details as an account afterwards, and your guest orders are linked to it.",
      ],
      [
        "Can I order from more than one farm?",
        "Yes. Your cart can hold items from several farms. At checkout, each farm gets its own order and its own tracking. For home delivery, you get one bill for all of them.",
      ],
      [
        "How do I find my order as a guest?",
        "Go to Find my order and enter your order number and phone number. On a different device, you can view the order but not confirm it.",
      ],
      [
        "Can I change or cancel my order?",
        "You can cancel for a full refund until the farm accepts it. After that, contact support and we will check with the farm.",
      ],
    ],
  },
  {
    name: "Payment and protection",
    icon: ShieldCheck,
    faqs: [
      ["How can I pay?", "Card, bank transfer or USSD, all through Paystack. Farmkeke never sees your full card number."],
      ["When is the farmer paid?", "Only after you confirm your order arrived as expected. Until then, Farmkeke holds the money."],
      [
        "What if the farm does not accept my order?",
        "Farms have 24 hours to accept. If they do not, your payment is refunded in full automatically.",
      ],
      [
        "A farmer asked me to pay them directly. What should I do?",
        "Do not pay. Payments outside Farmkeke are not protected. Please report it to support.",
      ],
    ],
  },
  {
    name: "Delivery and pickup",
    icon: Truck,
    faqs: [
      [
        "Where do you deliver?",
        "Within our service areas in Owerri. Enter your area when you start shopping to see delivery and pickup options.",
      ],
      ["How much is delivery?", "We price each farm order's delivery once the farm accepts and we've arranged a rider. It's added to your bill, which we send by email, text and in the app. Pickup at the farm is free."],
      [
        "When do I pay for home delivery?",
        "After the farm accepts. We send one bill with your produce and delivery, and you have 12 hours to pay. The rider collects your order only once it's paid. If you don't pay in time, the order is cancelled.",
      ],
      [
        "How long do I have to collect a pickup order?",
        "3 days from when the farm has it ready. We send you the farm's address and your 4-digit pickup code. Give the code to the farmer when you collect.",
      ],
      [
        "Can someone else collect for me?",
        "Yes. Share the pickup code and order number with them. Only confirm once you know everything is correct.",
      ],
    ],
  },
  {
    name: "Problems and refunds",
    icon: TriangleAlert,
    faqs: [
      [
        "Something is wrong with my order. What do I do?",
        "Open your order and choose Report a problem before you confirm. Add photos and tell us which items were affected. Your money stays held.",
      ],
      [
        "How long does a problem report take?",
        "The farm has 12 hours to reply. Farmkeke then decides the outcome, usually within about a day.",
      ],
      [
        "Will the delivery fee be refunded?",
        "For a part refund, you are refunded for the affected items only. The delivery fee is not refunded because the delivery still happened.",
      ],
      [
        "Where does my refund go?",
        "Back to the card or bank account you paid with. Your bank may take a few working days to show it.",
      ],
      [
        "I already confirmed. Can I still report a problem?",
        "Confirming releases the money to the farm and cannot be undone. Contact support and we will try to help with the farm.",
      ],
    ],
  },
  {
    name: "Your account",
    icon: User,
    faqs: [
      [
        "I forgot my password",
        "On the sign-in page, choose Forgot password. We will email you a reset link that works for 30 minutes.",
      ],
      [
        "How do I change my delivery address?",
        "Go to Your account, then Addresses. You can add, edit or set a default address.",
      ],
      [
        "Can I turn off messages?",
        "You can turn off most updates in Notification preferences. Messages about payments and refunds always stay on.",
      ],
      [
        "How do I delete my account?",
        "Go to Your account, then Delete account. You cannot delete it while an order is still in progress.",
      ],
    ],
  },
  {
    name: "Selling",
    icon: Sprout,
    faqs: [
      [
        "How do I become a Farmkeke farmer?",
        "Download the app, go to Account, then Sell on Farmkeke, and submit your application with the required documents.",
      ],
      [
        "What documents do I need?",
        "Government ID, farm photos, proof of address, a farmers association letter and bank details for payouts.",
      ],
      ["Can I sell on the website?", "Not yet. Farmers apply and manage everything in the Farmkeke app."],
    ],
  },
];

const heroChip =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/15 hover:text-white m:min-h-9 m:px-3 m:text-xs";

export function HelpCenter() {
  const [topic, setTopic] = useState(0);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const words = q.split(/\s+/);
    return TOPICS.flatMap((t) => t.faqs).filter(([question, answer]) => {
      const text = `${question} ${answer}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [query]);

  const list = results ?? TOPICS[topic]!.faqs;
  const heading = results ? `Results for “${query.trim()}”` : TOPICS[topic]!.name;

  return (
    <>
      <div className="on-dark rounded-[28px] bg-forest p-14 text-center m:rounded-[20px] m:px-4 m:py-6">
        <h1 className="font-display text-[44px] leading-[52px] font-extrabold tracking-[-0.03em] text-white m:text-[28px] m:leading-[35px]">
          How can we help?
        </h1>
        <p className="m-0 mt-2.5 text-lg leading-[29px] text-on-forest m:mt-1.5 m:text-sm m:leading-[21px]">
          Search our help articles or choose a topic below.
        </p>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft);
          }}
          className="mx-auto mt-7 flex h-[58px] max-w-[640px] items-center gap-3 rounded-2xl bg-surface pr-2 pl-5 text-faint m:mt-5 m:h-12 m:gap-2 m:rounded-xl m:pr-1.5 m:pl-3.5"
        >
          <Search aria-hidden size={20} strokeWidth={2} className="flex-none m:size-[18px]" />
          <input
            type="search"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setQuery(e.target.value);
            }}
            placeholder='Try "refund", "pickup code" or "change address"'
            aria-label="Search help"
            className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-faint"
          />
          <button type="submit" className="btn sm lime px-4 m:min-h-9 m:px-3 m:text-[13px]">
            Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2 m:mt-3 m:gap-1.5">
          <Link href={routes.findOrder} className={heroChip}>
            <Package aria-hidden size={15} strokeWidth={2} />
            Find my order
          </Link>
          <Link href={routes.escrow} className={heroChip}>
            <ShieldCheck aria-hidden size={15} strokeWidth={2} />
            How refunds work
          </Link>
          <Link href={routes.howItWorks} className={heroChip}>
            <MapPin aria-hidden size={15} strokeWidth={2} />
            Delivery and pickup
          </Link>
        </div>
      </div>

      <div
        className="m-swipe mt-7 grid grid-cols-6 gap-3 [--swipe-w:auto] min-[761px]:max-[1000px]:grid-cols-3 m:mt-4 m:!gap-2 m:!pb-1"
        role="group"
        aria-label="Help topics"
      >
        {TOPICS.map((t, i) => {
          const on = !results && i === topic;
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setTopic(i);
                setDraft("");
                setQuery("");
              }}
              className={`flex cursor-pointer flex-col items-start gap-3.5 rounded-[18px] p-5 text-left text-ink transition-colors duration-150 m:flex-row m:items-center m:gap-2 m:rounded-full m:py-1.5 m:pr-3.5 m:pl-1.5 ${
                on ? "bg-[#FBFDF7] shadow-[inset_0_0_0_2px_var(--color-forest)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-soft"
              }`}
            >
              <Tile icon={t.icon} size={40} iconSize={20} className="m:!size-7 m:!rounded-full m:[&>svg]:size-[15px]" />
              <span className="text-[15px] font-semibold m:text-[13px] m:whitespace-nowrap">{t.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start gap-6 m:mt-4 m:grid-cols-1 m:gap-3">
        <section aria-labelledby="help-topic">
          <div className="mb-3.5 flex items-baseline justify-between gap-3 m:mb-2.5">
            <h2 id="help-topic" className={`${h3b} text-[22px] leading-[30px] m:text-lg m:leading-6`}>
              {heading}
            </h2>
            <span className="text-xs leading-4 text-subtle" aria-live="polite">
              {list.length === 1 ? "1 article" : `${list.length} articles`}
            </span>
          </div>
          {list.length ? (
            <Accordion
              key={`${topic}:${query}`}
              className="!rounded-[20px]"
              items={list.map(([q, a]) => ({ question: q, answer: a }))}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-[20px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
              <div className="text-[15px] font-semibold">No articles match your search</div>
              <p className="m-0 text-sm leading-6 text-muted">
                Try a shorter word, like &quot;refund&quot; or &quot;pickup&quot;, or send us a message and we&apos;ll help.
              </p>
              <button
                type="button"
                className="btn sm ghost px-4"
                onClick={() => {
                  setDraft("");
                  setQuery("");
                }}
              >
                Clear search
              </button>
            </div>
          )}
        </section>
        <aside className="flex flex-col gap-4 m:gap-3">
          <div className="rounded-[20px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)] m:rounded-[18px] m:p-4">
            <h2 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Still need help?</h2>
            <p className="m-0 mt-1 text-sm leading-6 text-muted m:text-[13px] m:leading-5">
              Our support team replies within a few hours, Monday to Saturday.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 m:mt-3 m:grid m:grid-cols-2 m:gap-2">
              <Link href={routes.contact} className="btn sm dark w-full m:px-2 m:text-[13px]">
                <MessageCircle aria-hidden size={16} strokeWidth={2} />
                Chat with support
              </Link>
              <Link href={`${routes.contact}#message`} className="btn sm ghost w-full m:px-2 m:text-[13px]">
                <Mail aria-hidden size={16} strokeWidth={2} />
                Send us a message
              </Link>
            </div>
          </div>
          <div className="flex gap-3.5 rounded-[20px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)] m:gap-3 m:rounded-[18px] m:p-4">
            <Tile icon={Package} size={40} iconSize={20} />
            <div>
              <h2 className="m-0 text-[15px] font-semibold">Problem with an order?</h2>
              <p className="m-0 mt-0.5 text-sm leading-6 text-muted m:text-[13px] m:leading-5">
                Report it from your order page before you confirm, so your money stays held.
              </p>
              <Link href={routes.myOrders} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold m:mt-0.5 m:min-h-10 m:text-[13px]">
                Go to my orders
                <ArrowRight aria-hidden size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
