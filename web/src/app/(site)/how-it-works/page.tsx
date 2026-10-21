// W-80 How it works
import {
  ArrowRight,
  Check,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, S, Tile, cap, h3b, lead } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Fresh food from the farm in four steps: choose your produce, pay securely, receive your order, then confirm to release payment to the farmer.",
};

const STEPS: Array<{ icon: LucideIcon; title: string; body: string; points: string[] }> = [
  {
    icon: Search,
    title: "Choose your produce",
    body: "Tell us your area, then browse fresh produce from verified farms that deliver near you.",
    points: [
      "Shop eight categories, from vegetables to meat and fish",
      "See the farm, price and pack size for every item",
      "Order from several farms in one checkout",
    ],
  },
  {
    icon: Lock,
    title: "Pay securely",
    body: "Pay with card, bank transfer or USSD through Paystack. Farmkeke holds the money safely. For home delivery, you pay once the farm accepts and we've priced the delivery.",
    points: [
      "No account needed. Check out as a guest",
      "Each farm gets its own order, and has 24 hours to accept",
      "If a farm doesn't accept, you get a full refund",
    ],
  },
  {
    icon: Truck,
    title: "Receive your order",
    body: "A Farmkeke rider brings it to your door, or you collect it from the farm.",
    points: [
      "Follow each step: accepted, packed, on the way",
      "Chat with the farmer about your order",
      "Pickup orders wait for you for 3 days",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Confirm and release",
    body: "Check everything arrived as expected, then confirm. Only then is the farmer paid.",
    points: [
      "Something wrong? Report it before you confirm",
      "Your money stays held while we look into it",
      "Rate the farm to help other shoppers",
    ],
  },
];

const OPTIONS: Array<{ icon: LucideIcon; title: string; sub: string; rows: Array<[string, string]>; cta: [string, string] }> = [
  {
    icon: Truck,
    title: "Home delivery",
    sub: "Brought to your door by a Farmkeke rider",
    rows: [
      ["Delivery fee", "Priced per order once the farm accepts"],
      ["When you pay", "Within 12 hours of your bill, before the rider collects"],
      ["You need", "Your address and phone number"],
      ["To confirm", "Check items when the rider arrives"],
    ],
    cta: ["See where we deliver", routes.shop],
  },
  {
    icon: MapPin,
    title: "Pickup at the farm",
    sub: "Collect from the farm yourself",
    rows: [
      ["Pickup fee", "Free"],
      ["When", "Within 3 days of it being ready"],
      ["You need", "Your 4-digit pickup code"],
      ["To confirm", "Check items at the farm"],
    ],
    cta: ["Start shopping", routes.shop],
  },
];

const STATUSES: Array<[string, string, string]> = [
  ["b-pend", "Waiting for the farm", "The farm has up to 24 hours to accept your order."],
  ["b-held", "Accepted", "The farm is preparing your produce."],
  ["b-held", "Packed", "A rider is on the way to collect it from the farm."],
  ["b-pend", "Out for delivery", "Your order is on its way to you."],
  ["b-ok", "Delivered", "Check your items, then confirm to release payment."],
  ["b-err", "Problem reported", "Your money stays held while Farmkeke reviews it."],
];

const textLink = "mt-2.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold m:mt-0.5 m:min-h-10 m:text-[13px]";

export default function HowItWorksPage() {
  return (
    <>
      <section className="wrap-site pt-[72px] m:pt-9">
        <FadeUp className={`${S.sechead} !max-w-[760px]`}>
          <Eyebrow icon={ArrowRight}>How it works</Eyebrow>
          <h1 className={S.h1}>Fresh food from the farm, in four steps</h1>
          <p className={lead}>Whether you shop in the app or on the website, every Farmkeke order works the same way.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3 m:mt-1 m:w-full m:flex-col m:gap-2.5">
            <Link href={routes.shop} className="btn lime h-12 px-[22px] text-[15px] m:h-11 m:text-sm">
              <Store aria-hidden size={18} strokeWidth={2} />
              Start shopping
            </Link>
            <Link href={routes.escrow} className="btn ghost h-12 px-[22px] text-[15px] m:h-11 m:text-sm">
              <ShieldCheck aria-hidden size={18} strokeWidth={2} />
              How payments are protected
            </Link>
          </div>
        </FadeUp>
      </section>

      <section className="wrap-site">
        <FadeUp>
          <ol className="m-0 flex list-none flex-col gap-4 p-0 m:gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={`${S.card} grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] items-start gap-6 p-7 m:grid-cols-[32px_minmax(0,1fr)] m:gap-x-3 m:gap-y-3 m:p-4`}
              >
                <span
                  className={`flex size-12 flex-none items-center justify-center rounded-full font-display text-lg font-bold m:size-8 m:text-sm ${
                    i === 3 ? "bg-lime text-ink" : "bg-forest text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2.5 m:min-h-8 m:gap-2">
                    <s.icon aria-hidden size={20} strokeWidth={1.75} className="text-forest m:size-[17px]" />
                    <h2 className={S.h3}>{s.title}</h2>
                  </div>
                  <p className="m-0 mt-2 text-[15px] leading-6 text-muted m:mt-1 m:text-sm m:leading-[21px]">{s.body}</p>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2.5 rounded-[14px] bg-[#F7F8F4] px-[18px] py-4 m:col-span-2 m:gap-2 m:rounded-xl m:px-3.5 m:py-3">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm leading-[21px] text-ink-3 m:gap-2 m:text-[13px] m:leading-[19px]">
                      <Check aria-hidden size={16} strokeWidth={2.25} className="mt-0.5 flex-none text-ok m:size-[14px]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={S.sechead}>
            <Eyebrow icon={Truck}>Getting your order</Eyebrow>
            <h2 className={S.h2}>Delivery or pickup, your choice</h2>
            <p className={lead}>Choose at checkout. You can pick differently for each order.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 m:grid-cols-1 m:gap-3">
            {OPTIONS.map((o) => (
              <div key={o.title} className={`${S.card} p-7 m:p-4`}>
                <div className="flex items-center gap-3.5 m:gap-3">
                  <Tile icon={o.icon} />
                  <div>
                    <h3 className={S.h3}>{o.title}</h3>
                    <div className={`${cap} mt-0.5`}>{o.sub}</div>
                  </div>
                </div>
                <dl className="m-0 mt-3.5 m:mt-2">
                  {o.rows.map(([k, v], i) => (
                    <div
                      key={k}
                      className={`flex justify-between gap-3 py-3 text-sm m:py-2.5 m:text-[13px] m:leading-[19px] ${i ? "shadow-[inset_0_1px_0_var(--color-line-soft)]" : ""}`}
                    >
                      <dt className="text-muted-2 m:flex-none m:whitespace-nowrap">{k}</dt>
                      <dd className="m-0 text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link href={o.cta[1]} className="btn sm ghost mt-4 w-full m:mt-2">
                  {o.cta[0]}
                </Link>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-start gap-8 m:grid-cols-1 m:gap-3">
          <div className={`${S.card} p-8 m:p-4`}>
            <h2 className={`${h3b} text-[22px] leading-[30px] m:text-lg m:leading-6`}>What your order status means</h2>
            <p className="m-0 mt-1.5 text-[15px] leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">You&apos;ll get an email or app notification each time it changes.</p>
            <dl className="m-0 mt-3.5">
              {STATUSES.map(([tone, label, body], i) => (
                <div
                  key={label}
                  className={`grid grid-cols-[200px_minmax(0,1fr)] items-center gap-4 py-3.5 m:grid-cols-1 m:gap-1.5 m:py-3 ${
                    i < STATUSES.length - 1 ? "shadow-[inset_0_-1px_0_var(--color-line-soft)]" : ""
                  }`}
                >
                  <dt>
                    <span className={`badge ${tone}`}>{label}</span>
                  </dt>
                  <dd className="m-0 text-sm leading-6 text-muted m:text-[13px] m:leading-5">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-5 m:gap-3">
            <div className={`${S.card} flex gap-4 p-7 m:gap-3 m:p-4`}>
              <Tile icon={User} />
              <div>
                <h3 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Shopping as a guest?</h3>
                <p className="m-0 mt-1.5 text-sm leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">
                  Only the phone or browser you ordered on can confirm delivery. On another device, use Find my order to see
                  your order status.
                </p>
                <Link href={routes.findOrder} className={textLink}>
                  Find my order
                  <ArrowRight aria-hidden size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
            <div className={`${S.card} flex gap-4 p-7 m:gap-3 m:p-4`}>
              <Tile icon={MessageCircle} />
              <div>
                <h3 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Questions about produce?</h3>
                <p className="m-0 mt-1.5 text-sm leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">
                  After you order, you can message the farm directly from your order page.
                </p>
              </div>
            </div>
            <div className={`${S.card} flex gap-4 p-7 m:gap-3 m:p-4`}>
              <Tile icon={Smartphone} />
              <div>
                <h3 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Get the app for alerts</h3>
                <p className="m-0 mt-1.5 text-sm leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">The app sends instant updates when your order moves.</p>
                <Link href={routes.getTheApp} className={textLink}>
                  Get the app
                  <ArrowRight aria-hidden size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
