// Shared listing rules (F-21 to F-25). Used by the backend on submit and by
// the app's preview screen to show what's missing.

export const MAX_LISTING_PHOTOS = 6;
export const MAX_PRICE_KOBO = 10_000_000_00; // ₦10,000,000
export const MAX_STOCK = 100_000;

export type ListingStep = "photos" | "details" | "pricing" | "fulfilment";

type ListingLike = {
  name: string;
  categoryId?: unknown;
  photoIds: unknown[];
  units: { priceKobo: number; stock: number; minOrder: number }[];
  delivery: boolean;
  pickup: boolean;
};

/** Plain-words problems per step; empty when the listing can be submitted. */
export function listingProblems(listing: ListingLike): Partial<Record<ListingStep, string[]>> {
  const problems: Partial<Record<ListingStep, string[]>> = {};
  const add = (step: ListingStep, message: string) => (problems[step] ??= []).push(message);
  if (listing.photoIds.length === 0) add("photos", "Add at least one photo");
  if (!listing.name.trim()) add("details", "Add a name");
  if (!listing.categoryId) add("details", "Choose a category");
  if (listing.units.length === 0) add("pricing", "Add at least one unit with a price");
  if (listing.units.some((u) => u.priceKobo <= 0)) add("pricing", "Every unit needs a price");
  if (!listing.delivery && !listing.pickup) add("fulfilment", "Choose delivery, pickup or both");
  return problems;
}

export const isOutOfStock = (units: { stock: number }[]) => units.every((u) => u.stock <= 0);

/** Reason templates for staff sending a listing back (A-43). */
export const SEND_BACK_REASONS = [
  "Photos are unclear or don't show the produce",
  "Photos look like stock images, not your own produce",
  "Name or description doesn't match the photos",
  "Price looks wrong for the unit",
  "Wrong category",
  "This produce isn't allowed on Farmkeke",
] as const;
