// W-03 Category page. Server-rendered; sort and filters come from the URL.
// The results are a client island that adds distances once the shopper's
// area is known (see CategoryResults).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryBar, CategoryBarForSlug } from "@/components/layout/CategoryBar";
import { Breadcrumb } from "@/components/shop/bits";
import { CategoryResults, CategorySummary } from "@/components/shop/CategoryResults";
import { categoryArgs, getCategoryListings, getToday, needsLocation, parseFilters, siteUrl } from "@/components/shop/data";
import { FilterPanel, FilterSidebar, SortSelect } from "@/components/shop/Filters";
import { filterValues, GridSkeleton, HeadingSkeleton } from "@/components/shop/ListPieces";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

const PAGE = 9;
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_OPTIONS = [
  { value: "", label: "Recommended" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "nearest", label: "Nearest farm" },
  { value: "freshest", label: "Freshest first" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryListings(slug, { limit: 1 });
  if (!data) return { title: "Category not found", robots: { index: false } };
  return {
    title: `${data.category.name}: buy fresh from verified farms`,
    description: `Shop ${plural(data.total, "product")} in ${data.category.name} straight from verified Nigerian farmers. Delivery or pickup, with your payment held safely until your order arrives.`,
    alternates: { canonical: `${siteUrl}${routes.category(slug)}` },
  };
}

export default function CategoryPage(props: Props) {
  return (
    <>
      <Suspense fallback={<CategoryBar />}>
        <CategoryBarForSlug params={props.params} />
      </Suspense>
      <div className="wrap pt-7">
        <Suspense
          fallback={
            <>
              <HeadingSkeleton />
              <GridSkeleton count={PAGE} cols={3} />
            </>
          }
        >
          <CategoryContent {...props} />
        </Suspense>
      </div>
    </>
  );
}

async function CategoryContent({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const filters = parseFilters(sp, PAGE);
  const current = filterValues(sp);
  const [data, today] = await Promise.all([getCategoryListings(slug, filters), getToday()]);
  if (!data) notFound();
  const { category } = data;
  const subtypes = category.subtypes ?? [];
  const live = { args: categoryArgs(slug, filters, today), initial: data, needsLocation: needsLocation(filters) };

  return (
    <>
      <Breadcrumb
        items={[
          { href: routes.shop, label: "Shop" },
          { href: routes.categories, label: "All categories" },
          { label: category.name },
        ]}
      />
      <div className="mt-4 mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">{category.name}</h1>
          <CategorySummary {...live} />
        </div>
        <div className="flex items-center gap-2.5">
          <FilterPanel current={current} scope={{ kind: "category", slug }} subtypes={subtypes} trigger="button" />
          <SortSelect value={current.sort} options={SORT_OPTIONS} current={current} />
        </div>
      </div>

      <div className="flex items-start gap-7">
        <FilterSidebar current={current} subtypes={subtypes} />
        <div className="min-w-0 flex-1">
          <CategoryResults {...live} current={current} slug={slug} name={category.name} pageSize={PAGE} subtypes={subtypes} />
        </div>
      </div>
    </>
  );
}
