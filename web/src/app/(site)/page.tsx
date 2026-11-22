// W-00 Landing page, redesigned Nov 2026 (canvas "Farmkeke landing redesign"):
// a dark forest hero with the app on a phone and floating cards, a trust
// strip, a feature bento, shoppers, how it works, farmers, the app, FAQ.
// The site header sits transparently over the hero (SiteHeader).
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CircleHelp,
  Download,
  LayoutGrid,
  Leaf,
  MapPin,
  MessageCircle,
  Package,
  Plus,
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
import Image from "next/image";
import Link from "next/link";
import { StoreButtons } from "@/components/brand/StoreButtons";
import { QrCode } from "@/components/site/QrCode";
import { Eyebrow, L } from "@/components/site/ui";
import { Accordion } from "@/components/ui/Accordion";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: { absolute: "Farmkeke · From the farm directly to your home" },
  description:
    "Farmkeke connects households with verified Nigerian farmers. Shop fresh produce at fair prices, pay only after the farm accepts, and get a refund if anything is wrong.",
};

const FAQS = [
  {
    q: "How am I protected when I buy?",
    a: "You pay through Paystack only after the farm accepts your order. If it arrives damaged, incomplete or wrong, report it within 24 hours of delivery or collection and Farmkeke refunds you, even if the farm has already been paid.",
  },
  {
    q: "Do I need an account to buy?",
    a: "No. Check out as a guest with your name and phone number. After ordering you can save your details as an account, and your earlier orders are linked to it.",
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
    a: "Report it from your order page within 24 hours of delivery or collection, with photos. The farm has 12 hours to reply, and Farmkeke usually decides within a day. Refunds go back to the card or account you paid with.",
  },
  {
    q: "How do I become a Farmkeke farmer?",
    a: "Download the app, go to Account, then Sell on Farmkeke, and submit your application with the required documents. Our team reviews every application.",
  },
];

const TRUST: Array<[LucideIcon, string, string]> = [
  [BadgeCheck, "Verified farmers", "Every farm checked by our team"],
  [ShieldCheck, "Buyer protection", "Refunded if something's wrong"],
  [Truck, "Farmkeke riders", "Our own team delivers"],
  [MapPin, "Pickup at the farm", "Collect within 3 days, no fee"],
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
  ["The farm accepts, then you pay", "One bill, paid securely with Paystack."],
  ["Receive your order", "At your door, or collected from the farm."],
  ["Covered for 24 hours", "If anything is wrong, report it and we refund you."],
];

const APPLY: Array<[string, string]> = [
  ["Download the Farmkeke app", "Sign up with your phone number."],
  ["Go to Account, then Sell on Farmkeke", "Tell us about your farm and what you grow."],
  ["Add your NIN, farm photos and bank account", "At least three clear photos of your farm."],
  ["Get approved and start selling", "Our team reviews every application."],
];

const NEEDS = ["Mobile number", "NIN", "Farm location", "3+ farm photos", "Bank account in your name"];

const PRICES: Array<[string, string, string, string]> = [
  ["Fresh tomatoes", "₦4,500", "basket", "linear-gradient(135deg,#F9DCD2,#F2BFAE)"],
  ["Yam tubers", "₦5,500", "tuber", "linear-gradient(135deg,#EFE6CF,#DCCDA6)"],
  ["Ugwu leaves", "₦800", "bunch", "linear-gradient(135deg,#E4F2C7,#C9E58F)"],
];

const FARM_PERKS: Array<[LucideIcon, string, string]> = [
  [Tag, "Your prices", "You set the price for every pack you sell."],
  [ShieldCheck, "Paid by Paystack", "Your share goes straight to your bank."],
  [Truck, "We deliver", "Farmkeke riders collect from your farm."],
];

const CHECKS = ["Phone and NIN", "Farm location", "Farm photos", "Bank details"];

const float = "absolute z-[2] rounded-2xl bg-surface p-4 text-left text-ink shadow-[0_18px_40px_rgba(0,0,0,0.28)]";
const sub = "m-0 text-sm leading-[22px] text-muted";
const cardTitle = "m-0 font-display text-lg font-semibold tracking-[-0.01em] m:text-base";

