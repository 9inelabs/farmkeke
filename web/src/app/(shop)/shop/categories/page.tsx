// W-02 All categories. Server-rendered with a product count and the
// subtypes (catalog.listCategoriesWithCounts) per category.
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb, CategoryIcon } from "@/components/shop/bits";
import { getCategoriesWithCounts, siteUrl } from "@/components/shop/data";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "All categories",
  description: "Fresh produce from verified farms, sorted the way you shop.",
  alternates: { canonical: `${siteUrl}${routes.categories}` },
};

export default async function AllCategories() {
  const categories = await getCategoriesWithCounts();
  return (
    <>
      <CategoryBar active={routes.categories} />
      <div className="wrap pt-7">
        <Breadcrumb items={[{ href: routes.shop, label: "Shop" }, { label: "All categories" }]} />
        <div className="mt-4 mb-8">
          <h1 className="h1">All categories</h1>
          <p className="p mt-1.5">Fresh produce from verified farms, sorted the way you shop.</p>
        </div>

        <ul className="m-0 grid list-none grid-cols-4 gap-5 p-0 m:grid-cols-1">
          {categories.map((c) => (
            <li key={c._id} className="flex">
              <Link
                href={routes.category(c.slug)}
                className="card flex w-full flex-col gap-4 p-6 text-ink hover:text-ink hover:shadow-[inset_0_0_0_1.5px_var(--color-lime)]"
              >
                <span className="tile size-[42px] rounded-xl">
                  <CategoryIcon illustration={c.illustration} className="size-[22px]" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="h3">{c.name}</h2>
                  <div className="cap mt-0.5">{plural(c.productCount, "product")}</div>
                </div>
                {c.subtypes.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {c.subtypes.map((s) => (
                      <span key={s.slug} className="rounded-lg bg-canvas px-[9px] py-1 text-xs font-medium text-ink-3">
                        {s.name}
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        <div className="card mt-8 flex flex-wrap items-center gap-4 px-7 py-6 m:px-5">
          <div className="min-w-[240px] flex-1">
            <h2 className="h3">Can&apos;t find what you need?</h2>
            <p className="sm mt-1">Search by product or farm name, or ask our support team.</p>
          </div>
          <ButtonLink href={routes.search()} variant="dark">
            Search products
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
