// Server-safe pieces for paged product lists (W-03, W-04, W-07).
import Link from "next/link";
import { ProductCardSkeleton } from "@/components/shop/ProductCard";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import type { FilterValues } from "./Filters";

type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function filterValues(sp: Sp): FilterValues & { q?: string; tab?: string } {
  return {
    q: one(sp.q),
    tab: one(sp.tab),
    sort: one(sp.sort),
    get: one(sp.get),
    min: one(sp.min),
    max: one(sp.max),
    area: one(sp.area),
  };
}

export const hasFilters = (f: FilterValues) => Boolean(f.get || f.min || f.max || f.area);

export function hrefWith(path: string, values: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/** "Showing 9 of 24", progress bar and a Load more link (works without JavaScript). */
export function LoadMore({ shown, total, href, bar = true }: { shown: number; total: number; href?: string; bar?: boolean }) {
  if (total === 0) return null;
  const pct = Math.min(100, Math.round((shown / total) * 100));
  return (
    <div className="mt-9 flex flex-col items-center gap-3">
      <span className="sm" role="status">
        Showing {shown} of {total}
      </span>
      {bar ? (
        <span aria-hidden className="h-1 w-[220px] rounded bg-[#E3E6DE]">
          <span className="block h-1 rounded bg-forest" style={{ width: `${pct}%` }} />
        </span>
      ) : null}
      {href && shown < total ? (
        <Link href={href} scroll={false} className="btn ghost mt-1.5">
          Load more
        </Link>
      ) : null}
    </div>
  );
}

export function GridSkeleton({ count, cols }: { count: number; cols: 3 | 4 }) {
  return (
    <LoadingRegion label="Loading products">
      <div className={`grid gap-5 m:grid-cols-2 m:gap-3 ${cols === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function HeadingSkeleton() {
  return (
    <div className="mt-4 mb-7 flex flex-col gap-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
  );
}
