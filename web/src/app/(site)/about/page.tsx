// W-84 About Farmkeke
import { BadgeCheck, Heart, Mail, ShieldCheck, Sprout, Star, Store, Tag, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, S, Tile, lead, num, para, surface } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "About",
  description:
    "Farmkeke started in Owerri with a simple idea: the people who grow our food should earn more, and the families who buy it should pay less.",
};

const VALUES: Array<[LucideIcon, string, string]> = [
  [Tag, "Fairness", "Farmers set their own prices. Families pay what the food is worth, not the cost of every middleman."],
  [ShieldCheck, "Trust", "Verified farms, protected payments and honest reviews. No surprises."],
  [Users, "Community", "We hire local riders and support local farmers associations and cooperatives."],
];

const CHECKS: Array<[string, string]> = [
  ["Identity and address", "Government ID and proof of address are checked."],
  ["Farm and association", "Farm photos and a farmers association letter confirm they grow what they sell."],
  ["Call or visit", "We may call the farmer or visit the farm before approving."],
  ["Ongoing reviews", "Ratings and problem reports help us keep standards high."],
];

// Placeholder names, as in the design, until the team details are provided.
const TEAM: Array<[string, string, string]> = [
  ["FN", "[Founder name]", "Founder"],
  ["OP", "[Name]", "Operations and riders"],
  ["FS", "[Name]", "Farmer success"],
  ["CS", "[Name]", "Customer support"],
];

const bodyLg = "m-0 text-base leading-[27px] text-muted";

export default function AboutPage() {
  return (
    <>
      <section className="wrap-site pt-[72px]">
        <FadeUp>
          <div className="grid grid-cols-2 items-end gap-14 m:grid-cols-1 m:gap-6">
            <div className="flex flex-col items-start gap-[18px]">
              <Eyebrow icon={Heart}>About Farmkeke</Eyebrow>
              <h1 className={S.h1}>We&apos;re shortening the road from farm to home</h1>
            </div>
            <p className={lead}>
              Farmkeke started in Owerri with a simple idea: the people who grow our food should earn more, and the families
              who buy it should pay less. Today we connect households with verified farmers across Imo State.
            </p>
          </div>
          <div className="relative mt-12 h-[380px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1E3B16_0%,#2F5A22_60%,#A9D654_160%)] m:h-[340px] m:rounded-[22px]">
            <div aria-hidden className="absolute -top-10 -right-10 size-80 rounded-full bg-[rgba(169,214,84,0.16)]" />
            <div aria-hidden className="absolute right-[120px] -bottom-20 size-[220px] rounded-full bg-white/6" />
            <div className="absolute bottom-11 left-12 max-w-[520px] text-white m:right-5 m:bottom-7 m:left-5">
              <div className="text-[13px] font-semibold text-lime">Our mission</div>
              <p className="m-0 mt-2 font-display text-[28px] leading-9 font-bold m:text-[22px] m:leading-[30px]">
                Fair prices for families. Fair pay for farmers. Fresh food for everyone.
              </p>
            </div>
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-start gap-14 m:grid-cols-1 m:gap-6">
          <div className="flex flex-col items-start gap-3.5">
            <Eyebrow icon={Sprout}>Our story</Eyebrow>
            <h2 className={S.h2}>Too many hands between the farm and your table</h2>
          </div>
          <div className="flex flex-col gap-4">
            <p className={bodyLg}>
              In Nigeria, produce often passes through several traders before it reaches a household. Each one adds a
              markup, and farmers see only a small part of what families pay.
            </p>
            <p className={bodyLg}>
              Farmkeke lets families buy directly from farmers. We check every farm, hold every payment safely until the
              order arrives, and run our own riders, so both sides can trust each other.
            </p>
            <p className={bodyLg}>We&apos;re starting in Owerri and growing one community at a time.</p>
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={S.sechead}>
            <Eyebrow icon={Star}>What we stand for</Eyebrow>
            <h2 className={S.h2}>Our values</h2>
          </div>
          <div className="grid grid-cols-3 gap-5 m:grid-cols-1">
            {VALUES.map(([Icon, title, body]) => (
              <div key={title} className={`${S.card} flex flex-col gap-3.5 p-[30px]`}>
                <Tile icon={Icon} />
                <h3 className={S.h3}>{title}</h3>
                <p className={para}>{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={`${surface} ${S.panel} grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 m:grid-cols-1 m:gap-6`}>
            <div className="flex flex-col items-start gap-3.5">
              <Eyebrow icon={BadgeCheck}>How we check farmers</Eyebrow>
              <h2 className="font-display text-[30px] leading-[38px] font-bold tracking-[-0.02em] m:text-[27px] m:leading-[35px]">
                Every farm is verified before it sells
              </h2>
              <p className={para}>Our team reviews each application by hand, and we keep checking after approval.</p>
            </div>
            <ol className="m-0 flex list-none flex-col p-0">
              {CHECKS.map(([title, body], i) => (
                <li
                  key={title}
                  className={`flex gap-4 py-[18px] ${i < CHECKS.length - 1 ? "shadow-[inset_0_-1px_0_var(--color-line-soft)]" : ""}`}
                >
                  <span className={`${num} ${i === 3 ? "!bg-lime !text-ink" : ""}`}>{i + 1}</span>
                  <div>
                    <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
                    <p className="m-0 mt-0.5 text-sm leading-6 text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={S.sechead}>
            <Eyebrow icon={Users}>The team</Eyebrow>
            <h2 className={S.h2}>The people behind Farmkeke</h2>
          </div>
          <ul className="m-0 grid list-none grid-cols-4 gap-5 p-0 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1">
            {TEAM.map(([ini, name, role]) => (
              <li key={role} className={`${S.card} flex items-center gap-3.5 p-6`}>
                <span
                  aria-hidden
                  className="flex size-14 flex-none items-center justify-center rounded-full bg-lime-soft font-display text-[17px] font-bold text-forest"
                >
                  {ini}
                </span>
                <div>
                  <div className="text-[15px] font-bold">{name}</div>
                  <div className="mt-0.5 text-xs leading-4 text-subtle">{role}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={routes.shop} className="btn lime h-12 px-[22px] text-[15px]">
              <Store aria-hidden size={18} strokeWidth={2} />
              Start shopping
            </Link>
            <Link href={routes.contact} className="btn ghost h-12 px-[22px] text-[15px]">
              <Mail aria-hidden size={18} strokeWidth={2} />
              Get in touch
            </Link>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