export default function Landing() {
  return (
    <div className="-mb-24 bg-surface pb-24 m:-mb-14 m:pb-14">
      {/* Hero */}
      <section id="top" className="dark-surface on-dark overflow-hidden pt-[76px] m:pt-[60px]">
        <div aria-hidden className="grid-lines" />
        <FadeUp className="wrap-site flex flex-col items-center gap-[18px] pt-16 text-center m:gap-3.5 m:pt-9">
          <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-lime/8 px-3.5 text-xs font-medium text-on-forest-lime shadow-[inset_0_0_0_1px_rgba(169,214,84,0.35)] m:h-7 m:text-[11px]">
            <span className="size-1.5 rounded-full bg-lime" />
            Fresh from verified Nigerian farms
          </span>
          <h1 className={`${L.h1} m-0 max-w-[780px] text-white`}>
            From the farm, directly to your <span className="lime-text">home</span>
          </h1>
          <p className="m-0 max-w-[540px] text-base leading-[26px] text-white/72 m:text-sm m:leading-[22px]">
            Shop fresh produce from verified farmers at fair prices. You pay only after the farm accepts, and we refund you if anything is wrong.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5 m:mt-1 m:w-full m:flex-col">
            <Link href="#download" className="btn lime h-[46px] px-[22px] shadow-[0_8px_24px_rgba(169,214,84,0.25)] m:h-12">
              <Download aria-hidden size={18} strokeWidth={1.75} />
              Download the app
            </Link>
            <Link
              href={routes.shop}
              className="btn h-[46px] px-[22px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)] hover:bg-white/8 hover:text-white m:h-12"
            >
              Shop on the web
              <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
            </Link>
          </div>
        </FadeUp>

        {/* The app on a phone, with floating cards (decorative) */}
        <div aria-hidden className="relative mx-auto mt-14 flex h-[470px] max-w-[1000px] justify-center m:mt-9 m:h-[380px]">
          <div className={`${float} top-10 left-5 w-[230px] m:top-10 m:left-3 m:w-[150px] m:rounded-[14px] m:p-2.5`}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-tint text-forest m:hidden">
                <ShieldCheck size={18} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-xs text-muted-2 m:text-[10px]">Your bill is ready</div>
                <div className="font-display text-lg font-bold text-forest m:text-[15px]">₦12,300</div>
              </div>
            </div>
            <div className="mt-2.5 text-xs leading-[17px] text-ink-3 m:mt-0.5 m:text-[10px] m:leading-[14px]">
              You pay only once the farm has accepted your order.
            </div>
          </div>

          <div className={`${float} top-[230px] left-20 flex w-[240px] items-center gap-3 m:hidden`}>
            <span className="flex size-10 items-center justify-center rounded-full bg-[#E8EEE6] text-[13px] font-semibold text-forest shadow-[inset_0_0_0_2px_var(--color-forest)]">
              OF
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[13px] font-semibold">
                Okafor Family Farms <BadgeCheck size={14} strokeWidth={2} className="text-success" />
              </div>
              <div className="text-xs text-muted-2">New Owerri · Verified farm</div>
            </div>
          </div>

          <div className={`${float} top-[30px] right-5 w-[250px] m:top-[150px] m:right-3 m:w-[150px] m:rounded-[14px] m:p-2.5`}>
            <div className="flex items-center justify-between m:hidden">
              <span className="text-xs text-muted-2">FK-10234</span>
              <span className="badge b-fresh h-[22px] text-[11px]">Out for delivery</span>
            </div>
            <div className="mt-2 text-[13px] font-semibold m:mt-0 m:text-[11px]">Your rider is on the way</div>
            <div className="mt-2.5 flex gap-1 m:mt-2">
              <span className="h-1 flex-1 rounded bg-lime" />
              <span className="h-1 flex-1 rounded bg-lime" />
              <span className="h-1 flex-1 rounded bg-lime" />
              <span className="h-1 flex-1 rounded bg-sunk" />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-2 m:hidden">
              <span>Paid</span>
              <span>Packed</span>
              <span>On the way</span>
              <span>Delivered</span>
            </div>
          </div>

          <div className={`${float} top-[220px] right-[90px] flex w-[220px] items-center gap-3 m:hidden`}>
            <span className="lime-panel flex size-11 items-center justify-center rounded-xl text-forest">
              <Leaf size={18} strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold">Ugwu leaves</div>
              <div className="text-xs text-muted-2">
                <b className="text-forest">₦800</b> per bunch
              </div>
            </div>
            <span className="flex size-7 items-center justify-center rounded-full bg-forest text-white">
              <Plus size={14} strokeWidth={2} />
            </span>
          </div>

          <HeroPhone />
        </div>
        {/* Fades the whole hero into the white page below, edge to edge (it used to
            sit inside the 1000px phone area, so wide screens showed hard dark sides) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[220px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0.92)_78%,#fff_100%)] m:h-[120px]"
        />
      </section>

      {/* Trust strip */}
      <section aria-label="Why shoppers trust Farmkeke" className="wrap-site pt-2 pb-[72px] m:pb-12">
        <ul className="m-0 grid list-none grid-cols-4 gap-px overflow-hidden rounded-[20px] bg-[#ECEDE8] p-0 shadow-[0_0_0_1px_#ECEDE8] m:grid-cols-2 m:rounded-[18px]">
          {TRUST.map(([Icon, title, text]) => (
            <li key={title} className="flex items-center gap-3 bg-surface px-6 py-[22px] m:flex-col m:items-start m:gap-2 m:px-3.5 m:py-4">
              <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-tint text-forest m:size-8">
                <Icon aria-hidden size={18} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-sm font-semibold m:text-[13px]">{title}</div>
                <div className="text-xs text-muted-2">{text}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* What is Farmkeke: bento */}
      <section aria-labelledby="why-h" className="wrap-site pb-24 m:pb-14">
        <FadeUp>
          <div className="mx-auto mb-10 flex max-w-[560px] flex-col items-center gap-3 text-center m:mb-6 m:items-start m:text-left">
            <Eyebrow icon={Sprout}>What is Farmkeke</Eyebrow>
            <h2 id="why-h" className={`${L.h2} m-0`}>
              A fairer way to buy fresh food
            </h2>
            <p className={sub}>We connect households with the farmers who grow their food, and keep every payment safe until the order arrives.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1 m:gap-3">
            <div className="soft-panel flex flex-col gap-5 p-7 m:rounded-[20px] m:p-5">
              <div>
                <h3 className={cardTitle}>Fair prices, straight from the farm</h3>
                <p className={`${sub} mt-1.5`}>Buy from the people who grow your food, without market markups along the way.</p>
              </div>
              <div aria-hidden className="flex flex-col gap-3 rounded-2xl bg-surface p-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between text-xs text-muted-2">
                  <span>Today at Okafor Family Farms</span>
                  <span className="m:hidden">Picked today</span>
                </div>
                {PRICES.map(([name, price, unit, bg], i) => (
                  <div key={name} className={`flex items-center gap-3 ${i > 0 ? "pt-3 shadow-[inset_0_1px_0_#F0F0F0]" : ""}`}>
                    <span className="size-9 flex-none rounded-[10px]" style={{ background: bg }} />
                    <span className="flex-1 text-[13px] font-medium">{name}</span>
                    <span className="text-xs text-muted-2">
                      <b className="text-sm text-forest">{price}</b> / {unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="soft-panel flex flex-col gap-5 p-7 m:rounded-[20px] m:p-5">
              <div>
                <h3 className={cardTitle}>You&apos;re protected on every order</h3>
                <p className={`${sub} mt-1.5`}>You pay through Paystack only after the farm accepts. If anything is wrong, report it within 24 hours and we refund you.</p>
              </div>
              <div aria-hidden className="rounded-2xl bg-surface p-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-2">Order FK-10234</span>
                  <span className="font-display text-xl font-bold text-forest">₦12,300</span>
                </div>
                <ol className="m-0 mt-3.5 flex list-none flex-col gap-2.5 p-0 text-[13px]">
                  {["Farm accepted your order", "Paid securely with Paystack", "Delivered to your door"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-forest text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {t}
                    </li>
                  ))}
                  <li className="-mx-2.5 flex items-center gap-2.5 rounded-[10px] bg-tint px-2.5 py-2 font-semibold text-forest">
                    <span className="size-5 rounded-full shadow-[inset_0_0_0_2px_var(--color-forest)]" />
                    Something wrong? Report it within 24 hours
                  </li>
                </ol>
              </div>
            </div>

            <div className="soft-panel col-span-2 flex flex-wrap items-center gap-8 bg-[radial-gradient(60%_120%_at_100%_0%,rgba(169,214,84,0.28)_0%,rgba(169,214,84,0)_60%),linear-gradient(180deg,#F6F7F3_0%,#F0F2EC_100%)] p-8 m:col-span-1 m:gap-5 m:rounded-[20px] m:p-5">
              <div className="flex flex-[1_1_320px] flex-col gap-2.5">
                <h3 className={`${cardTitle} text-[22px] leading-[1.25] m:text-base`}>Every farm is verified before it can sell</h3>
                <p className={`${sub} max-w-[380px]`}>
                  Each farm sends its NIN, location, farm photos and bank details, and our team approves it before a single listing goes live.
                </p>
                <Link href={routes.sell} className="mt-1.5 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold">
                  How farms are checked <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
                </Link>
              </div>
              <div aria-hidden className="flex flex-[1_1_420px] flex-wrap justify-end gap-3.5 m:hidden">
                <div className="max-w-[280px] flex-[1_1_220px] rounded-2xl bg-surface p-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <div className="mb-2.5 text-xs text-muted-2">Farm checks</div>
                  <div className="flex flex-col gap-[9px] text-[13px]">
                    {CHECKS.map((c) => (
                      <div key={c} className="flex justify-between">
                        <span>{c}</span>
                        <span className="font-semibold text-ok">Checked</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-3 rounded-2xl bg-forest p-[18px] text-white shadow-[0_12px_30px_rgba(30,59,22,0.25)]">
                  <span className="flex size-11 items-center justify-center rounded-full bg-lime/18 text-lime">
                    <BadgeCheck size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Okafor Family Farms</div>
                    <div className="text-xs text-on-forest">Approved · New Owerri</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* For shoppers */}
      <section id="shoppers" aria-labelledby="shop-h" className="bg-[#F7F8F5] py-24 m:py-12">
        <FadeUp className="wrap-site">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5 m:mb-5 m:gap-2">
            <div className="flex max-w-[520px] flex-col items-start gap-3">
              <Eyebrow icon={ShoppingBasket} className="bg-surface">
                For shoppers
              </Eyebrow>
              <h2 id="shop-h" className={`${L.h2} m-0`}>
                Everything you need to shop fresh
              </h2>
            </div>
            <p className={`${sub} max-w-[380px]`}>Shop in the app or on the web. You don&apos;t need an account to place your first order.</p>
          </div>
          <ul className="m-0 grid list-none grid-cols-3 gap-3.5 p-0 m:grid-cols-1 m:gap-2">
            {SHOPPERS.map(([Icon, title, text], i) => (
              <li
                key={title}
                className={`flex flex-col gap-3.5 rounded-[20px] p-6 m:flex-row m:items-start m:gap-3 m:rounded-2xl m:p-4 ${
                  i === 0 ? "lime-panel" : "bg-surface shadow-[inset_0_0_0_1px_#ECEDE8]"
                }`}
              >
                <span
                  className={`flex size-10 flex-none items-center justify-center rounded-xl m:size-9 ${
                    i === 0 ? "bg-forest text-lime" : "bg-tint text-forest"
                  }`}
                >
                  <Icon aria-hidden size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className={`m-0 text-[15px] font-semibold m:text-sm ${i === 0 ? "text-forest-ink" : ""}`}>{title}</h3>
                  <p className={`m-0 mt-1 text-[13px] leading-5 m:mt-0.5 m:text-xs m:leading-[18px] ${i === 0 ? "text-[#2E3A28]" : "text-muted"}`}>
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </FadeUp>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-h" className="wrap-site py-[104px] m:py-14">
        <FadeUp className="flex flex-wrap items-center gap-16 m:gap-6">
          <div className="flex flex-[1_1_380px] justify-center m:order-2">
            <div
              aria-hidden
              className="lime-orb flex aspect-square w-[420px] max-w-full items-end justify-center overflow-hidden rounded-full m:w-[280px]"
            >
              <div className="-mb-10 h-[380px] w-[236px] rounded-[38px] bg-[#0D0D0D] p-2 shadow-[0_30px_60px_rgba(30,59,22,0.35)] m:[zoom:0.72]">
                <div className="flex size-full flex-col overflow-hidden rounded-[30px] bg-[#F7F7F5] text-left">
                  <OrderScreen />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-[1_1_420px] flex-col gap-3.5">
            <Eyebrow icon={ArrowRight} className="self-start">
              How it works
            </Eyebrow>
            <h2 id="how-h" className={`${L.h2} m-0`}>
              Four simple steps, start to finish
            </h2>
            <p className={sub}>From choosing your produce to your doorstep, every step is clear.</p>
            <ol className="m-0 mt-4 list-none p-0">
              {STEPS.map(([title, text], i) => (
                <li key={title} className={`flex gap-4 py-3.5 ${i < STEPS.length - 1 ? "shadow-[inset_0_-1px_0_#EEEFEA]" : ""}`}>
                  <span className="w-7 font-display text-[13px] font-semibold text-forest">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="text-[15px] font-semibold m:text-sm">{title}</div>
                    <div className="mt-0.5 text-[13px] text-muted m:text-xs">{text}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </FadeUp>
      </section>

      {/* For farmers */}
      <section id="farmers" aria-labelledby="farm-h" className="wrap-site pb-[104px] m:pb-14">
        <FadeUp>
          <div className="overflow-hidden rounded-[32px] bg-surface shadow-[0_0_0_1px_#E7EAE2,0_30px_80px_rgba(16,35,11,0.10)] m:rounded-3xl">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] max-[900px]:grid-cols-1">
              {/* The farmer, on a soft lime field, with what her phone tells her */}
              <div className="relative min-h-[520px] overflow-hidden bg-[radial-gradient(70%_60%_at_50%_45%,#F4FAE6_0%,#E6F2CC_60%,#D9EBB4_100%)] max-[900px]:min-h-[380px] m:min-h-[320px]">
                <div aria-hidden className="absolute -top-16 -left-16 size-56 rounded-full bg-lime/30 blur-3xl" />
                <div aria-hidden className="absolute -right-10 -bottom-20 size-64 rounded-full bg-[#BFE07A]/40 blur-3xl" />
                <Image
                  src="/illustrations/farmer-harvest.jpg"
                  alt="A Farmkeke farmer holding a basket of fresh tomatoes, greens and sweet potatoes"
                  width={1024}
                  height={1024}
                  sizes="(max-width: 900px) 90vw, 520px"
                  className="absolute inset-x-0 bottom-[-6%] mx-auto w-[108%] max-w-none mix-blend-multiply max-[900px]:w-[78%] m:w-[100%]"
                />
                <div className="absolute top-8 left-8 flex w-[230px] items-center gap-3 rounded-2xl bg-white/92 p-3.5 shadow-[0_18px_40px_rgba(16,35,11,0.14)] backdrop-blur-sm m:top-4 m:left-4 m:w-[190px] m:p-2.5">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-forest text-lime m:size-8">
                    <Bell aria-hidden size={16} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-muted-2">New order · FK-10251</div>
                    <div className="truncate text-[13px] font-semibold text-ink m:text-xs">2 baskets of tomatoes</div>
                  </div>
                </div>
                <div className="absolute right-8 bottom-10 flex w-[240px] items-center gap-3 rounded-2xl bg-forest p-3.5 text-white shadow-[0_18px_40px_rgba(16,35,11,0.28)] m:right-4 m:bottom-5 m:w-[200px] m:p-2.5">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-lime text-forest m:size-8">
                    <Check aria-hidden size={18} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] text-on-forest-lime">Paid to your bank</div>
                    <div className="font-display text-lg font-bold m:text-base">₦17,100</div>
                  </div>
                </div>
              </div>

              {/* The pitch */}
              <div className="dark-surface on-dark flex flex-col justify-center gap-4 bg-[radial-gradient(60%_70%_at_100%_0%,rgba(169,214,84,0.22)_0%,rgba(169,214,84,0)_70%),linear-gradient(160deg,#10230B_0%,#1E3B16_100%)] px-14 py-14 max-[900px]:px-8 m:gap-3 m:px-5 m:py-8">
                <div aria-hidden className="grid-lines opacity-60" />
                <Eyebrow icon={Sprout} dark className="self-start">
                  For farmers
                </Eyebrow>
                <h2 id="farm-h" className={`${L.h2} m-0 text-white`}>
                  Sell your harvest to homes <span className="lime-text">across Nigeria</span>
                </h2>
                <p className="m-0 max-w-[460px] text-[15px] leading-6 text-on-forest m:text-sm m:leading-[22px]">
                  List your produce in the Farmkeke app. We find the buyers, take the payment and deliver for you. You just grow and pack.
                </p>
                <ul className="m-0 mt-1 grid list-none grid-cols-3 gap-2.5 p-0 m:grid-cols-1 m:gap-2">
                  {FARM_PERKS.map(([Icon, title, text]) => (
                    <li key={title} className="rounded-2xl bg-white/6 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] m:flex m:items-center m:gap-3 m:p-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-lime/16 text-lime m:flex-none">
                        <Icon aria-hidden size={18} strokeWidth={1.75} />
                      </span>
                      <div className="mt-3 m:mt-0">
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-0.5 text-xs leading-[18px] text-on-forest">{text}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2.5 m:mt-1 m:flex-col">
                  <Link href={`${routes.home}#download`} className="btn lime h-12 px-6 shadow-[0_10px_28px_rgba(169,214,84,0.25)]">
                    Download the app to apply
                    <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
                  </Link>
                  <Link
                    href={routes.sell}
                    className="btn h-12 px-6 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)] hover:bg-white/8 hover:text-white"
                  >
                    Learn about selling
                  </Link>
                </div>
              </div>
            </div>

            {/* How to apply, and what you need */}
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 px-14 py-10 max-[900px]:grid-cols-1 max-[900px]:px-8 m:gap-6 m:px-5 m:py-7">
              <div>
                <h3 className="m-0 font-display text-[17px] font-semibold m:text-[15px]">How to apply</h3>
                <ol className="m-0 mt-4 grid list-none grid-cols-4 gap-4 p-0 max-[900px]:grid-cols-2 m:grid-cols-1 m:gap-3">
                  {APPLY.map(([title, text], i) => (
                    <li key={title} className="flex flex-col gap-2 m:flex-row m:gap-3">
                      <span
                        className={`flex size-7 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                          i === APPLY.length - 1 ? "bg-forest text-lime" : "bg-tint text-forest"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold m:text-[13px]">{title}</div>
                        <div className="mt-0.5 text-xs leading-[18px] text-muted-2">{text}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl bg-[#F6F8F2] p-5 m:p-4">
                <h3 className="m-0 text-xs font-semibold tracking-[0.04em] text-muted-2 uppercase">You&apos;ll need</h3>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                  {NEEDS.map((n) => (
                    <li key={n} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-3 text-xs shadow-[inset_0_0_0_1px_#E7EAE2]">
                      <Check aria-hidden size={12} strokeWidth={2.5} className="text-success" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* The app */}
      <section id="download" aria-labelledby="app-h" className="overflow-hidden bg-[#F7F8F5] pt-24 m:pt-12">
        <FadeUp className="wrap-site flex flex-wrap items-center gap-12 m:gap-4">
          <div className="flex flex-[1_1_400px] flex-col gap-3.5 pb-24 m:gap-3 m:pb-0">
            <Eyebrow icon={Smartphone} className="self-start bg-surface">
              The Farmkeke app
            </Eyebrow>
            <h2 id="app-h" className={`${L.h2} m-0`}>
              Fresh produce, a tap away
            </h2>
            <p className={`${sub} max-w-[420px]`}>The fastest way to shop, follow your orders and chat with farmers. Free on iPhone and Android.</p>
            <StoreButtons className="mt-2.5 m:mt-1 m:w-full" />
            <div className="mt-[18px] flex items-center gap-3.5 self-start rounded-2xl bg-surface p-3 shadow-[inset_0_0_0_1px_#ECEDE8] m:hidden">
              <QrCode size={84} />
              <div className="max-w-[150px] text-xs leading-[18px] text-muted">Scan with your phone camera to get the app</div>
            </div>
          </div>
          <div aria-hidden className="flex flex-[1_1_400px] justify-center self-end">
            <div className="relative flex h-[420px] w-[460px] max-w-full items-end justify-center m:h-[300px]">
              <div className="lime-orb absolute -bottom-[150px] left-1/2 size-[460px] -translate-x-1/2 rounded-full m:-bottom-[130px] m:size-[340px]" />
              <div className="relative -mb-10 h-[400px] w-[250px] rounded-t-[40px] bg-[#0D0D0D] px-[9px] pt-[9px] shadow-[0_30px_60px_rgba(30,59,22,0.3)] m:-mb-2.5 m:[zoom:0.74]">
                <div className="flex size-full flex-col overflow-hidden rounded-t-[32px] bg-[#F7F7F5] text-left">
                  <ChatScreen />
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="wrap-site pt-[104px] m:pt-14">
        <FadeUp className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14 m:grid-cols-1 m:gap-5">
          <div className="flex flex-col items-start gap-3.5 m:gap-3">
            <Eyebrow icon={CircleHelp}>FAQ</Eyebrow>
            <h2 id="faq-h" className={`${L.h2} m-0`}>
              Questions, answered
            </h2>
            <p className={sub}>Can&apos;t find what you&apos;re looking for? Our team usually replies within a few hours.</p>
            <div className="mt-2.5 flex w-full max-w-[320px] flex-col gap-1.5 rounded-[18px] bg-[#F7F8F5] p-[18px] text-[13px] m:hidden">
              <span className="text-muted-2">Call or WhatsApp</span>
              <a href="tel:+2348160404686" className="text-[15px] font-semibold text-ink hover:text-forest">
                +234 816 040 4686
              </a>
              <Link href={routes.contact} className="font-semibold">
                Contact support
              </Link>
            </div>
          </div>
          <Accordion className="rounded-[20px]" items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
          <Link href={routes.contact} className="btn ghost hidden h-11 m:inline-flex">
            Contact support
          </Link>
        </FadeUp>
      </section>
    </div>
  );
}

/* The app on a phone in the hero: a screenshot of the app's Home (decorative). */
function HeroPhone() {
  return (
    <Image
      src="/hero/app-home.png"
      alt=""
      width={720}
      height={1391}
      priority
      sizes="(max-width: 760px) 250px, 330px"
      className="relative z-[1] h-auto w-[330px] self-start drop-shadow-[0_40px_60px_rgba(0,0,0,0.45)] m:w-[250px]"
    />
  );
}

function OrderScreen() {
  return (
    <div className="flex flex-col px-3.5 pt-[26px]">
      <div className="font-display text-sm font-bold">Order FK-10234</div>
      <div className="mt-0.5 text-[11px] text-muted-2">Okafor Family Farms · 3 items</div>
      <div className="mt-3.5 flex flex-col">
        {[
          ["Farm accepted", "9:12 am", "done"],
          ["Paid with Paystack", "9:20 am", "done"],
          ["Out for delivery", "Rider Emeka · 11:05 am", "now"],
          ["Delivered", "", "next"],
        ].map(([title, when, state], i, all) => (
          <div key={title} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span
                className={`size-4 flex-none rounded-full ${
                  state === "done" ? "bg-forest" : state === "now" ? "bg-lime shadow-[0_0_0_4px_var(--color-lime-soft)]" : "shadow-[inset_0_0_0_2px_#DCDCDC]"
                }`}
              />
              {i < all.length - 1 ? <span className={`min-h-[22px] w-0.5 flex-1 ${state === "done" ? "bg-forest" : "bg-sunk"}`} /> : null}
            </div>
            <div className={`pb-2.5 text-[11px] ${state === "next" ? "text-muted-2" : ""}`}>
              <b className={state === "next" ? "text-ink-3" : ""}>{title}</b>
              {when ? <div className="text-muted-2">{when}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-[38px] items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-white">
        It&apos;s arrived
      </div>
    </div>
  );
}

function ChatScreen() {
  const me = "max-w-[80%] self-end rounded-[14px_14px_4px_14px] bg-forest px-[11px] py-2 text-white";
  const them = "max-w-[80%] self-start rounded-[14px_14px_14px_4px] bg-surface px-[11px] py-2 shadow-[inset_0_0_0_1px_#EDEDED]";
  return (
    <>
      <div className="flex items-center gap-2.5 bg-surface px-3.5 pt-[26px] pb-3 shadow-[inset_0_-1px_0_#EDEDED]">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#E8EEE6] text-[10px] font-semibold text-forest shadow-[inset_0_0_0_2px_var(--color-forest)]">
          OF
        </span>
        <div>
          <div className="text-xs font-semibold">Okafor Family Farms</div>
          <div className="text-[10px] text-muted-2">About order FK-10234</div>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3.5 text-[11px] leading-4">
        <div className={me}>Are the tomatoes from this morning&apos;s harvest?</div>
        <div className={them}>Yes, picked at 6am. Packing your order now.</div>
        <div className={me}>Perfect, thank you!</div>
        <div className="self-start rounded-xl bg-tint px-[11px] py-2 font-semibold text-forest">Order packed · rider on the way</div>
      </div>
    </>
  );
}
