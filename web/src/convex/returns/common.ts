// Shapes shared by many areas, taken from live responses in
// convex-spec/samples/. Each area keeps its own shapes in returns/<area>.ts.

/** A listing in any grid (storefront.home/collection/categoryListings/search/popular/farm). */
export type ListingSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceKobo: number;
  /** Unit label, e.g. "basket", "tray of eggs" */
  unit: string;
  /** Present on some responses only */
  farmName?: string;
  harvestedOn?: string | null;
  // Phase 3c additions (storefront.* cards). Optional so older shapes still type-check.
  farmId?: string;
  farmVerified?: boolean;
  farmRating?: number | null;
  farmRatingCount?: number;
  /** "Harvested today", "Harvested yesterday", "Harvested 3 days ago" (needs `today`) */
  freshness?: string | null;
  inStock?: boolean;
  delivery?: boolean;
  pickup?: boolean;
  category?: { slug: string; name: string } | null;
  subtype?: string | null;
  /** Needs the shopper's lat/lng */
  distanceKm?: number | null;
};

/** checkout.listingForCart */
export type ListingForCart = {
  id: string;
  name: string;
  imageUrl: string | null;
  available: boolean;
  delivery: boolean;
  pickup: boolean;
  farmId: string;
  farmName: string;
  units: Array<{
    unitId: string;
    singular: string;
    plural: string;
    priceKobo: number;
    stock: number;
    minOrder: number;
  }>;
};

/** areas.listServiceAreas */
export type ServiceArea = {
  _id: string;
  name: string;
  lga: string;
  state: string;
  deliveryFeeKobo: number;
  active: boolean;
  sortOrder: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

/** catalog.listCategories */
export type Category = {
  _id: string;
  slug: string;
  name: string;
  illustration: string;
  sortOrder: number;
  hidden: boolean;
};

/** appConfig.get */
export type AppConfig = {
  minAppVersion: string;
  latestAppVersion: string;
  androidStoreUrl?: string;
  iosStoreUrl?: string;
  maintenanceActive: boolean;
  maintenanceMessage?: string;
  maintenanceUntil?: number;
};

/** payments/config.get */
export type PaymentsConfig = { live: boolean; testStep: boolean };
