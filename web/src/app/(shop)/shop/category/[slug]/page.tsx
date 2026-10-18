// W-03 Category page. Server-rendered; sort and filters come from the URL.
import { Sprout } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryBar, CategoryBarForSlug } from "@/components/layout/CategoryBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumb } from "@/components/shop/bits";
import { getCategoryListings, getFarmAreas, parseFilters, siteUrl } from "@/components/shop/data";
import { ActiveChips, FilterPanel, FilterSidebar, SortSelect } from "@/components/shop/Filters";
import {
  filterValues,
  GridSkeleton,
  hasFilters,
  HeadingSkeleton,
  hrefWith,
  LoadMore,
} from "@/components/shop/ListPieces";
import { ProductCard } from "@/components/shop/ProductCard";
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
  const [data, areas] = await Promise.all([getCategoryListings(slug, filters), getFarmAreas()]);
  if (!data) notFound();
  const { category, items, total } = data;
  const filtered = hasFilters(current);

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
          <p className="p mt-1">{plural(total, "product")} from verified farms</p>
        </div>
        <div className="flex items-center gap-2.5">
          <FilterPanel current={current} areas={areas} scope={{ kind: "category", slug }} trigger="button" />
          <SortSelect value={current.sort} options={SORT_OPTIONS} current={current} />
        </div>
      </div>

      <div className="flex items-start gap-7">
        <FilterSidebar current={current} areas={areas} />
        <div className="min-w-0 flex-1">
          <ActiveChips current={current} total={total} />
          {items.length ? (
            <>
              <div className="grid grid-cols-3 gap-5 m:grid-cols-2 m:gap-3">
                {items.map((p, i) => (
                  <ProductCard key={p.id} item={p} priority={i < 3} />
                ))}
              </div>
              <LoadMore
                shown={items.length}
                total={total}
                href={hrefWith(routes.category(slug), { ...current, show: String(items.length + PAGE) })}
              />
            </>
          ) : filtered ? (
            <EmptyState
              icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
              title="No products match these filters"
              body="Try a wider price range, another farm area, or both delivery and pickup."
              action={
                <ButtonLink href={routes.category(slug)} variant="ghost">
                  Clear all filters
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
              title={`Nothing in ${category.name} right now`}
              body="Farms add new harvests every day. Have a look at another category in the meantime."
              action={
                <ButtonLink href={routes.categories} variant="ghost">
                  All categories
                </ButtonLink>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
