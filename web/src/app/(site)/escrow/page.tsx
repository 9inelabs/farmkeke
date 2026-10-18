// W-81 Escrow (payment protection)
import {
  ArrowRight,
  Banknote,
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
  title: "Payment protection",
  description:
    "Farmkeke holds your payment and only pays the farmer after you confirm your order arrived as expected. This is called escrow.",
};

const FLOW: Array<{ icon: LucideIcon; title: string; body: string; box: string; tile?: React.CSSProperties; bodyColor: string }> = [
  {
    icon: ShoppingCart,
    title: "You pay",
    body: "Pay through Paystack by card, transfer or USSD.",
    box: "bg-surface",
    bodyColor: "text-muted",
  },
  {
    icon: Lock,
    title: "Farmkeke holds it",
    body: "The farm can see you've paid, but can't touch the money yet.",
    box: "bg-forest text-white",
    tile: { background: "rgba(169,214,84,0.18)", color: "#A9D654" },
    bodyColor: "text-on-forest",
  },
  {
    icon: Package,
    title: "You receive it",
    body: "Check every item at your door or the pickup point.",
    box: "bg-surface",
    bodyColor: "text-muted",
  },
  {
    icon: Banknote,
    title: "Farmer is paid",
    body: "You confirm, and the money is released to the farm.",
    box: "bg-lime text-ink",
    tile: { background: "rgba(255,255,255,0.5)", color: "#1E3B16" },
    bodyColor: "text-muted",
  },
];

const CASES: Array<[LucideIcon, string, string, string, string]> = [
  [
    Clock,
    "b-ok",
    "Full refund",
    "The farm doesn't accept",
    "Farms have 24 hours to accept. If they don't, your money goes straight back to you.",
  ],
  [
    TriangleAlert,
    "b-held",
    "Money stays held",
    "Something is wrong",
    "Report it before you confirm. The farm has 12 hours to reply, and we decide within about a day.",
  ],
  [
    RefreshCw,
    "b-ok",
    "Part refund",
    "Only some items had a problem",
    "You're refunded for the affected items. The rest is paid to the farm. The delivery fee isn't refunded.",
  ],
  [
    Wallet,
    "b-held",
    "Original method",
    "Where refunds go",
    "Refunds go back to the card or bank account you paid with. Banks can take a few working days.",
  ],
];

const GOOD_TO_KNOW = [
  "You can only confirm once your order is marked delivered or collected.",
  "Confirming can't be undone, so check everything first.",
  "Guest orders can only be confirmed on the device you ordered from.",
  "Card payments are handled by Paystack. Farmkeke never sees your full card number.",
];

export default function EscrowPage() {
  return (
    <>
      <section className="wrap-site pt-[72px]">
        <FadeUp className={`${S.sechead} !max-w-[760px]`}>
          <Eyebrow icon={ShieldCheck}>Payment protection</Eyebrow>
          <h1 className={S.h1}>Your money is safe until your food arrives</h1>
          <p className={lead}>
            Farmkeke holds your payment and only pays the farmer after you confirm your order arrived as expected. This is
            called escrow.
          </p>
        </FadeUp>
      </section>

      <section className="wrap-site">
        <FadeUp>
          <ol className={`m-0 grid list-none rounded-[20px] shadow-[inset_0_0_0_1px_var(--color-line)] grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch gap-2 bg-[#F9FBF5] p-8 max-[1000px]:grid-cols-1 m:px-4 m:py-5`}>
            {FLOW.map((s, i) => (
              <li key={s.title} className="contents">
                {i > 0 ? (
                  <span aria-hidden className="flex items-center justify-center text-[#9AA391] max-[1000px]:h-8">
                    <ArrowRight size={20} strokeWidth={2} className="max-[1000px]:rotate-90" />
                  </span>
                ) : null}
                <div className={`flex flex-col gap-3 rounded-[20px] p-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] ${s.box}`}>
                  <Tile icon={s.icon} style={s.tile} />
                  <h2 className="font-display text-base font-bold">{s.title}</h2>
                  <div className={`text-sm leading-[21px] ${s.bodyColor}`}>{s.body}</div>
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
            <p className={lead}>Clear rules, so you always know where your money is.</p>
          </div>
          <div className="grid grid-cols-4 gap-5 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1">
            {CASES.map(([Icon, tone, badge, title, body]) => (
              <div key={title} className={`${S.card} flex flex-col gap-3 p-[26px]`}>
                <div className="flex items-center justify-between">
                  <Tile icon={Icon} size={40} iconSize={20} />
                  <span className={`badge ${tone}`}>{badge}</span>
                </div>
                <h3 className={`${h3b} text-[17px] leading-[25px]`}>{title}</h3>
                <p className="m-0 text-sm leading-[22px] text-muted">{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-stretch gap-6 m:grid-cols-1">
          <div className={`${S.panel} flex items-start gap-5 bg-pend-bg !p-10 m:!px-5 m:!py-7`}>
            <Tile icon={ShieldAlert} style={{ background: "#FFFFFF", color: "#8A5A0B" }} />
            <div>
              <h2 className={`${h3b} text-[22px] leading-[30px] text-[#5E3E08]`}>Always pay through Farmkeke</h2>
              <p className="m-0 mt-2 text-[15px] leading-6 text-[#6E4E14]">
                If a farmer asks you to send money to their bank account or pay in cash, say no and report it. Payments made
                outside Farmkeke aren&apos;t protected and can&apos;t be refunded.
              </p>
              <Link
                href={routes.contact}
                className="mt-3.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#5E3E08] hover:text-[#3f2a05]"
              >
                <TriangleAlert aria-hidden size={16} strokeWidth={2} />
                Report a suspicious request
              </Link>
            </div>
          </div>
          <div className={`${S.card} p-10 m:px-5 m:py-7`}>
            <h2 className={`${h3b} text-[22px] leading-[30px]`}>Good to know</h2>
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-3.5 p-0">
              {GOOD_TO_KNOW.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check aria-hidden size={18} strokeWidth={2.25} className="mt-0.5 flex-none text-ok" />
                  <span className="text-[15px] leading-6 text-muted">{t}</span>
                </li>
              ))}
            </ul>
            <Link href={routes.legal("refunds")} className="btn sm ghost mt-[22px] px-4">
              <File aria-hidden size={16} strokeWidth={2} />
              Read the refund and dispute policy
            </Link>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
