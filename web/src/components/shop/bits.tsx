// Small presentational pieces shared by the shop pages (server-safe, no hooks).
import { Apple, Bean, Carrot, ChevronRight, Egg, Fish, Leaf, Milk, Sprout, Wheat, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Category } from "@/convex/returns/common";
import type { PublicReview, ReviewSummary } from "@/convex/returns/storefront";
import { dayMonth, initials, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

const ICONS: Record<string, LucideIcon> = {
  vegetables: Carrot,
  fruits: Apple,
  "grains-tubers": Wheat,
  "poultry-eggs": Egg,
  "meat-fish": Fish,
  "herbs-spices": Leaf,
  "legumes-nuts": Bean,
  dairy: Milk,
};

export function CategoryIcon({ illustration, className, strokeWidth = 1.6 }: { illustration: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[illustration] ?? Sprout;
  return <Icon aria-hidden className={className ?? "size-6"} strokeWidth={strokeWidth} />;
}

/** W-01 / W-04b "Shop by category" grid: 8 columns, 4 on phones. */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-8 gap-3 p-0 m:grid-cols-4">
      {categories.map((c) => (
        <li key={c._id} className="flex">
          <Link
            href={routes.category(c.slug)}
            className="card flex w-full flex-col items-center gap-2.5 px-2.5 py-[18px] text-center text-[13px] font-semibold text-ink hover:text-ink hover:shadow-[inset_0_0_0_1.5px_var(--color-lime)]"
          >
            <span className="tile size-[52px] rounded-2xl">
              <CategoryIcon illustration={c.illustration} />
            </span>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[13px] text-subtle">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <li aria-hidden className="list-none">
                /
              </li>
            ) : null}
            <li className="min-w-0">
              {it.href ? (
                <Link href={it.href} className="inline-flex min-h-11 items-center text-muted hover:text-ink m:min-h-8">
                  {it.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-ink">
                  {it.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHead({ title, sub, action, id }: { title: string; sub?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="h2" id={id}>
          {title}
        </h2>
        {sub ? <p className="sm mt-1">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold whitespace-nowrap">
      {children}
      <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}

/** Round farm avatar: photo, or initials on a soft tint. */
export function FarmAvatar({
  id,
  name,
  photoUrl,
  size,
  className,
  textClass,
}: {
  id: string;
  name: string;
  photoUrl: string | null;
  size: number;
  className?: string;
  textClass?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relative flex flex-none items-center justify-center overflow-hidden font-display font-bold text-forest ${className ?? "rounded-full"} ${textClass ?? "text-[15px]"}`}
      style={{ width: size, height: size, background: tintFor(id) }}
    >
      {photoUrl ? <Image src={photoUrl} alt="" fill sizes={`${size}px`} className="object-cover" /> : initials(name)}
    </span>
  );
}

/** 5 to 1 star bars (W-06, W-07). */
export function RatingBars({ summary, compact = false }: { summary: ReviewSummary; compact?: boolean }) {
  const total = summary.count || 1;
  return (
    <ul className={`m-0 flex list-none flex-col p-0 ${compact ? "mt-3 gap-[7px] text-xs" : "mt-3.5 gap-2 text-[13px]"}`}>
      {[5, 4, 3, 2, 1].map((n) => {
        const c = summary.stars[n - 1] ?? 0;
        const pct = Math.round((c / total) * 100);
        return (
          <li key={n} className="flex items-center gap-2.5">
            <span className={compact ? "w-2.5" : "w-3"}>{n}</span>
            <span className="sr-only">
              {" "}
              stars: {c} {c === 1 ? "review" : "reviews"}
            </span>
            <span aria-hidden className="h-1.5 flex-1 rounded-md bg-[#EDEFE9]">
              <span className="block h-1.5 rounded-md bg-pending" style={{ width: `${pct}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const reviewerName = (r: PublicReview) => r.reviewerName || r.authorName || r.buyerName || r.name || "Farmkeke shopper";
export const reviewStars = (r: PublicReview) => Math.max(0, Math.min(5, Math.round(r.rating ?? r.stars ?? 0)));

export function ReviewRow({ review }: { review: PublicReview }) {
  const stars = reviewStars(review);
  const when = review.createdAt ?? review._creationTime;
  return (
    <li className="flex flex-col gap-1.5 py-3.5 [&+&]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
      <div className="flex w-full justify-between gap-3">
        <span className="text-sm font-semibold">{reviewerName(review)}</span>
        {when ? <span className="cap">{dayMonth(when)}</span> : null}
      </div>
      <div className="text-sm tracking-[2px] text-pending" role="img" aria-label={`${stars} out of 5 stars`}>
        {"★".repeat(stars)}
        {"☆".repeat(5 - stars)}
      </div>
      {review.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <span key={t} className="badge bg-canvas text-ink-3">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {review.comment ? <p className="p text-sm">{review.comment}</p> : null}
    </li>
  );
}

/** "4.8" from a farm rating, or null when there are no reviews yet. */
export const ratingText = (avg: number | null | undefined) => (avg ? avg.toFixed(1) : null);

/** Hours rounded up to whole hours, at least 1: "2 hours", "1 hour". */
const hoursText = (h: number) => {
  const n = Math.max(1, Math.ceil(h));
  return `${n} ${n === 1 ? "hour" : "hours"}`;
};

/**
 * W-07 "Accepts orders" stat: "Usually within 2 hours" from the farm's
 * median response time, or the rule ("Within 24 hours") when it has no
 * history yet.
 */
export function acceptsText(responseTimeHours: number | null | undefined, acceptsWithinHours: number | undefined) {
  if (typeof responseTimeHours === "number") return `Usually within ${hoursText(responseTimeHours)}`;
  return `Within ${hoursText(acceptsWithinHours ?? 24)}`;
}

/** W-06 "Usually accepts orders within 2 hours." (only when the farm has a history) */
export function usuallyAcceptsText(responseTimeHours: number | null | undefined) {
  return typeof responseTimeHours === "number" ? `Usually accepts orders within ${hoursText(responseTimeHours)}.` : null;
}

/** W-06 "Ships within": "24 hours of your order" */
export const shipsWithinText = (acceptsWithinHours: number | undefined) => `${hoursText(acceptsWithinHours ?? 24)} of your order`;

/** A subtype's display name from its slug ("leafy-greens" → "Leafy greens") when the name isn't known. */
export function subtypeName(slug: string, known?: Array<{ slug: string; name: string }>) {
  const hit = known?.find((s) => s.slug === slug);
  if (hit) return hit.name;
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
