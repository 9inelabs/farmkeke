import { cacheLife } from "next/cache";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { CookieSettingsButton } from "@/components/system/CookieSettingsButton";
import { routes } from "@/lib/routes";

// Contact email shown in footers. Placeholder until the real inbox is set up
// (see farmkeke-docs/pending-backend/README.md).
export const CONTACT_EMAIL = "info@farmkeke.com";

type Col = { title: string; links: Array<{ href: string; label: string }> };

const SITE_COLUMNS: Col[] = [
  {
    title: "Farmkeke",
    links: [
      { href: routes.about, label: "About" },
      { href: routes.howItWorks, label: "How it works" },
      { href: routes.buyerProtection, label: "Buyer protection" },
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
      { href: routes.legal("delivery"), label: "Delivery policy" },
      { href: routes.legal("acceptable-use"), label: "Acceptable use policy" },
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
      { href: routes.legal("delivery"), label: "Delivery policy" },
      { href: routes.legal("acceptable-use"), label: "Acceptable use policy" },
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
    <div className={wide ? "wrap pt-16 pb-7 m:pt-10 m:pb-6" : "wrap-site pt-[72px] pb-8 m:pt-10 m:pb-6"}>
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-8 m:grid-cols-2 m:gap-x-5 m:gap-y-6">
        <div className="flex flex-col items-start gap-3 m:col-span-2 m:gap-2">
          <Wordmark height={20} tone="light" />
          <p className="m-0 max-w-[280px] text-[13px] leading-5 text-on-forest">From the farm directly to your home.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[13px] font-semibold text-white hover:text-lime">
            {CONTACT_EMAIL}
          </a>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5 m:gap-1.5">
            <div className="text-[13px] font-semibold text-white">{col.title}</div>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="py-0.5 text-[13px] text-on-forest hover:text-white m:py-1">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mt-12 flex justify-between gap-3 pt-5 text-xs text-[#9FB394] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] m:mt-8 m:flex-col m:gap-1 m:pt-4">
        <span>
          © <CopyrightYear /> Farmhaul Technologies Ltd (RC 9920885). Farmkeke is a brand of Farmhaul Technologies Ltd.
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <CookieSettingsButton className="border-0 bg-transparent p-0 text-xs text-[#9FB394] hover:text-white" />
          <span>Made in Owerri, Nigeria</span>
        </span>
      </div>
    </div>
  );
}

/** Footer of the landing and information pages (Main, W-60, W-80 to W-87). */
export function SiteFooter() {
  return (
    <footer className="dark-bar on-dark mt-24 m:mt-14">
      <FooterBody columns={SITE_COLUMNS} wide={false} />
    </footer>
  );
}

/** Footer of the shop pages (W-01 to W-07, W-20). */
export function ShopFooter() {
  return (
    <footer className="dark-bar on-dark mt-24 m:mt-14">
      <FooterBody columns={SHOP_COLUMNS} wide />
    </footer>
  );
}
