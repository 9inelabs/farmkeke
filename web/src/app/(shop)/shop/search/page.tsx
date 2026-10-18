// W-04 Search results and W-04b No results. Server-rendered from ?q= and the
// filter params, so result pages can be indexed and shared.
import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AreaPhrase, ChangeAreaButton } from "@/components/area/AreaBits";
import { CategoryGrid } from "@/components/shop/bits";
import { getPopular, getSearch, getToday, needsLocation, parseFilters, searchArgs, siteUrl } from "@/components/shop/data";
import { filterValues, GridSkeleton, hasFilters, HeadingSkeleton } from "@/components/shop/ListPieces";
import { SearchResultsView } from "@/components/shop/SearchResults";
import { getCategories } from "@/convex/cached";
import { routes } from "@/lib/routes";

const PAGE = 8;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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
    <div className="wrap type-search pt-8">
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
  const [res, today, allCategories] = await Promise.all([getSearch(q, filters), getToday(), getCategories()]);

  if (res.items.length === 0 && res.farms.length === 0 && !hasFilters(current)) return <NoResults q={q} />;

  // W-04 category chips: the chosen one, or the categories among the results.
  const chosen = filters.categorySlug ? allCategories.find((c) => c.slug === filters.categorySlug) : undefined;
  const found = new Map<string, string>();
  for (const i of res.items) if (i.category) found.set(i.category.slug, i.category.name);
  const categories = chosen
    ? [{ slug: chosen.slug, name: chosen.name }]
    : [...found.entries()].slice(0, 3).map(([slug, name]) => ({ slug, name }));

  return (
    <SearchResultsView
      q={q}
      current={current}
      args={searchArgs(q, filters, today)}
      initial={res}
      needsLocation={needsLocation(filters)}
      pageSize={PAGE}
      categories={categories}
    />
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
