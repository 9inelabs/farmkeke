"use client";

// W-01 "Fresh picks near you" and "Farms near you". The server renders both
// rows without an area (for search engines). When the shopper has chosen an
// area, storefront.home is asked again with it (and its position) so nearby
// farms come first and show their distance.
import { useQuery } from "convex/react";
import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { api } from "@/convex/api";
import type { StorefrontHome } from "@/convex/returns/storefront";
import { areaPoint } from "@/lib/area";
import { plural, todayInLagos } from "@/lib/format";
import { routes } from "@/lib/routes";
import { FarmAvatar, MoreLink, ratingText, SectionHead } from "./bits";
import { distanceText, useShopper } from "./live";

export function HomeNearYou({ initial }: { initial: StorefrontHome }) {
  const { chosen } = useShopper();
  const live = useQuery(
    api.storefront.home,
    chosen ? { today: todayInLagos(), state: chosen.state, lga: chosen.lga, ...areaPoint(chosen) } : "skip",
  ) as StorefrontHome | undefined;
  const data = (chosen && live) || initial;
  const place = chosen?.name ?? "Owerri";
  const picks = data.freshPicks.slice(0, 8);
  const farms = data.farms.slice(0, 4);

  return (
    <>
      <section id="fresh" className="mt-14 scroll-mt-6" aria-labelledby="fresh-title">
        <SectionHead
          id="fresh-title"
          title="Fresh picks near you"
          sub={`Harvested in the last few days by farms around ${place}`}
          action={<MoreLink href={routes.categories}>See all</MoreLink>}
        />
        {picks.length ? (
          <div className="grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
            {picks.map((p, i) => (
              <ProductCard key={p.id} item={p} priority={i < 4} />
            ))}
          </div>
        ) : (
          <p className="p card px-6 py-8 text-center">
            No fresh picks right now. Farms add new harvests every day, so check back soon.
          </p>
        )}
      </section>

      {farms.length ? (
        <section className="mt-14" aria-labelledby="farms-title">
          <SectionHead id="farms-title" title="Farms near you" sub="Every farm is verified by the Farmkeke team" />
          <ul className="m-0 grid list-none grid-cols-4 gap-5 p-0 m:grid-cols-2 m:gap-3">
            {farms.map((f) => {
              const dist = distanceText(f.distanceKm);
              const rating = ratingText(f.rating);
              return (
                <li key={f.id} className="flex">
                  <Link href={routes.farm(f.id)} className="card flex w-full flex-col gap-3.5 p-5 text-ink hover:text-ink">
                    <div className="flex items-center gap-3">
                      <FarmAvatar id={f.id} name={f.name} photoUrl={f.photoUrl} size={48} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-[5px] text-[15px] font-semibold">
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
                    <div className="flex justify-between gap-2 pt-3 text-[13px] shadow-[inset_0_1px_0_var(--color-line-soft)]">
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
