// W-82 Pickup locations. The list is server-rendered from areas.listPickupPoints.
import { MapPin, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { PickupFinder, PickupIntro } from "@/components/site/PickupFinder";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/convex/api";
import type { PickupPoint } from "@/convex/returns/site";
import { serverQuery } from "@/convex/server";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Pickup locations",
  description:
    "Find a Farmkeke pickup point near you. Pickup is free, your order waits for 3 days, and you collect it with your 4-digit pickup code.",
};

async function getPickupPoints(): Promise<PickupPoint[] | null> {
  "use cache";
  cacheLife("minutes");
  try {
    const all = (await serverQuery(api.areas.listPickupPoints, {})) as PickupPoint[];
    return all.filter((p) => p.active !== false);
  } catch {
    return null;
  }
}

export default async function PickupLocationsPage() {
  const points = await getPickupPoints();
  return (
    <div className="wrap-site pt-10">
      <FadeUp>
        {points && points.length ? (
          <PickupFinder points={points} />
        ) : (
          <>
            <PickupIntro />
            <div className="mt-8">
              {points ? (
                <EmptyState
                  icon={<MapPin aria-hidden className="size-7" />}
                  title="No pickup points yet"
                  body="We're opening pickup points soon. Until then, you can choose home delivery at checkout."
                  action={
                    <Link href={routes.shop} className="btn lime">
                      Start shopping
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={<RefreshCw aria-hidden className="size-7" />}
                  title="We couldn't load pickup points"
                  body="Please check your connection and refresh the page in a moment."
                  action={
                    <Link href={routes.pickupLocations} className="btn ghost">
                      Try again
                    </Link>
                  }
                />
              )}
            </div>
          </>
        )}
      </FadeUp>
    </div>
  );
}
