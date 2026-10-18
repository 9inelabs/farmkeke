// W-S4 Loading (account): the account menu and a page of cards.
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export function AccountSkeleton() {
  return (
    <LoadingRegion label="Loading your account">
      <div className="wrap grid grid-cols-[260px_minmax(0,1fr)] items-start gap-7 pt-8 m:grid-cols-1">
        <div className="card flex flex-col gap-2 p-2.5 m:hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" rounded={10} />
          ))}
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <div className="grid grid-cols-3 gap-4 m:grid-cols-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[112px] w-full" rounded={18} />
            ))}
          </div>
          <Skeleton className="h-[220px] w-full" rounded={18} />
        </div>
      </div>
    </LoadingRegion>
  );
}
