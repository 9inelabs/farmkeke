// W-07 Farm profile. Server-rendered: profile, listings, reviews, and the
// on-break state when the farm has paused sales.
import { BadgeCheck, Coffee, MapPin, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Breadcrumb, FarmAvatar, RatingBars, ratingText, ReviewRow } from "@/components/shop/bits";
import { freshnessLabel, getFarm, getReviews, getToday, siteUrl } from "@/components/shop/data";
import { FarmListings, ShareFarmButton } from "@/components/shop/FarmParts";
import { GridSkeleton } from "@/components/shop/ListPieces";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const farm = await getFarm(id);
  if (!farm) return { title: "Farm not found", robots: { index: false } };
  const description =
    farm.description?.slice(0, 155) ||
    `Buy fresh produce from ${farm.name}, a verified farm in ${farm.lga}, ${farm.state}. Delivery or pickup, with your payment held until your order arrives.`;
  const url = `${siteUrl}${routes.farm(id)}`;
  return {
    title: `${farm.name}, ${farm.lga}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: farm.name, description, url, images: farm.photoUrl ? [{ url: farm.photoUrl }] : undefined },
  };
}

export default function FarmPage(props: Props) {
  return (
    <div className="wrap pt-7">
      <Suspense fallback={<FarmSkeleton />}>
        <FarmContent {...props} />
      </Suspense>
    </div>
  );
}

async function FarmContent({ params }: Props) {
  const { id } = await params;
  const farm = await getFarm(id);
  if (!farm) notFound();
  const [reviews, today] = await Promise.all([getReviews(farm.id, 10), getToday()]);
  const { summary } = reviews;
  const avg = ratingText(summary.average ?? farm.rating);
  const count = summary.count || farm.ratingCount;
  const listings = farm.onBreak ? [] : farm.listings;
  const freshness: Record<string, string> = {};
  for (const l of listings) {
    const f = freshnessLabel(l.harvestedOn, today);
    if (f) freshness[l.id] = f;
  }
  const tagCounts = new Map<string, number>();
  for (const r of reviews.page.page) for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const produce = [...new Set(farm.listings.map((l) => l.name))].slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: farm.name,
    url: `${siteUrl}${routes.farm(farm.id)}`,
    logo: farm.photoUrl ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: farm.lga, addressRegion: farm.state, addressCountry: "NG" },
    aggregateRating:
      count > 0 && avg ? { "@type": "AggregateRating", ratingValue: avg, reviewCount: count } : undefined,
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
          { href: `${routes.shop}#fresh`, label: "Farms" },
          { label: farm.name },
        ]}
      />

      <section className="card mt-5 overflow-hidden">
        <div className="relative h-[150px] bg-forest">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(169,214,84,0.08)_0_2px,transparent_2px_22px)]" />
        </div>
        <div className="relative -mt-12 flex flex-wrap items-end gap-6 px-8 pb-7 m:px-5">
          <FarmAvatar
            id={farm.id}
            name={farm.name}
            photoUrl={farm.photoUrl}
            size={112}
            className="rounded-[28px] shadow-[0_0_0_6px_#FFFFFF]"
            textClass="text-[34px] font-extrabold"
          />
          <div className="min-w-[260px] flex-1 pb-1 m:min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="h1">{farm.name}</h1>
              {farm.verified ? (
                <span className="badge b-fresh">
                  <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2} />
                  Verified farm
                </span>
              ) : null}
              {farm.onBreak ? <span className="badge b-pend">On a break</span> : null}
            </div>
            <div className="sm mt-1.5 flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5" strokeWidth={1.75} />
              {farm.lga}, {farm.state}
            </div>
          </div>
          <ShareFarmButton name={farm.name} url={`${siteUrl}${routes.farm(farm.id)}`} />
        </div>
        <dl className="m-0 grid grid-cols-4 shadow-[inset_0_1px_0_var(--color-line-soft)] m:grid-cols-2">
          <Stat label="Rating" first>
            {avg ? (
              <>
                {avg} ★{" "}
                <span className="sm font-medium">
                  ({count} {count === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              "No reviews yet"
            )}
          </Stat>
          <Stat label="Products">{listings.length} listed</Stat>
          <Stat label="On Farmkeke since">
            {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(
              farm.joinedAt,
            )}
          </Stat>
          <Stat label="Get it by">Delivery or pickup</Stat>
        </dl>
      </section>

      <section className="mt-7 grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start gap-6 m:grid-cols-1">
        <div>
          <h2 className="sr-only">Products from {farm.name}</h2>
          {farm.onBreak ? (
            <div className="card flex gap-3.5 p-6">
              <span className="tile size-[42px] rounded-xl bg-pend-bg text-pend">
                <Coffee aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[15px] font-semibold">{farm.name} is taking a short break</div>
                <p className="sm mt-1">
                  The farm isn&apos;t taking orders right now. Check back soon, or{" "}
                  <Link href={routes.shop} className="font-semibold">
                    shop other farms
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : listings.length ? (
            <FarmListings items={listings} freshness={freshness} />
          ) : (
            <p className="p card px-6 py-8 text-center">{farm.name} has nothing for sale right now. Check back soon.</p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <div className="card p-6">
            <h2 className="h2">About the farm</h2>
            <p className="p mt-2.5 text-sm leading-[22px]">
              {farm.description ||
                `${farm.name} is a verified farm in ${farm.lga}, ${farm.state}, selling on Farmkeke.`}
            </p>
            {produce.length ? (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {produce.map((n) => (
                  <span key={n} className="badge b-fresh">
                    {n}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {farm.verified ? (
            <div className="card flex gap-3.5 p-6">
              <span className="tile size-[42px] rounded-xl">
                <ShieldCheck aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[15px] font-semibold">Verified by Farmkeke</div>
                <p className="sm mt-1">
                  Our team checked this farm&apos;s ID, farm photos, proof of address and farmers association letter.
                </p>
              </div>
            </div>
          ) : null}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="h2">Reviews</h2>
              {reviews.page.page.length ? (
                <a href="#reviews" className="inline-flex min-h-11 items-center text-[13px] font-semibold">
                  See all
                </a>
              ) : null}
            </div>
            {count > 0 && avg ? (
              <>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="font-display text-4xl leading-10 font-extrabold">{avg}</span>
                  <span className="sm">
                    from {count} {count === 1 ? "review" : "reviews"}
                  </span>
                </div>
                <RatingBars summary={summary} compact />
                {topTags.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {topTags.map(([t, n]) => (
                      <span key={t} className="badge bg-canvas text-ink-3">
                        {t} ({n})
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="sm mt-2.5">No reviews yet. Reviews appear here after shoppers receive their orders.</p>
            )}
          </div>
        </aside>
      </section>

      {reviews.page.page.length ? (
        <section id="reviews" className="card mt-6 scroll-mt-6 p-7 m:p-5" aria-labelledby="all-reviews">
          <h2 id="all-reviews" className="h2">
            What shoppers say
          </h2>
          <ul className="m-0 mt-2 flex list-none flex-col p-0">
            {reviews.page.page.map((r, i) => (
              <ReviewRow key={r._id ?? r.id ?? i} review={r} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Stat({ label, children, first }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`px-6 py-[18px] m:px-5 ${first ? "" : "d:shadow-[inset_1px_0_0_var(--color-line-soft)]"}`}>
      <dt className="cap">{label}</dt>
      <dd className="m-0 mt-0.5 text-base font-bold">{children}</dd>
    </div>
  );
}

function FarmSkeleton() {
  return (
    <LoadingRegion label="Loading farm">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="mt-5 h-[330px] w-full" rounded={18} />
      <div className="mt-7 grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-6 m:grid-cols-1">
        <GridSkeleton count={6} cols={3} />
        <Skeleton className="h-72 w-full" rounded={18} />
      </div>
    </LoadingRegion>
  );
}
