// W-S4 Loading (shop): category links, hero, category tiles and a product grid.
// Uses the shared Skeleton pulse (the design's shimmer is a custom CSS
// animation, which the build guide doesn't allow).
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

const BAR_WIDTHS = [90, 70, 110, 120, 100, 80];

export function ShopSkeleton() {
  return (
    <LoadingRegion label="Loading the shop">
      <div className="wrap flex h-[52px] items-center gap-7 overflow-hidden">
        {BAR_WIDTHS.map((w, i) => (
          <Skeleton key={i} className="h-3 flex-none" style={{ width: w }} rounded={8} />
        ))}
      </div>
      <div className="wrap pt-4 pb-24">
        <Skeleton className="h-[260px] w-full m:h-[180px]" rounded={24} />
        <div className="mt-9 grid grid-cols-8 gap-4 m:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5">
              <Skeleton className="size-[88px] m:size-16" rounded={22} />
              <Skeleton className="h-3 w-[70px] m:w-14" rounded={8} />
            </div>
          ))}
        </div>
        <div className="mt-11 flex items-center justify-between">
          <Skeleton className="h-6 w-[200px]" rounded={8} />
          <Skeleton className="h-3.5 w-20" rounded={8} />
        </div>
        <div className="mt-5 grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card p-3">
              <Skeleton className="h-[170px] w-full m:h-[110px]" rounded={14} />
              <Skeleton className="mt-3.5 h-3.5 w-3/4" rounded={8} />
              <Skeleton className="mt-2 h-3 w-1/2" rounded={8} />
              <div className="mt-4 flex items-center justify-between gap-2">
                <Skeleton className="h-[18px] w-[72px]" rounded={8} />
                <Skeleton className="h-9 w-24 m:w-14" rounded={10} />
              </div>
            </div>
          ))}
        </div>
        <p className="cap mt-6 text-center">Loading fresh produce near you…</p>
      </div>
    </LoadingRegion>
  );
}
