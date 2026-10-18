// W-S1 Page not found. Handles notFound() and every unmatched URL (status 404;
// Next.js also adds noindex).
import { House, Package, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SystemHeader } from "@/components/layout/SimpleHeaders";
import { ButtonLink } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

// Labels as in the design; slugs from catalog.listCategories.
const chips = [
  { label: "Vegetables", slug: "vegetables" },
  { label: "Fruits", slug: "fruits" },
  { label: "Poultry and eggs", slug: "poultry-eggs" },
];

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-canvas">
      <SystemHeader />
      <main
        id="main"
        tabIndex={-1}
        className="wrap-site flex flex-col items-center pt-[72px] pb-16 text-center outline-none"
      >
        <div aria-hidden className="mont text-[120px] leading-[120px] font-extrabold tracking-[-0.04em] text-[#DCE6CB]">
          404
        </div>
        <span className="tile mt-2 size-16 rounded-[20px]" aria-hidden>
          <Search className="size-[30px]" />
        </span>
        <h1 className="h1 mt-6 max-w-[640px] text-[40px] leading-[48px]">We can&apos;t find that page</h1>
        <p className="mt-3 max-w-[540px] text-lg leading-[29px] text-muted m:text-base m:leading-[26px]">
          The link may be old, or the page may have moved. Try searching, or head back to the shop.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href={routes.shop} variant="lime" icon={<Store aria-hidden className="size-[18px]" />} className="min-h-12 px-[22px]">
            Go to the shop
          </ButtonLink>
          <ButtonLink href={routes.home} variant="ghost" icon={<House aria-hidden className="size-[18px]" />} className="min-h-12 px-[22px]">
            Farmkeke home
          </ButtonLink>
        </div>
        <form action={routes.search()} role="search" className="mt-7 w-[520px] max-w-full">
          <label className="flex h-[52px] items-center gap-2.5 rounded-[14px] bg-surface pr-1.5 pl-4 text-faint shadow-[inset_0_0_0_1px_var(--color-line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--color-forest)]">
            <Search aria-hidden className="size-[18px] flex-none" strokeWidth={2} />
            <input
              type="search"
              name="q"
              placeholder="Search produce or farms"
              aria-label="Search Farmkeke"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint focus-visible:outline-none"
            />
            <button type="submit" className="btn sm dark">
              Search
            </button>
          </label>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <Link key={c.slug} className="chip" href={routes.category(c.slug)}>
              {c.label}
            </Link>
          ))}
          <Link className="chip" href={routes.findOrder}>
            <Package aria-hidden className="size-3.5" />
            Find my order
          </Link>
        </div>
      </main>
    </div>
  );
}
