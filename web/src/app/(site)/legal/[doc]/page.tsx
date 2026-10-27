// W-87 Legal: terms of use, privacy, refunds and disputes, delivery,
// acceptable use, farmer terms and cookies. A document marked draft shows a notice that it is awaiting approval
// and is not yet in force.
import { ChevronRight, Cookie, File, Info, Lock, Mail, RefreshCw, ShieldCheck, Sprout, TriangleAlert, Truck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OnThisPage, PrintButton } from "@/components/site/LegalClient";
import { FadeUp } from "@/lib/motion";
import { routes, type LegalDoc } from "@/lib/routes";

import acceptableUse from "@/content/legal/acceptable-use.json";
import cookies from "@/content/legal/cookies.json";
import delivery from "@/content/legal/delivery.json";
import farmerTerms from "@/content/legal/farmer-terms.json";
import privacy from "@/content/legal/privacy.json";
import refunds from "@/content/legal/refunds.json";
import { Blocks, inline, type LegalContent } from "@/content/legal/render";
import terms from "@/content/legal/terms.json";

// The wording lives in src/content/legal/*.json (also used for the review PDF)
const DOCS: Record<LegalDoc, LegalContent & { icon: LucideIcon }> = {
  terms: { ...(terms as LegalContent), icon: File },
  privacy: { ...(privacy as LegalContent), icon: Lock },
  refunds: { ...(refunds as LegalContent), icon: RefreshCw },
  delivery: { ...(delivery as LegalContent), icon: Truck },
  "acceptable-use": { ...(acceptableUse as LegalContent), icon: ShieldCheck },
  "farmer-terms": { ...(farmerTerms as LegalContent), icon: Sprout },
  cookies: { ...(cookies as LegalContent), icon: Cookie },
};

const ORDER: LegalDoc[] = ["terms", "privacy", "refunds", "delivery", "acceptable-use", "farmer-terms", "cookies"];
const isDoc = (d: string): d is LegalDoc => (ORDER as string[]).includes(d);

export function generateStaticParams() {
  return ORDER.map((doc) => ({ doc }));
}

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isDoc(doc)) return { title: "Page not found" };
  const d = DOCS[doc];
  return { title: d.draft ? `${d.title} (draft)` : d.title, description: d.description };
}

export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const d = DOCS[doc];

  return (
    <div className="wrap-site pt-10 m:pt-5">
      <nav aria-label="Breadcrumb" className="print:hidden">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px] text-subtle">
          <li>
            <Link href={routes.home} className="text-muted hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight size={14} strokeWidth={2} />
          </li>
          <li>Legal</li>
          <li aria-hidden>
            <ChevronRight size={14} strokeWidth={2} />
          </li>
          <li aria-current="page" className="font-medium text-ink">
            {d.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid grid-cols-[260px_minmax(0,1fr)_220px] items-start gap-8 min-[761px]:max-[1100px]:grid-cols-[240px_minmax(0,1fr)] m:mt-4 m:grid-cols-1 m:gap-3">
        <nav
          aria-label="Legal documents"
          className="sticky top-5 rounded-[20px] bg-surface p-2.5 shadow-[inset_0_0_0_1px_var(--color-line)] m:static m:bg-transparent m:p-0 m:shadow-none print:hidden"
        >
          <ul className="m-swipe m-0 list-none p-0 [--swipe-w:auto] m:!gap-2 m:!pb-1">
            {ORDER.map((key) => {
              const item = DOCS[key];
              const on = key === doc;
              return (
                <li key={key}>
                  <Link
                    href={routes.legal(key)}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-sm m:min-h-9 m:gap-1.5 m:rounded-full m:text-[13px] m:whitespace-nowrap ${
                      on
                        ? "bg-tint font-semibold text-forest m:bg-forest m:text-white"
                        : "font-medium text-ink-3 hover:bg-soft hover:text-ink m:bg-surface m:shadow-[inset_0_0_0_1px_var(--color-line-2)]"
                    }`}
                  >
                    <item.icon aria-hidden size={16} strokeWidth={2} className="flex-none m:size-[14px]" />
                    {item.nav}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <FadeUp>
          <article className="rounded-[20px] bg-surface px-12 py-11 shadow-[inset_0_0_0_1px_var(--color-line)] m:rounded-[18px] m:px-4 m:py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-[36px] leading-[44px] font-extrabold tracking-[-0.03em] m:text-2xl m:leading-[30px]">
                  {d.title}
                </h1>
                <div className="mt-2 text-[13px] leading-4 text-subtle">
                  {d.draft ? `Draft for approval, ${d.updated}. Not yet in force` : `Last updated ${d.updated}`}
                </div>
              </div>
              <PrintButton />
            </div>

            {d.draft ? (
              <div className="mt-6 flex gap-3 rounded-[14px] bg-pend-bg px-5 py-[18px] text-sm leading-[22px] text-[#5E3E08] m:mt-4 m:px-3.5 m:py-3 m:text-[13px] m:leading-5" role="note">
                <TriangleAlert aria-hidden size={18} strokeWidth={2} className="mt-0.5 flex-none text-pend" />
                <span>
                  <strong>Draft: awaiting final approval.</strong> This is the proposed wording. It is not yet in force, and
                  it may change before it is.
                </span>
              </div>
            ) : null}

            <div className={`${d.draft ? "mt-3" : "mt-6"} flex gap-3 rounded-[14px] bg-[#F4F7EE] px-5 py-[18px] text-sm leading-[22px] text-[#2E3A28] m:px-3.5 m:py-3 m:text-[13px] m:leading-5`}>
              <Info aria-hidden size={18} strokeWidth={2} className="mt-0.5 flex-none text-forest" />
              <span>{inline(d.short)}</span>
            </div>

            {d.sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6 pt-7 m:pt-5">
                <h2 id={`${s.id}-h`} className="font-display text-[19px] leading-[26px] font-bold tracking-[-0.01em] m:text-base m:leading-[22px]">
                  {i + 1}. {s.title}
                </h2>
                <Blocks blocks={s.blocks} />
              </section>
            ))}

            <div className="mt-9 flex flex-wrap items-center justify-between gap-4 pt-6 shadow-[inset_0_1px_0_var(--color-line-soft)] m:mt-6 m:gap-2.5 m:pt-4 print:hidden">
              <span className="text-sm leading-6 text-muted">Questions about this policy?</span>
              <Link href={routes.contact} className="btn sm dark px-4">
                <Mail aria-hidden size={16} strokeWidth={2} />
                Contact support
              </Link>
            </div>
          </article>
        </FadeUp>

        <aside className="sticky top-5 max-[1100px]:hidden print:hidden">
          <OnThisPage sections={d.sections.map((s) => ({ id: s.id, title: s.title }))} />
        </aside>
      </div>
    </div>
  );
}
