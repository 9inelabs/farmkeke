// The shop's promotion banner (Admin Portal → Home banners). Deep forest with a
// lime glow; the featured product as a large photo card with its price and
// farm, and two more picks beside it. Products without a photo show their
// category's illustration on a soft tint, never an empty box.
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ListingSummary } from "@/convex/returns/common";
import { naira, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

type Banner = { tag: string; title: string; buttonLabel: string; farmName: string; listing: ListingSummary } | null;

const CATEGORY_ART = new Set(["vegetables", "fruits", "grains-tubers", "poultry-eggs", "meat-fish", "herbs-spices", "legumes-nuts", "dairy"]);

/** The product photo, or its category's illustration on a soft tint. */
function Art({ item, sizes, big = false }: { item: ListingSummary; sizes: string; big?: boolean }) {
  if (item.imageUrl) return <Image src={item.imageUrl} alt="" fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />;
  const slug = item.category?.slug && CATEGORY_ART.has(item.category.slug) ? item.category.slug : "vegetables";
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ background: tintFor(item.id) }}>
      <span className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0)_70%)]" />
      <Image
        src={`/categories/${slug}.png`}
        alt=""
        width={120}
        height={120}
        className={`relative transition-transform duration-500 group-hover:scale-[1.06] ${big ? "size-[120px]" : "size-[72px]"}`}
      />
    </span>
  );
}

export function PromoBanner({ banner, tiles }: { banner: Banner; tiles: ListingSummary[] }) {
  const [feature, ...rest] = tiles;
  const side = rest.slice(0, 2);
  const cta = banner ? routes.product(banner.listing.id) : "#fresh";

  return (
    <div className="dark-surface on-dark relative grid min-h-[360px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-stretch gap-8 overflow-hidden rounded-[28px] bg-[radial-gradient(55%_80%_at_95%_0%,rgba(169,214,84,0.30)_0%,rgba(169,214,84,0)_65%),radial-gradient(40%_60%_at_0%_100%,rgba(169,214,84,0.12)_0%,rgba(169,214,84,0)_70%),linear-gradient(150deg,#0B1A07_0%,#152E10_55%,#1E3B16_100%)] p-10 shadow-[0_30px_70px_rgba(16,35,11,0.22)] max-[1000px]:grid-cols-1 m:min-h-0 m:gap-5 m:rounded-[22px] m:p-5">
      <div aria-hidden className="grid-lines opacity-50" />
      {/* A soft ring of light behind the products */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full border border-lime/15 max-[1000px]:hidden" />
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-[300px] rounded-full border border-lime/10 max-[1000px]:hidden" />

      <div className="relative flex flex-col items-start justify-center gap-4 m:gap-3">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lime px-3 text-xs font-bold tracking-[0.02em] text-forest shadow-[0_6px_18px_rgba(169,214,84,0.35)]">
          <Sparkles aria-hidden className="size-3.5" strokeWidth={2.25} />
          {banner?.tag ?? "Harvested this week"}
        </span>
        <h1 className="m-0 font-display text-[44px] leading-[50px] font-extrabold tracking-[-0.035em] text-white m:text-[28px] m:leading-[34px]">
          {banner?.title ?? "Fresh picks from farms near you"}
        </h1>
        <p className="m-0 max-w-[420px] text-[15px] leading-6 text-on-forest m:text-sm m:leading-[22px]">
          Buy straight from verified farmers in Owerri. You pay only once the farm accepts your order.
        </p>
        {banner ? (
          <div className="flex items-center gap-2 text-[13px] text-on-forest">
            <BadgeCheck aria-hidden className="size-4 text-lime" strokeWidth={2} />
            {banner.farmName} · from <b className="font-semibold text-white">{naira(banner.listing.priceKobo)}</b> per {banner.listing.unit}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 m:mt-1">
          <Link href={cta} className="btn lime h-12 px-6 shadow-[0_12px_30px_rgba(169,214,84,0.28)] m:h-11">
            {banner?.buttonLabel ?? "Shop fresh picks"}
            <ArrowRight aria-hidden size={18} strokeWidth={2} />
          </Link>
          <Link href="#fresh" className="btn h-12 px-5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] hover:bg-white/8 hover:text-white m:hidden">
            See fresh picks
          </Link>
        </div>
      </div>

      {feature ? (
        <ul className="relative m-0 grid list-none grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] grid-rows-2 gap-3 p-0 m:hidden">
          <li className={side.length ? "row-span-2" : "col-span-2 row-span-2"}>
            <Link
              href={routes.product(feature.id)}
              className="group relative flex size-full min-h-[280px] overflow-hidden rounded-[22px] shadow-[0_20px_44px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
            >
              <Art item={feature} sizes="320px" big />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,rgba(11,26,7,0)_0%,rgba(11,26,7,0.78)_100%)]" />
              <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{feature.name}</span>
                  {feature.farmName ? <span className="block truncate text-xs text-white/75">{feature.farmName}</span> : null}
                </span>
                <span className="flex-none rounded-full bg-white px-2.5 py-1 text-xs font-bold text-forest">
                  {naira(feature.priceKobo)}
                  <span className="font-medium text-muted-2"> / {feature.unit}</span>
                </span>
              </span>
            </Link>
          </li>
          {side.map((t) => (
            <li key={t.id}>
              <Link
                href={routes.product(t.id)}
                className="group relative flex size-full min-h-[134px] overflow-hidden rounded-[18px] shadow-[0_14px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
              >
                <Art item={t} sizes="200px" />
                <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1.5 rounded-xl bg-white/92 px-2.5 py-1.5 backdrop-blur-sm">
                  <span className="truncate text-xs font-semibold text-ink">{t.name}</span>
                  <span className="flex-none text-xs font-bold text-forest">{naira(t.priceKobo)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
