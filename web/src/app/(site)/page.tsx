// W-00 Landing page (Main.dc.html desktop, W-00-Landing-mobile phone).
// PRD order: hero, what Farmkeke is, shoppers, how it works, farmers,
// app highlights, FAQ, closing download section with store buttons and QR.
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleHelp,
  LayoutGrid,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sprout,
  Star,
  Tag,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoreButtons } from "@/components/brand/StoreButtons";
import { QrCode } from "@/components/site/QrCode";
import { Eyebrow, L, Tile, cap, h3b, lead, leadSize, para, surface } from "@/components/site/ui";
import { Accordion } from "@/components/ui/Accordion";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: { absolute: "Farmkeke · From the farm directly to your home" },
  description:
    "Farmkeke connects households with verified Nigerian farmers. Shop fresh produce at fair prices, and your money stays protected until your order arrives.",
};

const FAQS = [
  {
    q: "Do I need an account to buy?",
    a: "No. Check out as a guest with your name and phone number. After ordering you can save your details as an account, and your earlier orders are linked to it.",
  },
  {
    q: "How does Farmkeke protect my money?",
    a: "When you pay, Farmkeke holds the money. The farmer is paid only after you confirm your order arrived as expected.",
  },
  {
    q: "Where does Farmkeke deliver?",
    a: "Farmkeke delivers within its service areas. Enter your area when you shop to see delivery and pickup options near you.",
  },
  {
    q: "Can I pick up my order instead?",
    a: "Yes. Choose pickup at checkout and collect your order from the farm. When it's ready, we send you the farm's address and a 4-digit pickup code, and you have 3 days to collect.",
  },
  {
    q: "What if something is wrong with my order?",
    a: "Report the problem before you confirm receipt. Your money stays held while our team reviews it and works out the right outcome.",
  },
  {
    q: "How do I become a Farmkeke farmer?",
    a: "Download the app, go to Account, then Sell on Farmkeke, and submit your application with the required documents. Our team reviews every application.",
  },
];

const TRUST: Array<[LucideIcon, string, string]> = [
  [BadgeCheck, "Verified farmers", "Every farm checked by our team"],
  [ShieldCheck, "Protected payments", "Held until you confirm delivery"],
  [Truck, "Farmkeke riders", "Our own team delivers"],
  [MapPin, "Pickup at the farm", "Collect within 3 days, no fee"],
];

const WHAT: Array<[LucideIcon, string, string]> = [
  [Tag, "Fair prices", "Buy straight from the people who grow your food, without market markups along the way."],
  [
    BadgeCheck,
    "Verified farmers",
    "Every farm sends its ID, farm photos and association letter, and is approved by our team before it can sell.",
  ],
  [
    Shield,
    "Protected payments",
    "Your money is held by Farmkeke and released to the farmer only after you confirm your order arrived.",
  ],
];

const SHOPPERS: Array<[LucideIcon, string, string]> = [
  [LayoutGrid, "Shop eight categories", "Vegetables, fruits, grains and tubers, poultry and eggs, meat and fish, and more."],
  [User, "Buy as a guest", "Check out with your name and phone number. Save an account later if you like."],
  [Truck, "Delivery or pickup", "Our riders bring it to you, or collect it from the farm yourself."],
  [Package, "Track every order", "See when the farm accepts, packs and sends out your order."],
  [MessageCircle, "Chat with the farmer", "Ask about your order and get answers straight from the farm."],
  [Star, "Rate and review", "Share how it went and help other shoppers choose good farms."],
];

const STEPS: Array<[string, string]> = [
  ["Choose your produce", "Browse farms near you and add items to your cart."],
  ["Pay securely", "Pay with Paystack. Farmkeke holds the money safely."],
  ["Receive your order", "At your door, or collected from the farm."],
  ["Confirm and release", "Confirm it all arrived, and the farmer gets paid."],
];

const APPLY: Array<[string, string]> = [
  ["Download the Farmkeke app", "Create your account with your phone number and email."],
  ["Go to Account, then Sell on Farmkeke", "Tell us about your farm and what you grow."],
  ["Upload your documents", "Take clear photos of each document below."],
  ["Get approved and start selling", "Our team reviews your application, then you can list produce."],
];

const NEEDS = ["Government ID", "Farm photos", "Proof of address", "Farmers association letter", "Bank details for payouts"];

const heroCard =
  "w-80 flex-none rounded-[22px] bg-surface p-5 m:rounded-[18px] m:p-4";
