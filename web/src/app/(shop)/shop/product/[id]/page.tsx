// W-06 Product detail. Server-rendered with Product JSON-LD; the buy box and
// Save button hydrate on top. Missing or never-live listings 404.
import { PackageX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import {
  Breadcrumb,
  FarmAvatar,
  RatingBars,
  ratingText,
  ReviewRow,
  shipsWithinText,
  subtypeName,
  usuallyAcceptsText,
} from "@/components/shop/bits";
import { getCategoriesWithCounts, getFarm, getProduct, getReviews, getToday, siteUrl } from "@/components/shop/data";
import { BuyBox, FarmDistance, ProductGallery } from "@/components/shop/ProductBuy";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ListingSummary } from "@/convex/returns/common";
import type { ProductDetail } from "@/convex/returns/storefront";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

const isDetail = (p: Awaited<ReturnType<typeof getProduct>>): p is ProductDetail => Boolean(p && "id" in p && p.id);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !p.name) return { title: "Product not found", robots: { index: false } };
  const url = `${siteUrl}${routes.product(id)}`;
  if (!isDetail(p)) return { title: p.name, robots: { index: false }, alternates: { canonical: url } };
  const unit = p.units[0];
  const price = unit ? ` from ₦${(unit.priceKobo / 100).toLocaleString("en-NG")} per ${unit.singular}` : "";
  const description =
    p.description?.slice(0, 155) ||
    `Fresh ${p.name.toLowerCase()}${price}, straight from ${p.farm.name} in ${p.farm.lga}, ${p.farm.state}. Delivery or pickup, with your payment held until your order arrives.`;
  return {
    title: `${p.name} from ${p.farm.name}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: p.name, description, url, images: p.photos[0] ? [{ url: p.photos[0] }] : undefined },
  };
}

export default function ProductPage(props: Props) {
  return (
    <div className="wrap type-product pt-7">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent {...props} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: Props) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || !p.name) notFound();
  if (!isDetail(p)) return <Unavailable name={p.name} similar={p.similar ?? []} />;

  const [farm, reviews, today, categories] = await Promise.all([
    getFarm(p.farm.id),
    getReviews(p.farm.id, 3),
    getToday(),
    getCategoriesWithCounts(),
  ]);
  const freshness = p.freshness ?? undefined;
  const harvestedText = p.harvestedOn ? `Harvested ${longDay(p.harvestedOn)}` : undefined;
  const more = p.moreFromFarm ?? (farm?.listings ?? []).filter((l) => l.id !== p.id);
  const similar = p.similar.filter((s) => !more.some((mItem) => mItem.id === s.id)).slice(0, 4);
  const { summary } = reviews;
  const avg = ratingText(summary.average ?? p.farm.rating);
  const inStock = p.available && p.units.some((u) => u.stock >= Math.max(1, u.minOrder));
  const subtype = p.subtype
    ? subtypeName(p.subtype, categories.find((c) => c.slug === p.category?.slug)?.subtypes)
    : undefined;
  const joinedYear = p.farm.joinedAt ?? farm?.joinedAt;
  const usually = usuallyAcceptsText(p.farm.responseTimeHours ?? farm?.responseTimeHours);
  const about = farm?.description ?? null;
  const askHref = `${routes.contact}?${new URLSearchParams({ farm: p.farm.id, product: p.id }).toString()}`;
  const totalFromFarm = p.farm.productCount ?? farm?.productCount ?? more.length + 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.id,
    url: `${siteUrl}${routes.product(p.id)}`,
    image: p.photos.length ? p.photos : undefined,
    description: p.description ?? undefined,
    category: p.category?.name,
    brand: { "@type": "Brand", name: p.farm.name },
    offers: p.units.map((u) => ({
      "@type": "Offer",
      price: (u.priceKobo / 100).toFixed(2),
      priceCurrency: "NGN",
      availability: p.available && u.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}${routes.product(p.id)}`,
      seller: { "@type": "Organization", name: p.farm.name },
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: Math.max(1, u.minOrder), unitText: u.singular },
    })),
    aggregateRating:
      summary.count > 0 && summary.average
        ? { "@type": "AggregateRating", ratingValue: summary.average.toFixed(1), reviewCount: summary.count }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        items={[
          { href: routes.shop, label: "Shop" },
          ...(p.category ? [{ href: routes.category(p.category.slug), label: p.category.name }] : []),
          { label: p.name },
        ]}
      />

      <section className="mt-5 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-10 m:grid-cols-1 m:gap-6">
        <ProductGallery id={p.id} name={p.name} photos={p.photos} freshness={freshness} canSave={p.available} />
        <BuyBox product={p} harvestedText={harvestedText} today={today} subtype={subtype} />
      </section>

      <section className="mt-14 grid grid-cols-2 items-start gap-5 m:grid-cols-1">
        <div className="card p-7 m:p-5">
          <h2 className="h2">About this produce</h2>
          <p className="p mt-3">{p.description || `${p.farm.name} hasn't added a description for this product yet.`}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-soft p-3.5">
              <div className="cap">Grown in</div>
              <div className="mt-0.5 text-sm font-semibold">
                {p.farm.lga}, {p.farm.state}
              </div>
            </div>
            <div className="rounded-xl bg-soft p-3.5">
              <div className="cap">Ships within</div>
              <div className="mt-0.5 text-sm font-semibold">{shipsWithinText(p.farm.acceptsWithinHours)}</div>
            </div>
          </div>
        </div>
        <div className="card p-7 m:p-5">
          <div className="flex items-center gap-3.5">
            <FarmAvatar
              id={p.farm.id}
              name={p.farm.name}
              photoUrl={p.farm.photoUrl}
              size={56}
              textClass="text-[17px]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="h2 text-lg">{p.farm.name}</h2>
                {p.farm.verified ? <span className="badge b-fresh h-[22px]">Verified</span> : null}
              </div>
              <div className="sm mt-0.5">
                {p.farm.lga}
                <FarmDistance id={p.id} today={today} after=" from you" />
                {joinedYear ? ` · Selling since ${new Date(joinedYear).getUTCFullYear()}` : ""}
              </div>
            </div>
          </div>
          {about || usually ? <p className="p mt-3.5">{[about, usually].filter(Boolean).join(" ")}</p> : null}
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <ButtonLink href={routes.farm(p.farm.id)} variant="ghost">
              View farm
            </ButtonLink>
            <ButtonLink href={askHref} variant="ghost">
              Ask a question
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="card mt-5 p-7 m:p-5" aria-labelledby="reviews-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="reviews-title" className="h2">
            Reviews
          </h2>
          {summary.count > reviews.page.page.length ? (
            <Link
              href={`${routes.farm(p.farm.id)}#reviews`}
              className="inline-flex min-h-11 items-center text-sm font-semibold"
            >
              See all {summary.count}
            </Link>
          ) : null}
        </div>
        {summary.count > 0 ? (
          <div className="mt-5 grid grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 m:grid-cols-1 m:gap-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[44px] leading-[48px] font-extrabold">{avg}</span>
                <span className="sm">out of 5</span>
              </div>
              <RatingBars summary={summary} />
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {reviews.page.page.map((r, i) => (
                <ReviewRow key={r._id ?? r.id ?? i} review={r} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="p mt-3">
            No reviews for {p.farm.name} yet. Reviews appear here after shoppers receive their orders.
          </p>
        )}
      </section>

      {more.length ? (
        <ProductRow
          title={`More from ${p.farm.name}`}
          items={more.slice(0, 4)}
          mini
          action={
            <Link href={routes.farm(p.farm.id)} className="inline-flex min-h-11 items-center text-sm font-semibold">
              View all {totalFromFarm}
            </Link>
          }
        />
      ) : null}
      {similar.length && (!inStock || more.length < 4) ? <ProductRow title="Similar items" items={similar} /> : null}
    </>
  );
}

function ProductRow({
  title,
  items,
  action,
  mini = false,
}: {
  title: string;
  items: ListingSummary[];
  action?: React.ReactNode;
  /** W-06 "More from" uses the small link card */
  mini?: boolean;
}) {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="h2">{title}</h2>
        {action}
      </div>
      <div className="grid grid-cols-4 gap-5 m:grid-cols-2 m:gap-3">
        {items.map((s) => (
          <ProductCard key={s.id} item={s} variant={mini ? "mini" : "full"} />
        ))}
      </div>
    </section>
  );
}

