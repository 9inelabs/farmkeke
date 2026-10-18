"use client";

// W-03 Category: the result line ("86 products from 21 farms delivering to
// Owerri North"), the active filter chips and the grid. Server-rendered from
// the location-free result, then asked again with the shopper's position so
// distances show and the distance filter and Nearest sort work.
import { MapPin, Sprout } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { CategoryListings, Subtype } from "@/convex/returns/storefront";
import { areaPicker } from "@/lib/area";
import { plural } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { ActiveChips, type FilterValues } from "./Filters";
import type { categoryArgs } from "./filters-shared";
import { GridSkeleton, hasFilters, hrefWith, LoadMore } from "./ListPieces";
import { useLive, useShopper } from "./live";
import { ProductCard } from "./ProductCard";

type Props = {
  args: ReturnType<typeof categoryArgs>;
  initial: CategoryListings;
  needsLocation: boolean;
};

function useCategory({ args, initial, needsLocation }: Props) {
  return useLive(api.storefront.categoryListings, args, initial as CategoryListings | null, needsLocation);
}

export function CategorySummary(props: Props) {
  const { data, status } = useCategory(props);
  const { chosen } = useShopper();
  if (status === "needs-area") return <p className="p mt-1">Choose your delivery area to see farms near you</p>;
  if (!data) return <Skeleton className="mt-1.5 h-5 w-80 max-w-full" />;
  const farms = data.farmCount;
  return (
    <p className="p mt-1">
      {plural(data.total, "product")} from {farms === undefined ? "verified farms" : plural(farms, "farm")}
      {chosen ? ` delivering to ${chosen.name}` : ""}
    </p>
  );
}

export function CategoryResults({
  current,
  slug,
  name,
  pageSize,
  subtypes,
  ...props
}: Props & { current: FilterValues; slug: string; name: string; pageSize: number; subtypes: Subtype[] }) {
  const { data, status } = useCategory(props);

  if (status === "needs-area") {
    return (
      <>
        <ActiveChips current={current} subtypes={subtypes} />
        <EmptyState
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
      </>
    );
  }
  if (!data) {
    return (
      <>
        <ActiveChips current={current} subtypes={subtypes} />
        <GridSkeleton count={pageSize} cols={3} />
      </>
    );
  }

  const { items, total } = data;
  return (
    <>
      <ActiveChips current={current} total={total} subtypes={subtypes} />
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
            href={hrefWith(routes.category(slug), { ...current, show: String(items.length + pageSize) })}
          />
        </>
      ) : hasFilters(current) ? (
        <EmptyState
          icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
          title="No products match these filters"
          body="Try a wider price range, a longer harvest window, a bigger distance, or both delivery and pickup."
          action={
            <ButtonLink href={routes.category(slug)} variant="ghost">
              Clear all filters
            </ButtonLink>
          }
        />
      ) : (
        <EmptyState
          icon={<Sprout aria-hidden className="size-7" strokeWidth={1.6} />}
          title={`Nothing in ${name} right now`}
          body="Farms add new harvests every day. Have a look at another category in the meantime."
          action={
            <ButtonLink href={routes.categories} variant="ghost">
              All categories
            </ButtonLink>
          }
        />
      )}
    </>
  );
}