const heroShadow = "shadow-[inset_0_0_0_1px_var(--color-line),0_18px_40px_rgba(30,59,22,0.08)]";

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section id="top" className="wrap-site pt-[88px] text-center m:pt-9">
        <FadeUp>
          <div className="flex flex-col items-center gap-6 m:gap-4">
            <Eyebrow icon={Check}>Fresh from verified Nigerian farms</Eyebrow>
            <h1 className={`${L.h1} max-w-[900px]`}>
              From the farm directly to your{" "}
              <span className="inline-block rounded-[18px] bg-lime-soft px-[18px] pb-1 text-forest shadow-[inset_0_0_0_2px_var(--color-lime)] m:rounded-xl m:px-2.5 m:pb-0.5">
                home
              </span>
            </h1>
            <p className={`${lead} max-w-[640px]`}>
              Farmkeke connects households with verified farmers. Shop fresh produce at fair prices, and your money stays
              protected until your order arrives.
            </p>
            <StoreButtons className="mt-2 justify-center m:mt-1 m:w-full" />
            <Link href={routes.shop} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold m:text-sm">
              Prefer your browser? Shop on the web <ArrowRight aria-hidden size={16} strokeWidth={2} />
            </Link>
          </div>

          <div className="m-swipe mt-[72px] flex items-start justify-center gap-7 text-left [--swipe-w:78%] m:mt-8">
            <div className={`${heroCard} ${heroShadow} rotate-[-4deg] translate-y-7 m:rotate-0 m:translate-y-0 m:shadow-[inset_0_0_0_1px_var(--color-line)]`}>
              <div className="flex items-center gap-3 rounded-[14px] bg-[#F7F8F4] p-3.5">
                <div className="flex size-16 flex-none items-center justify-center rounded-xl bg-[#E9F1DC] text-forest">
                  <Sprout aria-hidden size={26} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">Fresh tomatoes</div>
                  <div className={`${cap} mt-0.5 flex items-center gap-1`}>
                    Okafor Farms <BadgeCheck aria-label="Verified" role="img" size={13} strokeWidth={2} className="text-forest" />
                  </div>
                  <div className="mt-1.5 font-display text-base font-extrabold text-forest">
                    ₦4,500 <span className="font-sans text-xs font-medium text-subtle">/ basket</span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 flex items-center justify-between" aria-hidden>
                <div className="flex h-[38px] items-center gap-3.5 rounded-[10px] px-3 font-semibold shadow-[inset_0_0_0_1px_var(--color-line-2)]">
                  <span className="text-subtle">−</span>2<span className="text-forest">+</span>
                </div>
                <span className="inline-flex h-[38px] items-center rounded-[10px] bg-lime px-4 text-sm font-semibold text-ink">
                  Add to cart
                </span>
              </div>
              <div className="mt-[18px] pt-4 shadow-[inset_0_1px_0_var(--color-line-soft)]">
                <div className={cap}>Step 1</div>
                <div className="mt-[3px] text-sm font-semibold">Pick fresh produce from verified farms</div>
              </div>
            </div>

            <div className={`${heroCard} shadow-[inset_0_0_0_1px_var(--color-line),0_24px_48px_rgba(30,59,22,0.10)] m:shadow-[inset_0_0_0_1px_var(--color-line)]`}>
              <div className="rounded-[14px] bg-[#F7F8F4] p-4">
                <div className="flex items-center justify-between">
                  <span className={cap}>Order total</span>
                  <span className="badge b-held">
                    <Shield aria-hidden size={13} strokeWidth={2} />
                    Held safely
                  </span>
                </div>
                <div className="mt-1.5 font-display text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">₦12,400</div>
                <div className="mt-3 flex flex-col gap-2 text-[13px] text-ink-3">
                  <div className="flex items-center gap-2">
                    <Check aria-hidden size={15} strokeWidth={2.25} className="text-ok" />
                    Paid with Paystack
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock aria-hidden size={15} strokeWidth={2} className="text-forest" />
                    Released when you confirm
                  </div>
                </div>
              </div>
              <div className="mt-[18px] pt-4 shadow-[inset_0_1px_0_var(--color-line-soft)]">
                <div className={cap}>Step 2</div>
                <div className="mt-[3px] text-sm font-semibold">Pay safely. We hold your money until it arrives</div>
              </div>
            </div>

            <div className={`${heroCard} ${heroShadow} rotate-[4deg] translate-y-7 m:rotate-0 m:translate-y-0 m:shadow-[inset_0_0_0_1px_var(--color-line)]`}>
              <ul className="m-0 flex list-none flex-col gap-3 rounded-[14px] bg-[#F7F8F4] p-4 text-[13px]">
                {[
                  ["Accepted by the farm", "10:24"],
                  ["Packed and ready", "11:02"],
                ].map(([label, time]) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <span className="flex size-5 flex-none items-center justify-center rounded-full bg-forest text-white">
                      <Check aria-hidden size={12} strokeWidth={3} />
                    </span>
                    <span className="flex-1">{label}</span>
                    <span className={cap}>{time}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2.5">
                  <span className="size-5 flex-none rounded-full bg-lime shadow-[0_0_0_4px_var(--color-lime-soft)]" />
                  <span className="flex-1 font-semibold">Out for delivery</span>
                  <span className={cap}>Now</span>
                </li>
                <li className="flex items-center gap-2.5 text-[#9A9E95]">
                  <span className="size-5 flex-none rounded-full shadow-[inset_0_0_0_1.5px_#C9CEC2]" />
                  <span className="flex-1">Delivered</span>
                </li>
              </ul>
              <div className="mt-[18px] pt-4 shadow-[inset_0_1px_0_var(--color-line-soft)]">
                <div className={cap}>Step 3</div>
                <div className="mt-[3px] text-sm font-semibold">Delivered to your door, or collect at the farm</div>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <ul
            className={`${L.card} m-0 mt-24 grid list-none grid-cols-4 p-0 text-left [&>li+li]:shadow-[inset_1px_0_0_var(--color-line)] m:mt-6 m:grid-cols-2 m:gap-px m:overflow-hidden m:bg-line m:p-px m:[&>li]:bg-surface m:[&>li+li]:shadow-none`}
          >
            {TRUST.map(([Icon, title, sub]) => (
              <li key={title} className="flex items-center gap-3.5 px-7 py-6 m:flex-col m:items-start m:gap-2.5 m:p-4">
                <Tile icon={Icon} />
                <div>
                  <div className="text-[15px] font-semibold m:text-sm m:leading-5">{title}</div>
                  <div className={`${cap} mt-0.5 m:leading-[17px]`}>{sub}</div>
                </div>
              </li>
            ))}
          </ul>
        </FadeUp>
      </section>

      {/* What Farmkeke is */}
      <section id="about" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={L.sechead}>
            <Eyebrow icon={Sprout}>What is Farmkeke</Eyebrow>
            <h2 className={L.h2}>A fairer way to buy fresh food</h2>
            <p className={lead}>
              Produce in Nigeria passes through many hands before it reaches you. Farmkeke takes out the middlemen, so you
              pay less and farmers earn more.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5 m:grid-cols-1 m:gap-2.5">
            {WHAT.map(([Icon, title, body]) => (
              <div
                key={title}
                className={`${L.card} flex flex-col gap-4 p-8 m:grid m:grid-cols-[auto_minmax(0,1fr)] m:gap-x-3.5 m:gap-y-1 m:p-4`}
              >
                <Tile icon={Icon} className="m:row-span-2" />
                <h3 className={L.h3}>{title}</h3>
                <p className={para}>{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* What shoppers can do */}
      <section id="shoppers" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={L.sechead}>
            <Eyebrow icon={ShoppingBasket}>For shoppers</Eyebrow>
            <h2 className={L.h2}>Everything you need to shop fresh</h2>
            <p className={lead}>Shop in the app or on the web. You don&apos;t need an account to place your first order.</p>
          </div>
          <div className={`${L.card} p-2 m:p-1`}>
            <ul className="m-0 grid list-none grid-cols-3 p-0 m:grid-cols-1 m:[&>li+li]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
              {SHOPPERS.map(([Icon, title, body], i) => (
                <li
                  key={title}
                  className={`flex gap-4 p-8 m:gap-3.5 m:px-3.5 m:py-4 ${i >= 3 ? "shadow-[inset_0_1px_0_var(--color-line-soft)]" : ""}`}
                >
                  <Tile icon={Icon} />
                  <div>
                    <h3 className={`${h3b} text-[17px] leading-[26px] m:text-[15px] m:leading-[21px]`}>{title}</h3>
                    <p className={`${para} mt-1.5 m:mt-0.5`}>{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </section>

      {/* How it works */}
      <section id="how" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={`${surface} ${L.panel}`}>
            <div className={L.sechead}>
              <Eyebrow icon={ArrowRight}>How it works</Eyebrow>
              <h2 className={L.h2}>Four simple steps, start to finish</h2>
              <p className={lead}>From choosing your produce to paying the farmer, every step is clear.</p>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute top-[22px] right-[12%] left-[12%] border-t-2 border-dashed border-[#CFD6C6] m:hidden" />
              <ol className="m-0 grid list-none grid-cols-4 gap-6 p-0 text-center m:grid-cols-1 m:gap-4 m:text-left">
                {STEPS.map(([title, body], i) => (
                  <li
                    key={title}
                    className="flex flex-col items-center gap-3.5 m:grid m:grid-cols-[auto_minmax(0,1fr)] m:items-start m:gap-x-3.5 m:gap-y-0.5"
                  >
                    <span
                      className={`relative flex size-[46px] items-center justify-center rounded-full font-display text-[17px] font-bold m:row-span-2 m:size-8 m:text-sm ${
                        i === 3 ? "bg-lime text-ink" : "bg-forest text-white"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <h3 className={`${h3b} text-[17px] leading-[26px] m:mt-1 m:text-[15px] m:leading-[21px]`}>{title}</h3>
                    <p className={para}>{body}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-12 flex items-center gap-3.5 rounded-2xl bg-[#F4F7EE] px-[22px] py-[18px] m:mt-6 m:items-start m:gap-3 m:px-4 m:py-3.5">
              <ShieldAlert aria-hidden size={22} strokeWidth={1.75} className="flex-none text-forest m:size-5" />
              <p className={`m-0 text-[15px] leading-6 text-[#2E3A28] m:text-[13px] m:leading-5`}>
                Something wrong with your order? Report it before you confirm. Your money stays held while our team looks
                into it.
              </p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* For farmers */}
      <section id="farmers" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={`${L.panel} on-dark grid grid-cols-2 items-center gap-14 bg-forest m:grid-cols-1 m:gap-7`}>
            <div className="flex flex-col gap-5 m:gap-3.5">
              <Eyebrow icon={Sprout} dark className="self-start">
                For farmers
              </Eyebrow>
              <h2 className={`${L.h2} text-white`}>Sell your harvest to homes across Nigeria</h2>
              <p className={`${leadSize} text-on-forest`}>
                List your produce in the Farmkeke app, set your own prices and receive orders from households near you.
              </p>
              <ul className="m-0 mt-1 flex list-none flex-col gap-3 p-0 m:mt-0 m:gap-2.5">
                {[
                  "Reach buyers beyond your local market",
                  "The buyer's payment is secured before you deliver",
                  "Farmkeke riders handle delivery for you",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] text-white m:gap-2.5 m:text-sm m:leading-5">
                    <span className="flex size-6 flex-none items-center justify-center rounded-full bg-lime text-forest m:size-5">
                      <Check aria-hidden size={13} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-4 m:mt-1 m:gap-x-4 m:gap-y-1">
                <Link href={`${routes.home}#download`} className="btn lime h-12 px-[22px] text-[15px] m:h-11 m:px-[18px] m:text-sm">
                  Download the app to apply
                </Link>
                <Link
                  href={routes.sell}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-white hover:text-on-forest-lime m:text-sm"
                >
                  Learn about selling <ArrowRight aria-hidden size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
            <div className="rounded-[24px] bg-surface p-8 shadow-[inset_0_0_0_1px_var(--color-line)] m:rounded-[18px] m:p-4">
              <h3 className={L.h3}>How to apply</h3>
              <ol className="m-0 mt-5 flex list-none flex-col gap-[18px] p-0 m:mt-3.5 m:gap-3">
                {APPLY.map(([title, body], i) => (
                  <li key={title} className="flex gap-3.5 m:gap-3">
                    <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-lime-soft font-display text-sm font-bold text-forest m:size-6 m:text-xs">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold m:text-sm m:leading-5">{title}</div>
                      <div className={`m-0 mt-0.5 text-sm leading-6 text-muted m:text-[13px] m:leading-[19px]`}>{body}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-5 shadow-[inset_0_1px_0_var(--color-line-soft)] m:mt-4 m:pt-4">
                <h4 className={`m-0 text-xs leading-4 font-semibold text-ink-3`}>What you&apos;ll need</h4>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 m:gap-1.5">
                  {NEEDS.map((n) => (
                    <li
                      key={n}
                      className="inline-flex h-[34px] items-center rounded-full bg-surface px-3.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-line-2)] m:h-[30px] m:px-3 m:text-xs"
                    >
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* App highlights */}
      <section id="app" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={L.sechead}>
            <Eyebrow icon={Smartphone}>The Farmkeke app</Eyebrow>
            <h2 className={L.h2}>Fresh produce, a tap away</h2>
            <p className={lead}>The app is the fastest way to shop, follow your orders and chat with farmers.</p>
          </div>
          <div className="m-swipe grid grid-cols-3 gap-6 [--swipe-w:236px]">
            <AppShot title="Browse fresh picks" sub="Produce from farms near you">
              <BrowseScreen />
            </AppShot>
            <AppShot title="Follow your order" sub="Every step, as it happens">
              <OrderScreen />
            </AppShot>
            <AppShot title="Chat with your farmer" sub="Questions answered quickly">
              <ChatScreen />
            </AppShot>
          </div>
        </FadeUp>
      </section>

      {/* FAQ */}
      <section id="faq" className={L.sec}>
        <FadeUp className="wrap-site grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-16 m:grid-cols-1 m:gap-6">
          <div className="flex flex-col items-start gap-4 m:gap-3">
            <Eyebrow icon={CircleHelp}>FAQ</Eyebrow>
            <h2 className={L.h2}>Questions, answered</h2>
            <p className={lead}>Can&apos;t find what you&apos;re looking for? Our support team is happy to help.</p>
            <Link href={routes.contact} className="btn ghost mt-2 h-12 px-[22px] text-[15px] m:mt-0 m:h-11 m:px-[18px] m:text-sm">
              Contact support
            </Link>
          </div>
          <Accordion className="rounded-[22px]" items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
        </FadeUp>
      </section>

      {/* Closing download */}
      <section id="download" className={L.sec}>
        <FadeUp className="wrap-site">
          <div className={`${L.panel} grid grid-cols-2 items-center gap-12 bg-[#E9F2D8] m:grid-cols-1`}>
            <div className="flex flex-col items-start gap-[18px] m:gap-3">
              <h2 className={L.h2}>Start shopping fresh today</h2>
              <p className={`${leadSize} text-[#3F4A37]`}>
                Download Farmkeke for free and get fresh produce from verified farmers, delivered to your home.
              </p>
              <StoreButtons className="mt-1.5 m:w-full" />
            </div>
            <div className="flex justify-end m:hidden">
              <div className="flex items-center gap-5 rounded-[24px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
                <QrCode size={132} />
                <div className="max-w-[150px]">
                  <div className="text-[15px] font-semibold">Scan to download</div>
                  <div className={`m-0 mt-1 text-[13px] leading-[19px] text-muted`}>Point your phone camera at the code.</div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </>
  );
}

/* App highlight phones: illustrations of the app screens (decorative; the caption describes each). */

function AppShot({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-6 m:gap-3">
      <div aria-hidden className="h-[556px] w-[270px] flex-none rounded-[40px] bg-ink p-[9px] m:[zoom:0.84]">
        <div className="relative flex size-full flex-col overflow-hidden rounded-[32px] bg-[#F7F7F5] text-left">{children}</div>
      </div>
      <figcaption className="text-center">
        <h3 className={`${h3b} text-[17px] leading-[26px] m:text-[15px] m:leading-[21px]`}>{title}</h3>
        <p className={`${para} mt-1 m:mt-0.5`}>{sub}</p>
      </figcaption>
    </figure>
  );
}

const pill = "flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold";
const miniCard = "rounded-[10px] bg-surface p-1.5 shadow-[inset_0_0_0_1px_#ECEEE8]";

function BrowseScreen() {
  const picks: Array<[string, string, string]> = [
    ["Tomatoes", "₦4,500", "#E9F1DC"],
    ["Puna yam", "₦12,000", "#EFEBDD"],
    ["Farm eggs", "₦5,200", "#F3EEDF"],
    ["Ugu leaves", "₦1,500", "#E2EEDA"],
  ];
  return (
    <>
      <div className="px-4 pt-[34px]">
        <div className="text-[11px] text-subtle">Good morning</div>
        <div className="mt-0.5 font-display text-[17px] font-extrabold">What are you buying today?</div>
        <div className="mt-3 flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[11px] text-[#9A9E95] shadow-[inset_0_0_0_1px_var(--color-field)]">
          <Search size={13} strokeWidth={2} />
          Search produce or farms
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className={`${pill} bg-forest text-white`}>All</span>
          <span className={`${pill} bg-surface shadow-[inset_0_0_0_1px_var(--color-field)]`}>Vegetables</span>
          <span className={`${pill} bg-surface shadow-[inset_0_0_0_1px_var(--color-field)]`}>Fruits</span>
        </div>
        <div className="mt-4 font-display text-[13px] font-bold">Fresh picks</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {picks.map(([n, p, bg]) => (
            <div key={n} className={miniCard}>
              <div className="h-[70px] rounded-[7px]" style={{ background: bg }} />
              <div className="mt-[5px] text-[10px] font-semibold">{n}</div>
              <div className="font-display text-[11px] font-extrabold text-forest">{p}</div>
            </div>
          ))}
        </div>
      </div>
      <TabBar />
    </>
  );
}

function TabBar() {
  return (
    <div className="mt-auto flex h-[54px] items-center justify-around bg-surface text-[9px] font-semibold text-[#9A9E95] shadow-[inset_0_1px_0_#ECEEE8]">
      <span className="text-forest">Home</span>
      <span>Categories</span>
      <span>Cart</span>
      <span>Orders</span>
      <span>Account</span>
    </div>
  );
}

function OrderScreen() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-[34px]">
      <div className="font-display text-base font-extrabold">Order FK-10234</div>
      <div className="flex gap-1.5">
        <span className="badge b-ok h-5 text-[10px]">Out for delivery</span>
        <span className="badge b-held h-5 text-[10px]">₦12,400 held</span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl bg-surface p-3 text-[11px] shadow-[inset_0_0_0_1px_#ECEEE8]">
        <div className="flex items-center gap-2">
          <span className="size-3.5 flex-none rounded-full bg-forest" />
          Accepted by Okafor Farms
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3.5 flex-none rounded-full bg-forest" />
          Packed and ready
        </div>
        <div className="flex items-center gap-2 font-semibold">
          <span className="size-3.5 flex-none rounded-full bg-lime shadow-[0_0_0_3px_var(--color-lime-soft)]" />
          Out for delivery
        </div>
        <div className="flex items-center gap-2 text-[#9A9E95]">
          <span className="size-3.5 flex-none rounded-full shadow-[inset_0_0_0_1.5px_#C9CEC2]" />
          Delivered
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-surface p-3 shadow-[inset_0_0_0_1px_#ECEEE8]">
        <span className="flex size-8 items-center justify-center rounded-full bg-lime-soft text-[11px] font-bold text-forest">EO</span>
        <div className="flex-1">
          <div className="text-[11px] font-semibold">Emeka O.</div>
          <div className="text-[10px] text-subtle">Farmkeke rider</div>
        </div>
      </div>
      <div className="flex h-9 items-center justify-center rounded-[10px] text-[11px] font-semibold text-forest shadow-[inset_0_0_0_1px_var(--color-forest)]">
        Message farmer
      </div>
    </div>
  );
}

function ChatScreen() {
  const them = "max-w-[78%] self-start rounded-[12px_12px_12px_4px] bg-surface px-2.5 py-2 shadow-[inset_0_0_0_1px_#ECEEE8]";
  return (
    <>
      <div className="flex items-center gap-2 bg-surface px-3.5 pt-[30px] pb-2.5 shadow-[inset_0_-1px_0_#ECEEE8]">
        <span className="size-[30px] rounded-full bg-[#E9F1DC]" />
        <div>
          <div className="text-xs font-semibold">Okafor Farms</div>
          <div className="text-[10px] text-subtle">Order FK-10234</div>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3.5 text-[11px] leading-[15px]">
        <div className={them}>Good morning. Your tomatoes were picked this morning.</div>
        <div className="max-w-[78%] self-end rounded-[12px_12px_4px_12px] bg-forest px-2.5 py-2 text-white">
          Thank you. Please pick the firm ones.
        </div>
        <div className={them}>No problem. They&apos;re packed and on the way.</div>
      </div>
      <div className="mt-auto bg-surface px-3 pt-2.5 pb-4 shadow-[inset_0_1px_0_#ECEEE8]">
        <div className="flex h-[34px] items-center rounded-full bg-grey-bg px-3 text-[11px] text-[#9A9E95]">Write a message</div>
      </div>
    </>
  );
}
