// W-81 Buyer protection (was /escrow, which redirects here). Since the
// Paystack split, Farmkeke doesn't hold shoppers' money: you pay only after
// the farm accepts, Paystack sends the farm its share at once, and if
// something's wrong (reported within a day) Farmkeke refunds you.
import {
  ArrowRight,
  Check,
  Clock,
  File,
  Info,
  Lock,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, S, Tile, h3b, lead } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Buyer protection",
  description:
    "You pay only after the farm accepts your order. If something is wrong, report it within a day of delivery and Farmkeke sorts it out, with a refund if you're owed one.",
};

const FLOW: Array<{ icon: LucideIcon; title: string; body: string; box: string; tile?: React.CSSProperties; bodyColor: string }> = [
  {
    icon: ShoppingCart,
    title: "The farm accepts",
    body: "You order, and the farm has 24 hours to accept. You don't pay anything until it does.",
    box: "bg-surface",
    bodyColor: "text-muted",
  },
  {
    icon: Lock,
    title: "You pay securely",
    body: "Pay your bill through Paystack by card, transfer or USSD. Paystack sends the farm its share.",
    box: "bg-forest text-white",
    tile: { background: "rgba(169,214,84,0.18)", color: "#A9D654" },
    bodyColor: "text-on-forest",
  },
  {
    icon: Package,
    title: "You check everything",
    body: "Check every item at your door or at the farm.",
    box: "bg-surface",
    bodyColor: "text-muted",
  },
  {
    icon: ShieldCheck,
    title: "A day to report",
    body: "Something wrong? Report it within a day. If not, your order closes.",
    box: "bg-lime text-ink",
    tile: { background: "rgba(255,255,255,0.5)", color: "#1E3B16" },
    bodyColor: "text-muted",
  },
];

const CASES: Array<[LucideIcon, string, string, string, string]> = [
  [
    Clock,
    "b-ok",
    "Not charged",
    "The farm doesn't accept",
    "Farms have 24 hours to accept. If they don't, the order is cancelled and you haven't paid anything.",
  ],
  [
    TriangleAlert,
    "b-held",
    "We look into it",
    "Something is wrong",
    "Report it within a day of delivery or collection. The farm has 12 hours to reply, and we decide within about a day.",
  ],
  [
    RefreshCw,
    "b-ok",
    "Full or part refund",
    "We decide you're owed money",
    "Farmkeke refunds you: in full, or for the affected items. The delivery fee is refunded only if the whole order is.",
  ],
  [
    Wallet,
    "b-held",
    "3 to 10 working days",
    "Where refunds go",
    "Refunds go back to the card or bank account you paid with. Banks usually take 3 to 10 working days to show them.",
  ],
];

const GOOD_TO_KNOW = [
  "You pay only after the farm accepts, so you're never charged for an order a farm can't fill.",
  "Problems can be reported for a day after your order is delivered or collected. After that, it closes.",
  "Guest orders can only be reported on the device you ordered from, or after adding them to an account.",
  "Card payments are handled by Paystack. Farmkeke never sees your full card number.",
];

