"use client";

// W-04 Search results: heading, Products/Farms tabs, the filter chip row,
// "Farms selling …" and the grid. Server-rendered from the location-free
// result, then asked again with the shopper's position so farm distances
// show and the distance filter and Nearest sort work.
import { MapPin, Sprout } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { FarmSummary, SearchResults as SearchData } from "@/convex/returns/storefront";
import { areaPicker } from "@/lib/area";
import { plural } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { FarmAvatar, ratingText } from "./bits";
import { FilterPanel, SortSelect, type FilterValues } from "./Filters";
import type { searchArgs } from "./filters-shared";
import { GridSkeleton, hasFilters, hrefWith, LoadMore } from "./ListPieces";
import { distanceText, useLive, useShopper } from "./live";
import { ProductCard } from "./ProductCard";

const SORT_OPTIONS = [
  { value: "", label: "Best match" },
  { value: "price_low", label: "Price: low to high" },
  { value: "nearest", label: "Nearest farm" },
];

export function SearchResultsView({
  q,
  current,
  args,
  initial,
  needsLocation,
  pageSize,
  categories,
}: {
  q: string;
  current: FilterValues & { q?: string; tab?: string };
  args: ReturnType<typeof searchArgs>;
  initial: SearchData;
  needsLocation: boolean;
  pageSize: number;
  categories: Array<{ slug: string; name: string }>;
}) {
  const { data, status } = useLive(api.storefront.search, args, initial, needsLocation);
  const { chosen } = useShopper();
  const onFarms = current.tab === "farms";
  const tabHref = (tab?: string) => hrefWith(routes.search(), { ...current, q, tab });
  const tabCls = (on: boolean) =>
    `inline-flex h-11 items-center rounded-[9px] px-4 text-sm font-semibold d:h-9 ${
      on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted hover:text-ink"
    }`;
  const total = data?.total;
  const farmTotal = data ? (data.farmTotal ?? data.farms.length) : undefined;
  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Results for “{q}”</h1>
          {data ? (
            <p className="p mt-1">
              {plural(data.total, "product")} and {plural(farmTotal ?? 0, "farm")}
              {chosen ? ` near ${chosen.name}` : ""}
            </p>
          ) : status === "needs-area" ? (
            <p className="p mt-1">Choose your delivery area to see farms near you</p>
          ) : (
            <Skeleton className="mt-1.5 h-5 w-72 max-w-full" />
          )}
        </div>
        <nav aria-label="Result type" className="flex w-max gap-1 rounded-xl bg-tabs p-1">
          <Link href={tabHref()} aria-current={!onFarms ? "page" : undefined} className={tabCls(!onFarms)} scroll={false}>
            Products{count(total)}
          </Link>
          <Link href={tabHref("farms")} aria-current={onFarms ? "page" : undefined} className={tabCls(onFarms)} scroll={false}>
            Farms{count(farmTotal)}
          </Link>
        </nav>
      </div>

      {onFarms ? (
        <section className="mt-6" aria-label="Farms">
          {!data ? (
            status === "needs-area" ? (
              <NeedsArea />
            ) : (
              <Skeleton className="h-[68px] w-full" rounded={14} />
            )
          ) : data.farms.length ? (
            <FarmRows farms={data.farms} q={q} />
          ) : (
            <p className="p card px-6 py-8 text-center">No farm names match “{q}”. Try the Products tab.</p>
          )}
        </section>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterPanel current={current} scope={{ kind: "search", text: q }} trigger="chips" categories={categories} />
            <span className="flex-1" />
            <SortSelect value={current.sort} options={SORT_OPTIONS} current={current} className="m:hidden" compact />
          </div>

          {status === "needs-area" ? (
            <NeedsArea className="mt-6" />
          ) : !data ? (
            <div className="mt-6">
              <GridSkeleton count={pageSize} cols={4} />
            </div>
          ) : (
            <>
              {data.farms.length ? (
                <section className="card mt-6 px-6 py-5 m:px-4" aria-labelledby="farms-selling">
                  <div className="mb-3.5 flex items-center justify-between">
                    <h2 id="farms-selling" className="h2 text-base">
                      Farms selling {q}
                    </h2>
                    <Link href={tabHref("farms")} className="inline-flex min-h-11 items-center text-sm font-semibold">
                      See all {farmTotal}
                    </Link>
                  </div>
                  <FarmRows farms={data.farms.slice(0, 3)} q={q} />
                </section>
              ) : null}

              {data.items.length ? (
                <>
                  <div className="mt-6 grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
                    {data.items.map((p, i) => (
                      <ProductCard key={p.id} item={p} priority={i < 4} />
                    ))}
                  </div>
                  <LoadMore
                    shown={data.items.length}
                    total={data.total}
                    bar={false}
                    href={hrefWith(routes.search(), { ...current, q, show: String(data.items.length + pageSize) })}
                  />
                </>
              ) : (
                <EmptyState
                  className="mt-6"
                  icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
                  title={hasFilters(current) ? "No products match these filters" : `No products match “${q}”`}
                  body="Try a wider price range, a longer harvest window, a bigger distance, or both delivery and pickup."
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
      )}
    </>
  );
}

function NeedsArea({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<MapPin aria-hidden className="size-7" strokeWidth={1.6} />}
      title="Choose your area first"
      body="Distances to farms are measured from your delivery area. Choose it to see the closest farms."
      action={
        <m.button type="button" className="btn lime" onClick={areaPicker.open} aria-haspopup="dialog" {...pressable}>
          <MapPin aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Choose your area
        </m.button>
      }
    />
  );
}

/** "4.8 ★ · 4 km · 14 tomato listings" */
function farmLine(f: FarmSummary, q: string) {
  const parts: string[] = [];
  const rating = ratingText(f.rating);
  parts.push(rating ? `${rating} ★` : "No reviews yet");
  const dist = distanceText(f.distanceKm);
  if (dist) parts.push(dist);
  if (f.matchCount) parts.push(plural(f.matchCount, `${q.toLowerCase()} listing`));
  else if (f.productCount !== undefined) parts.push(plural(f.productCount, "product"));
  return parts.join(" · ");
}

function FarmRows({ farms, q }: { farms: FarmSummary[]; q: string }) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 m:grid-cols-1">
      {farms.map((f) => (
        <li key={f.id} className="flex">
          <Link href={routes.farm(f.id)} className="flex w-full items-center gap-3 rounded-[14px] bg-soft p-3 text-ink hover:text-ink">
            <FarmAvatar id={f.id} name={f.name} photoUrl={f.photoUrl} size={44} textClass="text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{f.name}</div>
              <div className="cap">{farmLine(f, q)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
