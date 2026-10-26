"use client";

// W-01 product rows and "Farms near you". The server renders them without an
// area or a shopper (for search engines). In the browser storefront.home is
// asked again with the chosen area (and position) and the signed-in shopper,
// so Near You, distances and Buy Again are theirs. The rows and how each
// picks its products: convex/lib/homeSections.ts. Only Fresh Picks has
// "See all" (every product, /shop/all); Almost Gone has its own urgent look.
import { useQuery } from "convex/react";
import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { api } from "@/convex/api";
import type { HomeSection, StorefrontHome } from "@/convex/returns/storefront";
import { areaPoint } from "@/lib/area";
import { plural, todayInLagos } from "@/lib/format";
import { routes } from "@/lib/routes";
import { AlmostGone } from "./AlmostGone";
import { FarmAvatar, MoreLink, ratingText, SectionHead } from "./bits";
import { distanceText, useShopper } from "./live";

export function HomeNearYou({ initial }: { initial: StorefrontHome }) {
  const { chosen } = useShopper();
  const live = useQuery(
    api.storefront.home,
    chosen ? { today: todayInLagos(), state: chosen.state, lga: chosen.lga, ...areaPoint(chosen) } : { today: todayInLagos() },
  ) as StorefrontHome | undefined;
  const data = live ?? initial;
  const place = chosen?.name ?? "Owerri";
  // Older deployments only send Fresh Picks
  const sections: HomeSection[] = data.sections ?? [{ key: "fresh", title: "Fresh Picks", seeAll: true, items: data.freshPicks.slice(0, 10) }];
  const farms = data.farms.slice(0, 4);
  const subtitle: Record<HomeSection["key"], string> = {
    fresh: "Just listed by farms on Farmkeke",
    near: `From farms around ${place}`,
    almost_gone: "",
    best_sellers: "What shoppers are buying most this week",
    top_rated: "From farms rated 4.5 stars and up",
    buy_again: "Your favourites, ready to order again",
    great_value: "Priced below the usual for the same produce",
  };

  return (
    <>
      {sections.length === 0 ? (
        <section id="fresh" className="mt-14 scroll-mt-6 m:mt-9" aria-labelledby="fresh-title">
          <SectionHead id="fresh-title" title="Fresh Picks" />
          <p className="p card px-6 py-8 text-center">
            No fresh picks right now. Farms add new harvests every day, so check back soon.
          </p>
        </section>
      ) : null}
      {sections.map((row, i) =>
        row.key === "almost_gone" ? (
          <AlmostGone key={row.key} row={row} />
        ) : (
          <section
            key={row.key}
            id={row.key === "fresh" ? "fresh" : undefined}
            className="mt-14 scroll-mt-6 m:mt-9"
            aria-labelledby={`${row.key}-title`}
          >
            <SectionHead
              id={`${row.key}-title`}
              title={row.title}
              sub={subtitle[row.key] || undefined}
              action={row.seeAll ? <MoreLink href={routes.allProducts}>See all</MoreLink> : undefined}
            />
            <ul className="m-swipe m-0 grid list-none grid-cols-5 gap-5 p-0 [--swipe-w:46%] m:!gap-2.5 max-[1100px]:grid-cols-4">
              {row.items.map((p, j) => (
                <li key={p.id} className="flex *:w-full">
                  <ProductCard item={p} priority={i === 0 && j < 5} />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}

      {farms.length ? (
        <section className="mt-14 m:mt-9" aria-labelledby="farms-title">
          <SectionHead id="farms-title" title="Farms near you" sub="Every farm is verified by the Farmkeke team" />
          <ul className="m-swipe m-0 grid list-none grid-cols-4 gap-5 p-0 [--swipe-w:72%] m:!gap-2.5">
            {farms.map((f) => {
              const dist = distanceText(f.distanceKm);
              const rating = ratingText(f.rating);
              return (
                <li key={f.id} className="flex">
                  <Link href={routes.farm(f.id)} className="card flex w-full flex-col gap-3.5 p-5 text-ink hover:text-ink m:gap-3 m:p-4">
                    <div className="flex items-center gap-3">
                      <FarmAvatar id={f.id} name={f.name} photoUrl={f.photoUrl} size={44} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-[5px] text-[15px] font-semibold m:text-sm">
                          <span className="truncate">{f.name}</span>
                          {f.verified !== false ? (
                            <BadgeCheck role="img" aria-label="Verified farm" className="size-3.5 flex-none text-forest" strokeWidth={2} />
                          ) : null}
                        </div>
                        <div className="cap mt-0.5">
                          {f.lga ?? f.area}
                          {dist ? ` · ${dist} away` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 pt-3 text-[13px] shadow-[inset_0_1px_0_var(--color-line-soft)] m:text-xs">
                      <span className="flex items-center gap-1 font-semibold">
                        <Star aria-hidden className="size-3.5 fill-pending text-pending" strokeWidth={1.5} />
                        {rating ? (
                          <>
                            {rating} <span className="sr-only">out of 5 from</span>({f.ratingCount ?? 0}
                            <span className="sr-only"> reviews</span>)
                          </>
                        ) : (
                          "No reviews yet"
                        )}
                      </span>
                      {f.productCount !== undefined ? (
                        <span className="text-muted-2">{plural(f.productCount, "product")}</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
