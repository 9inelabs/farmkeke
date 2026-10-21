// W-87 Legal. "refunds" is the designed Refund and dispute policy; the other four
// documents use the same layout as clearly marked drafts (no binding terms yet).
import { ChevronRight, Cookie, File, Info, Lock, Mail, RefreshCw, Sprout, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OnThisPage, PrintButton } from "@/components/site/LegalClient";
import { FadeUp } from "@/lib/motion";
import { routes, type LegalDoc } from "@/lib/routes";

type Section = { id: string; title: string; body: ReactNode };
type Doc = { title: string; nav: string; icon: LucideIcon; description: string; draft: boolean; short: ReactNode; sections: Section[] };

const P = ({ children }: { children: ReactNode }) => (
  <p className="m-0 mt-2.5 text-[15px] leading-[26px] text-ink-3 m:mt-2 m:text-sm m:leading-[22px]">{children}</p>
);
const UL = ({ items }: { items: ReactNode[] }) => (
  <ul className="m-0 mt-2.5 list-disc pl-5 text-[15px] leading-[26px] text-ink-3 m:mt-2 m:text-sm m:leading-[22px]">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const draftSections = (covers: string[]): Section[] => [
  { id: "s1", title: "What this policy will cover", body: <UL items={covers} /> },
  {
    id: "s2",
    title: "Until it is published",
    body: (
      <P>
        This page is a plain summary, not the final policy. If you have a question about it now, please{" "}
        <Link href={routes.contact} className="font-semibold">
          contact support
        </Link>{" "}
        and we will help.
      </P>
    ),
  },
];

const DOCS: Record<LegalDoc, Doc> = {
  terms: {
    title: "Terms of use",
    nav: "Terms of use",
    icon: File,
    draft: true,
    description: "A summary of what Farmkeke's terms of use will cover. The full terms are being finalised.",
    short: <>These terms will explain how you can use Farmkeke to buy fresh produce, as a guest or with an account.</>,
    sections: draftSections([
      "Who can use Farmkeke, and shopping as a guest or with an account",
      "Placing orders, prices and delivery or pickup",
      "How payments are held by Farmkeke until you confirm your order",
      "Using the website and app fairly and safely",
      "How to contact us about these terms",
    ]),
  },
  privacy: {
    title: "Privacy policy",
    nav: "Privacy policy",
    icon: Lock,
    draft: true,
    description: "A summary of what Farmkeke's privacy policy will cover. The full policy is being finalised.",
    short: <>This policy will explain what information Farmkeke collects, why, and the choices you have.</>,
    sections: draftSections([
      "The details we ask for, such as your name, phone number, email and delivery address",
      "How we use them to deliver your orders, send updates and help with problems",
      "Who sees them: the farm and rider for your order, and Paystack for payments",
      "How long we keep your information",
      "How to see, change or delete your details and your account",
    ]),
  },
  refunds: {
    title: "Refund and dispute policy",
    nav: "Refund and dispute policy",
    icon: RefreshCw,
    draft: false,
    description:
      "How Farmkeke protects your payment, what happens if a farm doesn't accept, how to report a problem, and how refunds are paid.",
    short: (
      <>
        <strong>In short:</strong> Farmkeke holds your payment until you confirm your order. If something goes wrong,
        report it before confirming, and we&apos;ll make it right.
      </>
    ),
    sections: [
      {
        id: "s1",
        title: "Our payment protection",
        body: (
          <>
            <P>
              When you pay for an order, Farmkeke holds the money. The farm is paid only after you confirm that your order
              arrived as expected, or after a problem report is resolved.
            </P>
            <P>
              You can confirm receipt only once your order is marked delivered or collected. Pickup orders wait at the
              farm for 3 days once they are ready.
            </P>
          </>
        ),
      },
      {
        id: "s2",
        title: "If the farm does not accept",
        body: (
          <P>
            Each farm has 24 hours to accept your order. If the farm declines or does not respond in time, the order is
            cancelled and anything you paid for it is refunded in full. Home delivery orders are paid only after the farm
            accepts and the delivery is priced, so you pay nothing for a delivery order the farm declines. If you do not
            pay your delivery bill within 12 hours, the order is cancelled.
          </P>
        ),
      },
      {
        id: "s3",
        title: "Reporting a problem",
        body: (
          <>
            <P>
              If your order is damaged, incomplete, wrong or not as described, report it from your order page before you
              confirm receipt. Please include:
            </P>
            <UL
              items={[
                "which items were affected, and how many",
                "clear photos where possible",
                "a short description of what went wrong",
              ]}
            />
            <P>Once you confirm receipt, the payment is released and the order can no longer be disputed through Farmkeke.</P>
          </>
        ),
      },
      {
        id: "s4",
        title: "How decisions are made",
        body: (
          <P>
            The farm has 12 hours to reply to your report. Farmkeke then reviews the photos, messages and delivery records,
            and usually makes a decision within one day. We will tell you the outcome by SMS and email.
          </P>
        ),
      },
      {
        id: "s5",
        title: "Refund amounts",
        body: (
          <UL
            items={[
              <>
                <strong>Full refund</strong> if the whole order is affected, or the farm does not accept it.
              </>,
              <>
                <strong>Part refund</strong> for the affected items only. The rest of the payment is released to the farm.
              </>,
              "The delivery fee is not refunded for a part refund, because the delivery took place.",
            ]}
          />
        ),
      },
      {
        id: "s6",
        title: "How refunds are paid",
        body: (
          <P>
            Refunds go back to the card or bank account you paid with, through Paystack. Your bank may take up to 7 working
            days to show the refund. You can track it on your order page using the refund reference.
          </P>
        ),
      },
      {
        id: "s7",
        title: "Payments outside Farmkeke",
        body: (
          <P>
            Only payments made through Farmkeke are protected. If a farmer asks you to pay them directly or in cash, please
            refuse and report it to <a href="mailto:support@farmkeke.com">support@farmkeke.com</a>.
          </P>
        ),
      },
    ],
  },
  "farmer-terms": {
    title: "Farmer terms",
    nav: "Farmer terms",
    icon: Sprout,
    draft: true,
    description: "A summary of what Farmkeke's farmer terms will cover. The full terms are being finalised.",
    short: <>These terms will explain how farmers apply, sell and get paid on Farmkeke. All farmer work happens in the app.</>,
    sections: draftSections([
      "Applying in the app (Account, then Sell on Farmkeke) and the documents we check",
      "Listing produce, setting prices and keeping stock up to date",
      "Accepting orders within 24 hours, packing them and handing them to Farmkeke riders",
      "Replying to problem reports within 12 hours",
      "Payouts to your bank account after the buyer confirms, and the Farmkeke commission",
    ]),
  },
  cookies: {
    title: "Cookie policy",
    nav: "Cookie policy",
    icon: Cookie,
    draft: true,
    description: "A summary of what Farmkeke's cookie policy will cover. The full policy is being finalised.",
    short: <>This policy will explain the small files the website saves in your browser, and how to manage them.</>,
    sections: draftSections([
      "What keeps you signed in and remembers your cart and delivery area",
      "Any cookies used to understand how the website is used",
      "How to change your cookie choice or clear saved data in your browser",
    ]),
  },
};

const ORDER: LegalDoc[] = ["terms", "privacy", "refunds", "farmer-terms", "cookies"];
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
                  {d.draft ? "Draft, not yet in force" : "Last updated 17 October 2026"}
                </div>
              </div>
              <PrintButton />
            </div>

            {d.draft ? (
              <div className="mt-6 flex gap-3 rounded-[14px] bg-pend-bg px-5 py-[18px] text-sm leading-[22px] text-[#5E3E08] m:mt-4 m:px-3.5 m:py-3 m:text-[13px] m:leading-5" role="note">
                <TriangleAlert aria-hidden size={18} strokeWidth={2} className="mt-0.5 flex-none text-pend" />
                <span>
                  <strong>Draft: this policy is being finalised.</strong> Below is a plain summary of what it will cover. It is
                  not the final wording.
                </span>
              </div>
            ) : null}

            <div className={`${d.draft ? "mt-3" : "mt-6"} flex gap-3 rounded-[14px] bg-[#F4F7EE] px-5 py-[18px] text-sm leading-[22px] text-[#2E3A28] m:px-3.5 m:py-3 m:text-[13px] m:leading-5`}>
              <Info aria-hidden size={18} strokeWidth={2} className="mt-0.5 flex-none text-forest" />
              <span>{d.short}</span>
            </div>

            {d.sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6 pt-7 m:pt-5">
                <h2 id={`${s.id}-h`} className="font-display text-[19px] leading-[26px] font-bold tracking-[-0.01em] m:text-base m:leading-[22px]">
                  {i + 1}. {s.title}
                </h2>
                {s.body}
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
