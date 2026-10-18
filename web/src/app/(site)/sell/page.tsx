// W-60 Sell on Farmkeke. There is no farmer website: farmers apply in the app.
import {
  Banknote,
  Camera,
  Check,
  CircleHelp,
  ClipboardCheck,
  Clock,
  File,
  House,
  MessageCircle,
  Package,
  ShieldCheck,
  Smartphone,
  Sprout,
  Tag,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoreButtons } from "@/components/brand/StoreButtons";
import { Eyebrow, OkDot, S, Tile, cap, h3b, lead, leadSize, num, para, surface } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Sell on Farmkeke",
  description:
    "Sell your harvest straight to homes. Set your own prices, get orders from households near you, and apply in the Farmkeke app.",
};

const WHY: Array<[LucideIcon, string, string]> = [
  [Users, "More buyers", "Reach households across your city, not just the people who visit your market stall."],
  [Tag, "Your prices", "You decide what to charge for every item and pack size. Change prices any time."],
  [ShieldCheck, "Guaranteed payment", "Buyers pay before you pack. The money is released once they confirm delivery."],
  [Truck, "Delivery handled", "Our riders collect from your farm and deliver to the customer, or to a pickup point."],
];

const FLOW: Array<[string, string]> = [
  ["Receive an order", "You get an alert by push notification and SMS. The buyer has already paid."],
  ["Accept within 24 hours", "If you don't accept in time, the buyer gets a full refund."],
  ["Pack the order", "Mark it as packed and a Farmkeke rider is sent to collect it."],
  ["Rider delivers", "The buyer receives it at home, or collects it from a pickup point."],
  ["Get paid", "Once the buyer confirms, the money goes to your bank account, minus the Farmkeke commission."],
];

const NEEDS: Array<[LucideIcon, string, string]> = [
  [User, "Government ID", "NIN slip, voter's card, driver's licence or international passport"],
  [Camera, "Farm photos", "At least three photos of your farm and produce"],
  [House, "Proof of address", "A recent utility bill or a letter from your community"],
  [File, "Farmers association letter", "A letter from your local farmers association or cooperative"],
  [Banknote, "Bank details for payouts", "An account in your name or your registered farm name"],
];

const APPLY: Array<[string, string]> = [
  ["Download the app", "Create an account with your phone number, email and a password."],
  ["Open Sell on Farmkeke", "Go to Account, then Sell on Farmkeke, and tell us about your farm."],
  ["Upload your documents", "Add photos of each document and your bank details."],
  ["Start selling", "Once approved, farmer mode unlocks and you can list produce."],
];

const QUESTIONS: Array<[string, string]> = [
  [
    "How long does approval take?",
    "Most applications are reviewed within 3 working days. We may call you or visit your farm before approving.",
  ],
  [
    "Can I sell if I farm on a small plot?",
    "Yes. Farmkeke is for farmers of all sizes, as long as you grow what you sell and pass our checks.",
  ],
  [
    "When do I get paid?",
    "As soon as the buyer confirms they received the order. The money is sent to the bank account you registered.",
  ],
  [
    "What if a buyer reports a problem?",
    "You'll get an alert and have 12 hours to reply with your side. Farmkeke then decides the outcome, usually within a day.",
  ],
  ["Can I manage my farm on the website?", "Not yet. Farmers apply, list produce and manage orders in the Farmkeke app."],
];

