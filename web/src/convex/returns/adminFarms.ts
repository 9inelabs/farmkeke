// Return shapes for the portal's farmer, product, catalog and banner screens
// (convex/admin/farmerRequests.ts, farmers.ts, listings.ts, catalog.ts, banners.ts).
import type { Id } from "../api";

export type Paged<T> = { page: T[]; isDone: boolean; continueCursor: string };

export type ApplicationStatus = "draft" | "submitted" | "more_info" | "approved" | "rejected";
export type ApplicationSection = "farm" | "produce" | "collection" | "documents" | "payout";
export type DocumentKind = "government_id" | "farm_photo" | "proof_of_address" | "association_letter";
export type DocumentStatus = "pending" | "approved" | "rejected" | "expired";
export type Hours = { day: number; opens: string; closes: string };

export type ApplicationRow = {
  _id: Id<"farmerApplications">;
  reference: string | null;
  farmName: string | null;
  state: string | null;
  lga: string | null;
  submittedAt: number | null;
  status: ApplicationStatus;
};

export type FarmDocument = {
  _id: Id<"farmerDocuments">;
  _creationTime: number;
  kind: DocumentKind;
  status: DocumentStatus;
  note?: string;
  url: string | null;
};

export type AuditEntry = { _id: string; _creationTime: number; action: string; reason: string; details?: string; actorId: Id<"users"> };

export type ApplicationDetail = {
  application: {
    _id: Id<"farmerApplications">;
    _creationTime: number;
    userId: Id<"users">;
    status: ApplicationStatus;
    reference?: string;
    // The short form (24 Oct 2026)
    fullName?: string;
    farmName?: string;
    phone?: string;
    state?: string;
    lga?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    farmSize?: string;
    farmType?: string;
    categoryIds: Id<"categories">[];
    mainCrops?: string;
    typicalVolume?: string;
    seasons: string[];
    collectionAddress?: string;
    collectionHours: Hours[];
    leadTimeHours?: number;
    bankCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    termsAcceptedAt?: number;
    submittedAt?: number;
    decidedAt?: number;
    moreInfo?: { note: string; sections: ApplicationSection[] };
    rejection?: { reason: string; note: string; reapplyAfter: number };
  };
  photoUrl: string | null;
  applicant: { _id: Id<"users">; name?: string; email?: string; phone?: string } | null;
  categories: string[];
  documents: FarmDocument[];
  history: AuditEntry[];
};

export type FarmRow = {
  _id: Id<"farms">;
  name: string;
  state: string;
  lga: string;
  status: "active" | "suspended";
  trusted: boolean;
  setUp: boolean;
  holidayMode?: boolean;
  createdAt?: number;
};

export type FarmDetail = {
  farm: {
    _id: Id<"farms">;
    _creationTime: number;
    userId: Id<"users">;
    name: string;
    phone: string;
    description?: string;
    state: string;
    lga: string;
    address: string;
    // Older farms only; the short form doesn't ask
    farmSize?: string;
    farmType?: string;
    collectionAddress: string;
    collectionHours: Hours[];
    leadTimeHours: number;
    openDays: number[];
    holidayMode: boolean;
    bankName: string;
    accountNumber: string;
    accountName: string;
    status: "active" | "suspended";
    suspendedReason?: string;
    trusted: boolean;
    profileConfirmedAt?: number;
    collectionConfirmedAt?: number;
  };
  owner: { _id: Id<"users">; name?: string; email?: string; phone?: string } | null;
  documents: FarmDocument[];
  activity: AuditEntry[];
};

export type ListingStatus = "draft" | "under_review" | "needs_changes" | "live" | "paused";

export type ListingRow = {
  _id: Id<"listings">;
  name: string;
  status: ListingStatus;
  farmId: Id<"farms">;
  farmName: string | null;
  outOfStock: boolean;
  submittedAt: number | null;
  liveAt?: number | null;
  coverUrl?: string | null;
};

export type QueueRow = { _id: Id<"listings">; name: string; farmName: string | null; coverUrl: string | null; submittedAt: number | null };

export type ListingDetail = {
  listing: {
    _id: Id<"listings">;
    _creationTime: number;
    farmId: Id<"farms">;
    status: ListingStatus;
    name: string;
    subtype?: string;
    description?: string;
    harvestedOn?: string;
    delivery: boolean;
    pickup: boolean;
    reviewNote?: string;
    submittedAt?: number;
    liveAt?: number;
  };
  farm: { _id: Id<"farms">; name: string; trusted: boolean; status: "active" | "suspended" } | null;
  category: string | null;
  units: { unitId: Id<"units">; priceKobo: number; stock: number; minOrder: number; unit: string }[];
  photoUrls: (string | null)[];
  history: { _id: string; _creationTime: number; kind: string; details?: string }[];
  sendBackReasons: string[];
};

export type Category = {
  _id: Id<"categories">;
  slug: string;
  name: string;
  illustration: string;
  sortOrder: number;
  hidden: boolean;
  subtypes?: { slug: string; name: string }[];
};

export type Unit = { _id: Id<"units">; slug: string; singular: string; plural: string; sortOrder: number; retired: boolean };

export type BannerRow = {
  _id: Id<"homeBanners">;
  tag: string;
  title: string;
  buttonLabel: string;
  active: boolean;
  sortOrder: number;
  shown: boolean;
  listing: { _id: Id<"listings">; name: string; status: ListingStatus; farmName: string | null; coverUrl: string | null } | null;
  problem: string | null;
};