function Unavailable({ name, similar }: { name: string; similar: ListingSummary[] }) {
  return (
    <>
      <Breadcrumb items={[{ href: routes.shop, label: "Shop" }, { label: name }]} />
      <section className="card mt-5 flex flex-col items-center gap-4 px-8 py-14 text-center m:px-5">
        <span className="tile size-[72px] rounded-[22px]">
          <PackageX aria-hidden className="size-8" strokeWidth={1.6} />
        </span>
        <h1 className="h1">{name} isn&apos;t available</h1>
        <p className="p max-w-[520px]">
          The farm has stopped selling this for now. Have a look at similar items below, or browse a category.
        </p>
        <ButtonLink href={routes.categories} variant="ghost">
          All categories
        </ButtonLink>
      </section>
      {similar.length ? <ProductRow title="Similar items" items={similar.slice(0, 8)} /> : null}
    </>
  );
}

/** "Friday, 16 October" from "2026-10-16" (no clock read). */
function longDay(iso: string) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(Date.UTC(y!, (mo ?? 1) - 1, d ?? 1, 12)),
  );
}

function ProductSkeleton() {
  return (
    <LoadingRegion label="Loading product">
      <Skeleton className="h-4 w-60" />
      <div className="mt-5 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 m:grid-cols-1 m:gap-6">
        <Skeleton className="aspect-[4/3] w-full" rounded={24} />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-16 w-full" rounded={14} />
          <Skeleton className="h-[54px] w-full" rounded={14} />
          <Skeleton className="h-40 w-full" rounded={18} />
        </div>
      </div>
    </LoadingRegion>
  );
}
