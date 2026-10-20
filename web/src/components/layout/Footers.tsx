import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { routes } from "@/lib/routes";

// Contact email shown in footers. Placeholder until the real inbox is set up
// (see farmkeke-docs/pending-backend/README.md).
export const CONTACT_EMAIL = "hello@farmkeke.com";

type Col = { title: string; links: Array<{ href: string; label: string }> };

const SITE_COLUMNS: Col[] = [
  {
    title: "Farmkeke",
    links: [
      { href: routes.about, label: "About" },
      { href: routes.howItWorks, label: "How it works" },
      { href: routes.escrow, label: "Escrow protection" },
    ],
  },
  {
    title: "Shop",
    links: [
      { href: routes.shop, label: "Shop on the web" },
      { href: routes.findOrder, label: "Find my order" },
      { href: routes.getTheApp, label: "Get the app" },
      { href: routes.help, label: "Help and FAQ" },
    ],
  },
  {
    title: "Farmers",
    links: [
      { href: routes.sell, label: "Sell on Farmkeke" },
      { href: `${routes.sell}#apply`, label: "How to apply" },
      { href: routes.legal("farmer-terms"), label: "Farmer terms" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: routes.legal("terms"), label: "Terms of use" },
      { href: routes.legal("privacy"), label: "Privacy policy" },
      { href: routes.legal("refunds"), label: "Refund and dispute policy" },
      { href: routes.contact, label: "Contact" },
    ],
  },
];

const SHOP_COLUMNS: Col[] = [
  {
    title: "Farmkeke",
    links: [
      { href: routes.about, label: "About" },
      { href: routes.howItWorks, label: "How it works" },
    ],
  },
  {
    title: "Shop",
    links: [
      { href: routes.categories, label: "All categories" },
      { href: routes.findOrder, label: "Find my order" },
      { href: routes.help, label: "Help and FAQ" },
    ],
  },
  {
    title: "Farmers",
    links: [
      { href: routes.sell, label: "Sell on Farmkeke" },
      { href: routes.legal("farmer-terms"), label: "Farmer terms" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: routes.legal("terms"), label: "Terms of use" },
      { href: routes.legal("privacy"), label: "Privacy policy" },
      { href: routes.legal("refunds"), label: "Refund and dispute policy" },
    ],
  },
];

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

function FooterBody({ columns, wide }: { columns: Col[]; wide: boolean }) {
  return (
    <div className={wide ? "wrap pt-14 pb-7" : "wrap-site pt-16 pb-8"}>
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-8 m:grid-cols-2">
        <div className="flex flex-col items-start gap-3 m:col-span-2">
          <Wordmark height={22} />
          <p className="p max-w-[280px]">From the farm directly to your home.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-semibold">
            {CONTACT_EMAIL}
          </a>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5">
            <div className="text-sm font-semibold">{col.title}</div>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="py-0.5 text-sm text-muted hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mt-10 flex justify-between gap-3 pt-5 shadow-[inset_0_1px_0_var(--color-line-soft)] m:flex-col">
        <span className="cap">
          © <CopyrightYear /> Farmkeke. All rights reserved.
        </span>
        <span className="cap">Made in Owerri, Nigeria</span>
      </div>
    </div>
  );
}

/** Footer of the landing and information pages (Main, W-60, W-80 to W-87). */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-surface shadow-[inset_0_1px_0_var(--color-line)]">
      <FooterBody columns={SITE_COLUMNS} wide={false} />
    </footer>
  );
}

/** Footer of the shop pages (W-01 to W-07, W-20). */
export function ShopFooter() {
  return (
    <footer className="mt-24 bg-surface shadow-[inset_0_1px_0_var(--color-line)]">
      <FooterBody columns={SHOP_COLUMNS} wide />
    </footer>
  );
}
