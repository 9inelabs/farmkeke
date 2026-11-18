// W-01 Shop home. Server-rendered from storefront.home (no area) so search
// engines see it; HomeNearYou personalises the "near you" rows in the browser.
import { ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { ButtonLink } from "@/components/ui/Button";
import { getHome, siteUrl } from "@/components/shop/data";
import { HomeNearYou } from "@/components/shop/HomeNearYou";
import { PromoBanner } from "@/components/shop/PromoBanner";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Shop fresh produce from verified farms",
  description:
    "Buy straight from verified farmers in Owerri. Delivery or pickup, and you pay only once the farm accepts your order.",
  alternates: { canonical: `${siteUrl}${routes.shop}` },
};

export default async function ShopHome() {
  // Categories are in the bar at the top (CategoryBar), so there's no separate row here
  const home = await getHome();
  const banner = home.banner;
  const tiles = (
    banner ? [banner.listing, ...home.freshPicks.filter((p) => p.id !== banner.listing.id)] : home.freshPicks
  ).slice(0, 4);

  return (
    <>
      <CategoryBar />
      <div className="wrap pt-7 m:pt-4">
        <section className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5 m:grid-cols-1 m:gap-3">
          <PromoBanner banner={banner} tiles={tiles} />
          <div className="flex flex-col gap-5 m:gap-3">
            <div className="card flex flex-1 gap-3.5 p-6 m:gap-3 m:p-4">
              <span className="tile size-[42px] rounded-xl m:size-[38px]">
                <ShieldCheck aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="h3">Buyer protection</h2>
                <p className="sm mt-1.5 m:mt-1">
                  You pay only once the farm accepts. Something wrong? Report it within a day and we&apos;ll sort it out.
                </p>
                <Link
                  href={routes.buyerProtection}
                  className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold m:mt-0 m:min-h-9 m:text-[13px]"
                >
                  How it works
                </Link>
              </div>
            </div>
            <div className="card flex flex-1 gap-3.5 p-6 m:gap-3 m:p-4">
              <span className="tile size-[42px] rounded-xl m:size-[38px]">
                <Truck aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="h3">Delivery or pickup</h2>
                <p className="sm mt-1.5 m:mt-1">
                  Farmkeke riders deliver to your door, or collect from the farm yourself.
                </p>
                <Link
                  href={routes.howItWorks}
                  className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold m:mt-0 m:min-h-9 m:text-[13px]"
                >
                  How delivery works
                </Link>
              </div>
            </div>
          </div>
        </section>

        <HomeNearYou initial={home} />

        <section className="mt-14 m:mt-9">
          <div className="card flex flex-wrap items-center gap-6 px-8 py-7 m:gap-3.5 m:p-4">
            <span className="tile size-[52px] rounded-2xl m:size-[38px] m:rounded-[11px]">
              <Smartphone aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-[240px] flex-1 m:min-w-0">
              <h2 className="h3">Shop faster in the Farmkeke app</h2>
              <p className="sm mt-1">Get order updates, chat with farmers and reorder in a tap.</p>
            </div>
            <div className="flex flex-wrap gap-3 m:grid m:w-full m:grid-cols-2 m:gap-2">
              <ButtonLink href={routes.getTheApp} variant="dark">
                App Store
              </ButtonLink>
              <ButtonLink href={routes.getTheApp} variant="dark">
                Google Play
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
