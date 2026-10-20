// W-01 Shop home. Server-rendered from storefront.home (no area) so search
// engines see it; HomeNearYou personalises the "near you" rows in the browser.
import { ShieldCheck, Smartphone, Sprout, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryGrid, MoreLink, SectionHead } from "@/components/shop/bits";
import { getHome, siteUrl } from "@/components/shop/data";
import { HomeNearYou } from "@/components/shop/HomeNearYou";
import { getCategories } from "@/convex/cached";
import { tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Shop fresh produce from verified farms",
  description:
    "Buy straight from verified farmers in Owerri. Delivery or pickup, and your money is held safely until your order arrives.",
  alternates: { canonical: `${siteUrl}${routes.shop}` },
};

export default async function ShopHome() {
  const [home, categories] = await Promise.all([getHome(), getCategories()]);
  const banner = home.banner;
  const tiles = (
    banner ? [banner.listing, ...home.freshPicks.filter((p) => p.id !== banner.listing.id)] : home.freshPicks
  ).slice(0, 4);

  return (
    <>
      <CategoryBar />
      <div className="wrap pt-7">
        <section className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5 m:grid-cols-1">
          <div className="grid min-h-[340px] grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-7 rounded-3xl bg-forest p-11 m:min-h-0 m:grid-cols-1 m:p-7">
            <div className="flex flex-col items-start gap-4">
              <span className="badge bg-[rgba(169,214,84,0.18)] text-on-forest-lime">
                {banner?.tag ?? "Harvested this week"}
              </span>
              <h1 className="h1 text-[38px] leading-[46px] text-white m:text-[30px] m:leading-[38px]">
                {banner?.title ?? "Fresh picks from farms near you"}
              </h1>
              <p className="p text-on-forest">
                Buy straight from verified farmers in Owerri. Your money is held safely until your order arrives.
              </p>
              <ButtonLink href={banner ? routes.product(banner.listing.id) : "#fresh"} size="lg" className="mt-1.5">
                {banner?.buttonLabel ?? "Shop fresh picks"}
              </ButtonLink>
            </div>
            {tiles.length ? (
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 m:hidden">
                {tiles.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={routes.product(t.id)}
                      className="relative flex aspect-square items-end overflow-hidden rounded-[18px] p-3 text-xs font-semibold text-ink-3 hover:text-ink"
                      style={{ background: tintFor(t.id) }}
                    >
                      {t.imageUrl ? (
                        <Image src={t.imageUrl} alt="" fill sizes="200px" className="object-cover" />
                      ) : (
                        <Sprout
                          aria-hidden
                          className="absolute top-1/2 left-1/2 size-10 -translate-1/2 text-[rgba(30,59,22,0.32)]"
                          strokeWidth={1.3}
                        />
                      )}
                      <span className={`relative ${t.imageUrl ? "rounded-md bg-white px-2 py-1" : ""}`}>{t.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            <div className="card flex flex-1 gap-3.5 p-6">
              <span className="tile size-[42px] rounded-xl">
                <ShieldCheck aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="h3">Your money is protected</h2>
                <p className="sm mt-1.5">
                  We hold your payment and release it to the farmer only after you confirm delivery.
                </p>
                <Link
                  href={routes.escrow}
                  className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                >
                  How escrow works
                </Link>
              </div>
            </div>
            <div className="card flex flex-1 gap-3.5 p-6">
              <span className="tile size-[42px] rounded-xl">
                <Truck aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="h3">Delivery or pickup</h2>
                <p className="sm mt-1.5">
                  Farmkeke riders deliver to your door, or collect from the farm yourself.
                </p>
                <Link
                  href={routes.howItWorks}
                  className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                >
                  How delivery works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {categories.length ? (
          <section className="mt-14" aria-labelledby="cats-title">
            <SectionHead
              id="cats-title"
              title="Shop by category"
              action={<MoreLink href={routes.categories}>All categories</MoreLink>}
            />
            <CategoryGrid categories={categories} />
          </section>
        ) : null}

        <HomeNearYou initial={home} />

        <section className="mt-14">
          <div className="card flex flex-wrap items-center gap-6 px-8 py-7 m:px-5 m:py-6">
            <span className="tile size-[52px] rounded-2xl">
              <Smartphone aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-[240px] flex-1">
              <h2 className="h3">Shop faster in the Farmkeke app</h2>
              <p className="sm mt-1">Get order updates, chat with farmers and reorder in a tap.</p>
            </div>
            <div className="flex flex-wrap gap-3">
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
