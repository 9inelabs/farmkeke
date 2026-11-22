// W-84 About Farmkeke
import { BadgeCheck, Heart, Mail, ShieldCheck, Sprout, Star, Store, Tag, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
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

// The people behind Farmkeke (photos in public/team).
const TEAM: { name: string; role: string; bio: string; photo: string }[] = [
  {
    name: "Ejike Daniel Chukwuemeka",
    role: "Founder / CEO",
    bio: "Leads Farmkeke's vision, farmer partnerships and growth across Nigeria.",
    photo: "/team/ejike-daniel.jpg",
  },
  {
    name: "Franklyn Raymond Nobei",
    role: "Co-Founder / CTO",
    bio: "Leads the technology behind Farmkeke's app, website and payments.",
    photo: "/team/franklyn-nobei.jpg",
  },
];

const bodyLg = "m-0 text-base leading-[27px] text-muted m:text-sm m:leading-[22px]";

export default function AboutPage() {
  return (
    <>
      <section className="wrap-site pt-[72px] m:pt-9">
        <FadeUp>
          <div className="grid grid-cols-2 items-end gap-14 m:grid-cols-1 m:gap-3.5">
            <div className="flex flex-col items-start gap-[18px] m:gap-3">
              <Eyebrow icon={Heart}>About Farmkeke</Eyebrow>
              <h1 className={S.h1}>We&apos;re shortening the road from farm to home</h1>
            </div>
            <p className={lead}>
              Farmkeke started in Owerri with a simple idea: the people who grow our food should earn more, and the families
              who buy it should pay less. Today we connect households with verified farmers across Imo State.
            </p>
          </div>
          <div className="relative mt-12 h-[380px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1E3B16_0%,#2F5A22_60%,#A9D654_160%)] m:mt-7 m:h-[300px] m:rounded-[20px]">
            {/* Desktop: a Nigerian market, where a family buys fresh greens straight from the
                woman who grows them, filling the whole panel. Phones: the farmer with her greens. */}
            <div className="absolute inset-0 m:hidden">
              <Image
                src="/photos/market-fresh-greens.jpg"
                alt="A shopper buying fresh greens from a farmer at a Nigerian market"
                fill
                sizes="1136px"
                className="object-cover object-[50%_20%]"
                priority
              />
              {/* Only a soft shade behind the words, so they read on the photo */}
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,8,0.72)_0%,rgba(10,18,8,0.45)_32%,rgba(10,18,8,0)_60%),linear-gradient(0deg,rgba(10,18,8,0.55)_0%,rgba(10,18,8,0)_55%)]" />
            </div>
            <div className="absolute inset-0 hidden m:block">
              <Image
                src="/photos/farmer-greens.jpg"
                alt="A Nigerian farmer arranging fresh amaranth greens at her stall"
                fill
                sizes="100vw"
                className="object-cover object-[50%_10%]"
              />
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,59,22,0.1)_0%,rgba(30,59,22,0.35)_45%,rgba(20,42,14,0.95)_100%)]" />
            </div>
            <a
              href="https://commons.wikimedia.org/wiki/File:A_scene_from_a_nigerian_market.jpg"
              target="_blank"
              rel="noreferrer"
              className="absolute right-4 bottom-3 text-[10.5px] text-white/75 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] hover:text-white m:hidden"
            >
              Photo: Biggiepopa, Wikimedia Commons, CC BY-SA 4.0
            </a>
            <a
              href="https://commons.wikimedia.org/wiki/File:A_woman_arranging_vegetable_(Amaranthus_caudatus).jpg"
              target="_blank"
              rel="noreferrer"
              className="absolute top-3 right-4 hidden text-[10.5px] text-white/75 hover:text-white m:block"
            >
              Photo: Anniwinner, Wikimedia Commons, CC BY-SA 4.0
            </a>
            <div className="absolute bottom-11 left-12 max-w-[520px] text-white m:right-5 m:bottom-5 m:left-5">
              <div className="text-[13px] font-semibold text-lime">Our mission</div>
              <p className="m-0 mt-2 font-display text-[28px] leading-9 font-bold m:mt-1 m:text-lg m:leading-6">
                Fair prices for families. Fair pay for farmers. Fresh food for everyone.
              </p>
            </div>
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site grid grid-cols-2 items-start gap-14 m:grid-cols-1 m:gap-3.5">
          <div className="flex flex-col items-start gap-3.5 m:gap-2.5">
            <Eyebrow icon={Sprout}>Our story</Eyebrow>
            <h2 className={S.h2}>Too many hands between the farm and your table</h2>
          </div>
          <div className="flex flex-col gap-4 m:gap-3">
            <p className={bodyLg}>
              In Nigeria, produce often passes through several traders before it reaches a household. Each one adds a
              markup, and farmers see only a small part of what families pay.
            </p>
            <p className={bodyLg}>
              Farmkeke lets families buy directly from farmers. We check every farm, take payment only once a farm has
              accepted, step in when something goes wrong, and run our own riders, so both sides can trust each other.
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
          <div className="grid grid-cols-3 gap-5 m:grid-cols-1 m:gap-2.5">
            {VALUES.map(([Icon, title, body]) => (
              <div
                key={title}
                className={`${S.card} flex flex-col gap-3.5 p-[30px] m:grid m:grid-cols-[auto_minmax(0,1fr)] m:gap-x-3.5 m:gap-y-1 m:p-4`}
              >
                <Tile icon={Icon} className="m:row-span-2" />
                <h3 className={S.h3}>{title}</h3>
                <p className={para}>{body}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="wrap-site">
          <div className={`${surface} ${S.panel} grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 m:grid-cols-1 m:gap-3`}>
            <div className="flex flex-col items-start gap-3.5 m:gap-2.5">
              <Eyebrow icon={BadgeCheck}>How we check farmers</Eyebrow>
              <h2 className="font-display text-[30px] leading-[38px] font-bold tracking-[-0.02em] m:text-[22px] m:leading-7">
                Every farm is verified before it sells
              </h2>
              <p className={para}>Our team reviews each application by hand, and we keep checking after approval.</p>
            </div>
            <ol className="m-0 flex list-none flex-col p-0">
              {CHECKS.map(([title, body], i) => (
                <li
                  key={title}
                  className={`flex gap-4 py-[18px] m:gap-3 m:py-3 ${i < CHECKS.length - 1 ? "shadow-[inset_0_-1px_0_var(--color-line-soft)]" : ""}`}
                >
                  <span className={`${num} ${i === 3 ? "!bg-lime !text-ink" : ""}`}>{i + 1}</span>
                  <div>
                    <h3 className="m-0 text-[15px] font-semibold m:mt-1 m:text-sm m:leading-5">{title}</h3>
                    <p className="m-0 mt-0.5 text-sm leading-6 text-muted m:text-[13px] m:leading-5">{body}</p>
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
          <ul className="m-0 mx-auto grid max-w-[760px] list-none grid-cols-2 gap-5 p-0 m:grid-cols-1 m:gap-3">
            {TEAM.map((person) => (
              <li key={person.name} className={`${S.card} flex items-start gap-5 p-6 m:gap-4 m:p-4`}>
                <Image
                  src={person.photo}
                  alt={person.name}
                  width={96}
                  height={96}
                  className="size-24 flex-none rounded-full object-cover shadow-[0_0_0_4px_var(--color-lime-soft)] m:size-16"
                />
                <div className="min-w-0">
                  <div className="font-display text-[18px] leading-6 font-bold text-ink m:text-base m:leading-[22px]">{person.name}</div>
                  <div className="mt-2 inline-flex rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-forest">{person.role}</div>
                  <p className="m-0 mt-2.5 text-[13.5px] leading-5 text-muted">{person.bio}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap justify-center gap-3 m:mt-6 m:flex-col m:gap-2.5">
            <Link href={routes.shop} className="btn lime h-12 px-[22px] text-[15px] m:h-11 m:text-sm">
              <Store aria-hidden size={18} strokeWidth={2} />
              Start shopping
            </Link>
            <Link href={routes.contact} className="btn ghost h-12 px-[22px] text-[15px] m:h-11 m:text-sm">
              <Mail aria-hidden size={18} strokeWidth={2} />
              Get in touch
            </Link>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