export default function SellPage() {
  return (
    <>
      <section className="wrap-site pt-7">
        <FadeUp>
          <div
            className={`${S.panel} on-dark grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-center gap-12 bg-forest m:grid-cols-1`}
          >
            <div className="flex flex-col gap-5">
              <Eyebrow icon={Sprout} dark className="self-start">
                For farmers
              </Eyebrow>
              <h1 className={`${S.h1} text-white`}>Sell your harvest straight to homes</h1>
              <p className={`${leadSize} text-on-forest`}>
                Set your own prices, get orders from households near you, and know the buyer has already paid before you
                pack a single item.
              </p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {[
                  "No listing fees. You only pay when you sell",
                  "Buyer's money is secured before you deliver",
                  "Farmkeke riders collect from your farm",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] text-white">
                    <OkDot />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href={routes.getTheApp} className="btn lime h-12 px-[22px] text-[15px]">
                  <Smartphone aria-hidden size={18} strokeWidth={2} />
                  Download the app to apply
                </Link>
                <Link
                  href="#requirements"
                  className="btn h-12 bg-white/10 px-[22px] text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/15 hover:text-white"
                >
                  <ClipboardCheck aria-hidden size={18} strokeWidth={2} />
                  See what you need
                </Link>
              </div>
            </div>
            <figure className="m-0 rounded-[22px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)] m:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cap}>New order</div>
                  <div className="mt-0.5 font-display text-lg font-extrabold">FK-10234</div>
                </div>
                <span className="badge b-pend">
                  <Clock aria-hidden size={13} strokeWidth={2} />
                  Accept within 24h
                </span>
              </div>
              <div className="mt-4 rounded-[14px] bg-[#F7F8F4] px-3.5 py-1.5">
                {[
                  ["Fresh tomatoes × 2", "₦9,000"],
                  ["Scotch bonnet pepper × 1", "₦2,500"],
                ].map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex justify-between gap-3 py-3 text-sm ${i ? "shadow-[inset_0_1px_0_var(--color-line-soft)]" : ""}`}
                  >
                    <span>{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-held-bg px-3.5 py-3 text-[13px] font-medium text-forest">
                <ShieldCheck aria-hidden size={16} strokeWidth={2} />
                ₦11,500 paid and held by Farmkeke
              </div>
              <div aria-hidden className="mt-4 grid grid-cols-2 gap-2.5">
                <span className="btn sm ghost">
                  <X size={16} strokeWidth={2} />
                  Decline
                </span>
                <span className="btn sm lime">
                  <Check size={16} strokeWidth={2} />
                  Accept order
                </span>
              </div>
              <figcaption className={`${cap} mt-3 text-center`}>What a new order looks like in farmer mode</figcaption>
            </figure>
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={S.sechead}>
            <Eyebrow icon={TrendingUp}>Why sell on Farmkeke</Eyebrow>
            <h2 className={S.h2}>Grow your sales without the middlemen</h2>
            <p className={lead}>Farmkeke handles payments, delivery and customer support, so you can focus on growing.</p>
          </div>
          <div className="grid grid-cols-4 gap-5 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1">
            {WHY.map(([Icon, title, body]) => (
              <div key={title} className={`${S.card} flex flex-col gap-3.5 p-7`}>
                <Tile icon={Icon} />
                <h3 className={S.h3}>{title}</h3>
                <p className={para}>{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-start gap-8 m:grid-cols-1">
          <div className={`${S.card} p-10 m:px-5 m:py-7`}>
            <Eyebrow icon={Package}>How selling works</Eyebrow>
            <h2 className="mt-4 font-display text-[28px] leading-9 font-bold tracking-[-0.02em]">
              From new order to money in your bank
            </h2>
            <ol className="m-0 mt-7 list-none p-0">
              {FLOW.map(([title, body], i) => (
                <li key={title} className="relative flex gap-[18px] pb-[26px]">
                  {i < FLOW.length - 1 ? (
                    <span aria-hidden className="absolute top-11 -bottom-1.5 left-[19px] w-0.5 bg-[#DDE3D5]" />
                  ) : null}
                  <span className={`${num} ${i === FLOW.length - 1 ? "!bg-lime !text-ink" : ""}`}>{i + 1}</span>
                  <div className="pt-1.5">
                    <div className="text-base font-semibold">{title}</div>
                    <p className="m-0 mt-1 text-sm leading-6 text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-6">
            <div id="requirements" className={`${S.card} scroll-mt-6 p-8 m:px-5 m:py-7`}>
              <h3 className={S.h3}>What you&apos;ll need to apply</h3>
              <p className="m-0 mt-1.5 text-sm leading-6 text-muted">
                Take clear photos with your phone. Our team checks every application.
              </p>
              <ul className="m-0 mt-2 list-none p-0">
                {NEEDS.map(([Icon, title, body], i) => (
                  <li
                    key={title}
                    className={`flex items-start gap-3.5 py-4 ${i ? "shadow-[inset_0_1px_0_var(--color-line-soft)]" : ""}`}
                  >
                    <Tile icon={Icon} size={40} iconSize={20} />
                    <div>
                      <div className="text-[15px] font-semibold">{title}</div>
                      <div className="mt-0.5 text-sm leading-6 text-muted">{body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${S.card} flex items-start gap-4 p-7`}>
              <Tile icon={Wallet} />
              <div>
                <h3 className={`${h3b} text-[17px] leading-[25px]`}>Simple, fair pricing</h3>
                <p className="m-0 mt-1.5 text-sm leading-6 text-muted">
                  Joining and listing are free. Farmkeke takes a small commission only on completed sales. You&apos;ll see
                  the exact rate before you submit your application.
                </p>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      <section id="apply" className={`${S.sec} scroll-mt-0`}>
        <FadeUp className="wrap-site">
          <div className={`${surface} ${S.panel}`}>
            <div className={`${S.sechead} !mb-9`}>
              <Eyebrow icon={Smartphone}>How to apply</Eyebrow>
              <h2 className={S.h2}>Apply in the Farmkeke app</h2>
              <p className={lead}>
                It takes about 10 minutes. We&apos;ll review your application and let you know by SMS and email.
              </p>
            </div>
            <ol className="m-0 grid list-none grid-cols-4 gap-5 p-0 text-center min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1">
              {APPLY.map(([title, body], i) => (
                <li key={title} className="flex flex-col items-center gap-3">
                  <span className={`${num} ${i === 3 ? "!bg-lime !text-ink" : ""}`}>{i + 1}</span>
                  <div className="text-base font-semibold">{title}</div>
                  <p className="m-0 text-sm leading-6 text-muted">{body}</p>
                </li>
              ))}
            </ol>
            <StoreButtons className="mt-10 justify-center" />
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-14 m:grid-cols-1 m:gap-8">
          <div className="flex flex-col items-start gap-3.5">
            <Eyebrow icon={CircleHelp}>Farmer questions</Eyebrow>
            <h2 className={S.h2}>Before you apply</h2>
            <p className={para}>Still unsure? Talk to our farmer support team.</p>
            <Link href={routes.contact} className="btn ghost mt-1.5 h-12 px-[22px] text-[15px]">
              <MessageCircle aria-hidden size={18} strokeWidth={2} />
              Contact farmer support
            </Link>
          </div>
          <div className={`${S.card} px-8 py-1 m:px-5`}>
            {QUESTIONS.map(([q, a], i) => (
              <div key={q} className={`py-[22px] ${i < QUESTIONS.length - 1 ? "shadow-[inset_0_-1px_0_var(--color-line-soft)]" : ""}`}>
                <h3 className={`${h3b} text-base leading-[25px]`}>{q}</h3>
                <p className={`${para} mt-1.5`}>{a}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>
    </>
  );
}
