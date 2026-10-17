// TEMPORARY foundation check of the server-rendered pattern. OWNER: shop agent replaces this with W-01.
import { cacheLife } from "next/cache";
import { ProductCard } from "@/components/shop/ProductCard";
import { api } from "@/convex/api";
import type { ListingSummary } from "@/convex/returns/common";
import { serverQuery } from "@/convex/server";
import { todayInLagos } from "@/lib/format";

async function getHome() {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.home, { today: todayInLagos() })) as { freshPicks: ListingSummary[] };
}

export default async function ShopHome() {
  const home = await getHome();
  return (
    <div className="wrap pt-7">
      <h1 className="h1">Fresh picks near you</h1>
      <div className="mt-5 grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
        {home.freshPicks.map((p) => (
          <ProductCard key={p.id} item={p} />
        ))}
      </div>
    </div>
  );
}
