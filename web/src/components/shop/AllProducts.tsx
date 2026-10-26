"use client";

// W-01 "See all" (Fresh Picks): every product on Farmkeke, newest first. The
// first page comes from the server; "Show more" asks storefront.collection
// for more. Category chips above go to each category's page to filter.
import { useQuery } from "convex/react";
import { useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/api";
import type { CollectionListings } from "@/convex/returns/storefront";
import { plural, todayInLagos } from "@/lib/format";

export const ALL_PAGE = 40;

export function AllProducts({ initial }: { initial: CollectionListings | null }) {
  const [limit, setLimit] = useState(ALL_PAGE);
  const live = useQuery(api.storefront.collection, { kind: "fresh", today: todayInLagos(), limit }) as CollectionListings | undefined;
  // Keep what's on screen while the next page loads
  const [last, setLast] = useState<CollectionListings | null>(initial);
  if (live !== undefined && live !== last) setLast(live);
  const data = live ?? last;

  if (data === null || data.items.length === 0) {
    return <p className="p card px-6 py-8 text-center">No products yet. Farms add new harvests every day, so check back soon.</p>;
  }
  return (
    <>
      <p className="sm mb-4">{plural(data.total, "product")}</p>
      <ul className="m-0 grid list-none grid-cols-5 gap-5 p-0 m:grid-cols-2 m:gap-2.5 max-[1100px]:grid-cols-4">
        {data.items.map((p, i) => (
          <li key={p.id} className="flex *:w-full">
            <ProductCard item={p} priority={i < 5} />
          </li>
        ))}
      </ul>
      {data.hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button variant="ghost" loading={live === undefined} onClick={() => setLimit((l) => l + ALL_PAGE)}>
            Show more
          </Button>
        </div>
      ) : null}
    </>
  );
}