export default function BuyerProtectionPage() {
  return (
    <>
      <section className="wrap-site pt-[72px] m:pt-9">
        <FadeUp className={`${S.sechead} !max-w-[760px]`}>
          <Eyebrow icon={ShieldCheck}>Buyer protection</Eyebrow>
          <h1 className={S.h1}>Pay only for what a farm can deliver</h1>
          <p className={lead}>
            You pay only after the farm accepts your order. If anything arrives wrong, report it within a day and
            Farmkeke sorts it out, with a refund if you&apos;re owed one.
          </p>
        </FadeUp>
      </section>

      <section className="wrap-site">
        <FadeUp>
          <ol className={`m-0 grid list-none rounded-[20px] shadow-[inset_0_0_0_1px_var(--color-line)] grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch gap-2 bg-[#F9FBF5] p-8 max-[1000px]:grid-cols-1 m:gap-1 m:rounded-[18px] m:p-2.5`}>
            {FLOW.map((s, i) => (
              <li key={s.title} className="contents">
                {i > 0 ? (
                  <span aria-hidden className="flex items-center justify-center text-[#9AA391] max-[1000px]:h-8 m:h-5">
                    <ArrowRight size={20} strokeWidth={2} className="max-[1000px]:rotate-90 m:size-4" />
                  </span>
                ) : null}
                <div
                  className={`flex flex-col gap-3 rounded-[20px] p-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] m:grid m:grid-cols-[auto_minmax(0,1fr)] m:gap-x-3 m:gap-y-0.5 m:rounded-[14px] m:p-3.5 ${s.box}`}
                >
                  <Tile icon={s.icon} style={s.tile} className="m:row-span-2" />
                  <h2 className="font-display text-base font-bold m:text-[15px] m:leading-5">{s.title}</h2>
                  <div className={`text-sm leading-[21px] m:text-[13px] m:leading-[19px] ${s.bodyColor}`}>{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={S.sechead}>
            <Eyebrow icon={Info}>If something changes</Eyebrow>
            <h2 className={S.h2}>What happens when things don&apos;t go to plan</h2>
            <p className={lead}>Clear rules, so you always know what happens to your money.</p>
          </div>
          <div className="grid grid-cols-4 gap-5 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1 m:gap-2.5">
            {CASES.map(([Icon, tone, badge, title, body]) => (
              <div
                key={title}
                className={`${S.card} flex flex-col gap-3 p-[26px] m:grid m:grid-cols-[auto_minmax(0,1fr)] m:gap-x-3 m:gap-y-1 m:p-4`}
              >
                <div className="flex items-center justify-between m:contents">
                  <Tile icon={Icon} size={40} iconSize={20} className="m:row-span-3" />
                  <span className={`badge ${tone} m:col-start-2 m:justify-self-start`}>{badge}</span>
                </div>
                <h3 className={`${h3b} text-[17px] leading-[25px] m:col-start-2 m:text-[15px] m:leading-[21px]`}>{title}</h3>
                <p className="m-0 text-sm leading-[22px] text-muted m:col-start-2 m:text-[13px] m:leading-[19px]">{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-stretch gap-6 m:grid-cols-1 m:gap-3">
          <div className={`${S.panel} flex items-start gap-5 bg-pend-bg !p-10 m:gap-3 m:!p-4`}>
            <Tile icon={ShieldAlert} style={{ background: "#FFFFFF", color: "#8A5A0B" }} />
            <div>
              <h2 className={`${h3b} text-[22px] leading-[30px] text-[#5E3E08] m:text-[17px] m:leading-6`}>Always pay through Farmkeke</h2>
              <p className="m-0 mt-2 text-[15px] leading-6 text-[#6E4E14] m:mt-1 m:text-[13px] m:leading-5">
                If a farmer asks you to send money to their bank account or pay in cash, say no and report it. Payments made
                outside Farmkeke aren&apos;t protected and can&apos;t be refunded.
              </p>
              <Link
                href={routes.contact}
                className="mt-3.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#5E3E08] hover:text-[#3f2a05] m:mt-1 m:min-h-10 m:text-[13px]"
              >
                <TriangleAlert aria-hidden size={16} strokeWidth={2} />
                Report a suspicious request
              </Link>
            </div>
          </div>
          <div className={`${S.card} p-10 m:p-4`}>
            <h2 className={`${h3b} text-[22px] leading-[30px] m:text-[17px] m:leading-6`}>Good to know</h2>
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-3.5 p-0 m:mt-2.5 m:gap-2.5">
              {GOOD_TO_KNOW.map((t) => (
                <li key={t} className="flex items-start gap-3 m:gap-2.5">
                  <Check aria-hidden size={18} strokeWidth={2.25} className="mt-0.5 flex-none text-ok m:size-4" />
                  <span className="text-[15px] leading-6 text-muted m:text-[13px] m:leading-5">{t}</span>
                </li>
              ))}
            </ul>
            <Link href={routes.legal("refunds")} className="btn sm ghost mt-[22px] px-4 m:mt-4 m:w-full m:text-[13px]">
              <File aria-hidden size={16} strokeWidth={2} />
              Read the refund and dispute policy
            </Link>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
