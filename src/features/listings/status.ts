import type { BadgeTone } from "@/components/ui";
import { formatNaira } from "@/lib/money";

export type ListingTab = "live" | "under_review" | "needs_changes" | "out_of_stock" | "paused" | "draft";

export const TABS: { key: ListingTab; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "under_review", label: "Under review" },
  { key: "needs_changes", label: "Needs changes" },
  { key: "out_of_stock", label: "Out of stock" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Draft" },
];

type Summary = { status: string; outOfStock: boolean };

export function tabOf(listing: Summary): ListingTab {
  if (listing.status === "live" && listing.outOfStock) return "out_of_stock";
  return listing.status as ListingTab;
}

export const STATUS_BADGE: Record<ListingTab, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "success" },
  under_review: { label: "Under review", tone: "pending" },
  needs_changes: { label: "Needs changes", tone: "error" },
  out_of_stock: { label: "Out of stock", tone: "neutral" },
  paused: { label: "Paused", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
};

type Unit = { priceKobo: number; stock: number; singular: string; plural: string };

/** "₦4,500 per basket · 18 left" for the first unit. */
export function priceSummary(units: Unit[]): string {
  const first = units[0];
  if (first === undefined) return "No price yet";
  const more = units.length > 1 ? ` · +${units.length - 1} more` : "";
  return `${formatNaira(first.priceKobo)} per ${first.singular} · ${first.stock} left${more}`;
}

export const stockLabel = (u: { stock: number; singular: string; plural: string }) =>
  `${u.stock} ${u.stock === 1 ? u.singular : u.plural} left`;

/** Low stock: a live unit with 3 or fewer left (F-10). */
export const LOW_STOCK = 3;
