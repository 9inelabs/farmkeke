// W-04 Search results and W-04b No results. Server-rendered from ?q= and the
// filter params, so result pages can be indexed and shared.
import { SearchX, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AreaPhrase, ChangeAreaButton } from "@/components/area/AreaBits";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryGrid, FarmAvatar } from "@/components/shop/bits";
import { getFarmAreas, getPopular, getSearch, parseFilters, siteUrl } from "@/components/shop/data";
import { FilterPanel, SortSelect } from "@/components/shop/Filters";
import {
  filterValues,
  GridSkeleton,
  hasFilters,
  HeadingSkeleton,
  hrefWith,
  LoadMore,
} from "@/components/shop/ListPieces";
import { ProductCard } from "@/components/shop/ProductCard";
import { getCategories } from "@/convex/cached";
import type { FarmSummary } from "@/convex/returns/storefront";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

const PAGE = 8;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SORT_OPTIONS = [
  { value: "", label: "Best match" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = filterValues(await searchParams).q?.trim();
  return {
    title: q ? `Results for “${q}”` : "Search",
    description: q ? `Fresh ${q} from verified farms on Farmkeke.` : "Search fresh produce and farms on Farmkeke.",
    alternates: { canonical: `${siteUrl}${routes.search(q)}` },
    // Filtered and sorted variations shouldn't compete with the plain result page.
    robots: { index: Boolean(q), follow: true },
  };
}

export default function SearchPage(props: Props) {
  return (
    <div className="wrap pt-8">
      <Suspense
        fallback={
          <>
            <HeadingSkeleton />
            <GridSkeleton count={PAGE} cols={4} />
          </>
        }
      >
        <SearchContent {...props} />
      </Suspense>
    </div>
  );
}

async function SearchContent({ searchParams }: Props) {
  const sp = await searchParams;
  const current = filterValues(sp);
  const q = current.q?.trim() ?? "";
  if (!q) return <NoQuery />;
  const filters = parseFilters(sp, PAGE);
  const [res, areas] = await Promise.all([getSearch(q, filters), getFarmAreas()]);
  const { items, farms, total } = res;

  if (items.length === 0 && farms.length === 0 && !hasFilters(current)) return <NoResults q={q} />;

  const onFarms = current.tab === "farms";
  const tabHref = (tab?: string) => hrefWith(routes.search(), { ...current, q, tab });
  const tabCls = (on: boolean) =>
    `inline-flex h-11 items-center rounded-[9px] px-4 text-sm font-semibold ${
      on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted hover:text-ink"
    }`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Results for “{q}”</h1>
          <p className="p mt-1">
            {plural(total, "product")} and {plural(farms.length, "farm")}
            <AreaPhrase before=" near " />
          </p>
        </div>
        <nav aria-label="Result type" className="flex w-max gap-1 rounded-xl bg-tabs p-1">
          <Link
            href={tabHref()}
            aria-current={!onFarms ? "page" : undefined}
            className={tabCls(!onFarms)}
            scroll={false}
          >
            Products ({total})
          </Link>
          <Link
            href={tabHref("farms")}
            aria-current={onFarms ? "page" : undefined}
            className={tabCls(onFarms)}
            scroll={false}
          >
            Farms ({farms.length})
          </Link>
        </nav>
      </div>

      {onFarms ? (
        <section className="mt-6" aria-label="Farms">
          {farms.length ? (
            <FarmRows farms={farms} />
          ) : (
            <p className="p card px-6 py-8 text-center">No farm names match “{q}”. Try the Products tab.</p>
          )}
        </section>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterPanel current={current} areas={areas} scope={{ kind: "search", text: q }} trigger="chips" />
            <span className="flex-1" />
            <SortSelect value={current.sort} options={SORT_OPTIONS} current={current} className="m:hidden" />
          </div>

          {farms.length ? (
            <section className="card mt-6 px-6 py-5 m:px-4" aria-labelledby="farms-selling">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 id="farms-selling" className="h2 text-base">
                  Farms selling {q}
                </h2>
                {farms.length > 3 ? (
                  <Link href={tabHref("farms")} className="inline-flex min-h-11 items-center text-sm font-semibold">
                    See all {farms.length}
                  </Link>
                ) : null}
              </div>
              <FarmRows farms={farms.slice(0, 3)} />
            </section>
          ) : null}

          {items.length ? (
            <>
              <div className="mt-6 grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
                {items.map((p, i) => (
                  <ProductCard key={p.id} item={p} priority={i < 4} />
                ))}
              </div>
              <LoadMore
                shown={items.length}
                total={total}
                bar={false}
                href={hrefWith(routes.search(), { ...current, q, show: String(items.length + PAGE) })}
              />
            </>
          ) : (
            <EmptyState
              className="mt-6"
              icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
              title="No products match these filters"
              body="Try a wider price range, another farm area, or both delivery and pickup."
              action={
                <ButtonLink href={routes.search(q)} variant="ghost">
                  Clear all filters
                </ButtonLink>
              }
            />
          )}
        </>
      )}
    </>
  );
}

function FarmRows({ farms }: { farms: FarmSummary[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 m:grid-cols-1">
      {farms.map((f) => (
        <li key={f.id} className="flex">
          <Link
            href={routes.farm(f.id)}
            className="flex w-full items-center gap-3 rounded-[14px] bg-soft p-3 text-ink hover:text-ink"
          >
            <FarmAvatar id={f.id} name={f.name} photoUrl={f.photoUrl} size={44} textClass="text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{f.name}</div>
              <div className="cap">{f.area}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function NoResults({ q }: { q: string }) {
  const [categories, popular] = await Promise.all([getCategories(), getPopular()]);
  const tries = popular
    .map((p) => p.name)
    .filter((n, i, all) => all.indexOf(n) === i && n.toLowerCase() !== q.toLowerCase())
    .slice(0, 3);
  return (
    <div className="pt-4">
      <section className="card flex flex-col items-center gap-4 px-8 py-14 text-center m:px-5">
        <span className="tile size-[72px] rounded-[22px]">
          <SearchX aria-hidden className="size-8" strokeWidth={1.6} />
        </span>
        <h1 className="h1">No results for “{q}”</h1>
        <p className="p max-w-[520px]">
          No farm
          <AreaPhrase before=" near " /> is selling this right now. Check the spelling, try a more general word, or
          browse a category below.
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <span className="sm">Try:</span>
          {tries.map((t) => (
            <Link key={t} href={routes.search(t)} className="chip">
              {t}
            </Link>
          ))}
          <Link href={routes.categories} className="chip">
            All categories
          </Link>
        </div>
        <ChangeAreaButton className="mt-2" />
      </section>
      <CategoriesSection categories={categories} />
    </div>
  );
}

async function NoQuery() {
  const categories = await getCategories();
  return (
    <div className="pt-4">
      <h1 className="h1">Search Farmkeke</h1>
      <p className="p mt-1">Type a product or farm name in the search box above, like tomatoes, yam or eggs.</p>
      <CategoriesSection categories={categories} />
    </div>
  );
}

function CategoriesSection({ categories }: { categories: Awaited<ReturnType<typeof getCategories>> }) {
  if (!categories.length) return null;
  return (
    <section className="mt-12" aria-labelledby="browse-cats">
      <h2 id="browse-cats" className="h2 mb-[18px]">
        Browse categories
      </h2>
      <CategoryGrid categories={categories} />
    </section>
  );
}
