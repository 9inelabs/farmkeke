// All products: where Fresh Picks' "See all" goes. Every product on Farmkeke,
// newest first, with the categories as chips to narrow it down (each opens
// that category's page, with its filters and sorts).
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { AllProducts, ALL_PAGE } from "@/components/shop/AllProducts";
import { Breadcrumb } from "@/components/shop/bits";
import { getCategoriesWithCounts, siteUrl } from "@/components/shop/data";
import { api } from "@/convex/api";
import type { CollectionListings } from "@/convex/returns/storefront";
import { serverQuery } from "@/convex/server";
import { todayInLagos } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "All products",
  description: "Every product from verified farms on Farmkeke, newest first.",
  alternates: { canonical: `${siteUrl}${routes.allProducts}` },
};

async function firstPage(): Promise<CollectionListings | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await serverQuery(api.storefront.collection, { kind: "fresh", today: todayInLagos(), limit: ALL_PAGE })) as CollectionListings | null;
  } catch {
    return null;
  }
}

export default async function AllProductsPage() {
  const [initial, categories] = await Promise.all([firstPage(), getCategoriesWithCounts()]);
  return (
    <>
      <CategoryBar />
      <div className="wrap pt-7 m:pt-3">
        <Breadcrumb items={[{ href: routes.shop, label: "Shop" }, { label: "All products" }]} />
        <div className="mt-4 mb-5 m:mt-2 m:mb-3">
          <h1 className="h1">All products</h1>
          <p className="p mt-1.5">Everything from verified farms on Farmkeke, newest first.</p>
        </div>
        <nav aria-label="Filter by category" className="mb-6 m:mb-4">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 m:flex-nowrap m:overflow-x-auto m:[scrollbar-width:none]">
            <li>
              <span aria-current="page" className="chip on whitespace-nowrap">
                All
              </span>
            </li>
            {categories.map((c) => (
              <li key={c._id}>
                <Link href={routes.category(c.slug)} className="chip whitespace-nowrap">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <AllProducts initial={initial} />
      </div>
    </>
  );
}
