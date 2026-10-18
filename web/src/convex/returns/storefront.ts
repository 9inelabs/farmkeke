// Shapes read from storefront.*, reviews.* and favorites.* (public shop pages).
// Based on convex-spec/samples/storefront.*.json and live `npx convex run` output.
import type { Category, ListingSummary } from "./common";

export type SortKey = "newest" | "price_low" | "price_high" | "freshest" | "nearest" | "top_rated";

/** A farm row in storefront.home / storefront.search */
export type FarmSummary = {
  id: string;
  name: string;
  /** The farm's LGA, e.g. "Owerri North" */
  area: string;
  photoUrl: string | null;
  // Phase 3c
  lga?: string;
  state?: string;
  verified?: boolean;
  rating?: number | null;
  ratingCount?: number;
  productCount?: number;
  /** Needs the shopper's lat/lng */
  distanceKm?: number | null;
  /** storefront.search only: how many of the matching listings this farm sells */
  matchCount?: number;
};

/** storefront.home */
export type StorefrontHome = {
  banner: {
    tag: string;
    title: string;
    buttonLabel: string;
    farmName: string;
    listing: ListingSummary;
  } | null;
  freshPicks: ListingSummary[];
  pickedToday: ListingSummary[];
  farms: FarmSummary[];
};

/** storefront.categoryListings (null when the slug is unknown) */
export type Subtype = { slug: string; name: string; count: number };

export type CategoryListings = {
  category: { id: string; name: string; slug: string; productCount?: number; subtypes?: Subtype[] };
  items: ListingSummary[];
  hasMore: boolean;
  total: number;
  /** Farms among all matching listings ("86 products from 21 farms") */
  farmCount?: number;
};

/** catalog.listCategoriesWithCounts */
export type CategoryWithCounts = Category & { productCount: number; subtypes: Subtype[] };

/** storefront.collection */
export type CollectionListings = { items: ListingSummary[]; hasMore: boolean; total: number };

/** storefront.search */
export type SearchResults = {
  items: ListingSummary[];
  farms: FarmSummary[];
  hasMore: boolean;
  total: number;
  /** All farms that match (farms holds the first 6) */
  farmTotal?: number;
};

/** storefront.farmAreas */
export type FarmArea = { lga: string; state: string };

export type ProductUnit = {
  unitId: string;
  singular: string;
  plural: string;
  priceKobo: number;
  stock: number;
  minOrder: number;
};

/** storefront.product when the listing can be shown */
export type ProductDetail = {
  available: boolean;
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  harvestedOn: string | null;
  delivery: boolean;
  pickup: boolean;
  category: { name: string; slug: string } | null;
  farm: {
    id: string;
    name: string;
    lga: string;
    state: string;
    photoUrl: string | null;
    rating: number | null;
    ratingCount: number;
    verified: boolean;
    // Phase 3c
    onBreak?: boolean;
    joinedAt?: number;
    productCount?: number;
    /** Median hours from payment to acceptance; null with no history */
    responseTimeHours?: number | null;
    /** The rule: farms accept or decline within this many hours */
    acceptsWithinHours?: number;
    distanceKm?: number | null;
  };
  units: ProductUnit[];
  similar: ListingSummary[];
  reason?: string;
  // Phase 3c
  subtype?: string | null;
  inStock?: boolean;
  freshness?: string | null;
  priceKobo?: number;
  /** For the serviceAreaId arg; null without one */
  deliveryFeeKobo?: number | null;
  deliveryArea?: { id: string; name: string; lga: string; state: string; deliveryFeeKobo: number } | null;
  moreFromFarm?: ListingSummary[];
};

/** storefront.product when the listing is gone or not live */
export type ProductUnavailable = {
  available: false;
  name: string | null;
  imageUrl: string | null;
  reason?: string;
  similar: ListingSummary[];
  id?: undefined;
};

export type ProductResult = ProductDetail | ProductUnavailable | null;

/** storefront.farm (null when unknown) */
export type FarmProfile = {
  id: string;
  name: string;
  description: string | null;
  lga: string;
  state: string;
  photoUrl: string | null;
  rating: number | null;
  ratingCount: number;
  verified: boolean;
  onBreak: boolean;
  joinedAt: number;
  listings: ListingSummary[];
  // Phase 3c
  area?: string;
  productCount?: number;
  distanceKm?: number | null;
  /** "Vegetables (12)" chips */
  categories?: Array<{ slug: string; name: string; count: number }>;
  delivery?: boolean;
  pickup?: boolean;
  responseTimeHours?: number | null;
  acceptsWithinHours?: number;
};

/** reviews.summary — stars[0] is the count of 1-star reviews, stars[4] of 5-star. */
export type ReviewSummary = { average: number | null; count: number; stars: number[] };

/**
 * One public review (reviews.listPublic page item). No live sample has
 * reviews yet, so every field is read defensively.
 */
export type PublicReview = {
  _id?: string;
  id?: string;
  rating?: number;
  stars?: number;
  comment?: string | null;
  tags?: string[];
  reviewerName?: string | null;
  authorName?: string | null;
  buyerName?: string | null;
  name?: string | null;
  createdAt?: number;
  _creationTime?: number;
};

export type ReviewPage = { page: PublicReview[]; isDone: boolean; continueCursor: string };
