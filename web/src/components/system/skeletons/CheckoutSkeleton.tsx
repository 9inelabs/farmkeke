// W-S4 Loading (checkout): the step bar, the form card and the summary.
import { NARROW_WRAP } from "@/components/layout/SimpleHeaders";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export function CheckoutStepSkeleton() {
  return (
    <LoadingRegion label="Loading checkout">
      <div className={`${NARROW_WRAP} pt-8`}>
        <Skeleton className="h-[26px] w-[520px] max-w-full" />
        <div className="mt-7 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-7 m:grid-cols-1">
          <Skeleton className="h-[460px] w-full" rounded={20} />
          <Skeleton className="h-[320px] w-full" rounded={20} />
        </div>
      </div>
    </LoadingRegion>
  );
}
