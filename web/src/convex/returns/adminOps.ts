// Return shapes for the portal's operations screens (convex/admin/areas.ts,
// fees.ts, riders.ts, dispatch.ts, orders.ts).
import type { Id } from "../api";
import type { Hours } from "./adminFarms";

export type ServiceArea = {
  _id: Id<"serviceAreas">;
  state: string;
  name: string;
  lga: string;
  /** The old fixed fee; delivery is priced per order now */
  deliveryFeeKobo?: number;
  active: boolean;
  sortOrder: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export type PickupPoint = {
  _id: Id<"pickupPoints">;
  name: string;
  address: string;
  state: string;
  lga: string;
  latitude: number;
  longitude: number;
  hours: Hours[];
  phone: string;
  collectWithinDays: number;
  photoStorageId?: Id<"_storage">;
  photoUrl: string | null;
  active: boolean;
};

export type Rules = {
  commissionBps: number | null;
  effectiveCommissionBps: number;
  defaultCommissionBps: number;
  commissionEffectiveAt: number | null;
  farmerResponseHours: number;
  unconfirmedAfterHours: number;
  pickupHoldDays: number;
  disputeReplyHours: number;
  defaults: { farmerResponseHours: number; unconfirmedAfterHours: number; pickupHoldDays: number; disputeReplyHours: number; disputeDecideHours: number };
};

export type RiderReview = "pending" | "approved" | "rejected";
export type Vehicle = "motorbike" | "tricycle" | "car" | "van" | "bicycle";
export type IdType = "nin" | "drivers_licence" | "voters_card" | "passport";

export type RiderRow = {
  _id: Id<"riders">;
  name: string;
  phone: string;
  active: boolean;
  reviewStatus: RiderReview;
  vehicleType: Vehicle | null;
  plateNumber: string | null;
  bikeModel: string | null;
  photoUrl: string | null;
  serviceAreas: { _id: Id<"serviceAreas">; name: string }[];
  activeJobs: number;
  deliveriesToday: number;
};

export type RiderDetail = {
  _id: Id<"riders">;
  _creationTime: number;
  name: string;
  phone: string;
  active: boolean;
  serviceAreas: { _id: Id<"serviceAreas">; name: string }[];
  homeAddress: string | null;
  photoUrl: string | null;
  idType: IdType | null;
  idNumber: string | null;
  idPhotoUrl: string | null;
  vehicleType: Vehicle | null;
  plateNumber: string | null;
  bikeModel: string | null;
  guarantor: { name: string; phone: string; address: string; relationship: string } | null;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  reviewStatus: RiderReview;
  reviewNote: string | null;
  reviewedAt: number | null;
  reviewedBy: string | null;
  missing: string[];
  recentOrders: { _id: Id<"orders">; number: string; status: string; at: number }[];
  history: { _id: string; _creationTime: number; action: string; reason: string; actorId: Id<"users"> }[];
};

export type Window = { day: string; from: string; to: string };

export type BoardRow = {
  orderId: Id<"orders">;
  number: string;
  status: string;
  fulfilment: "delivery" | "pickup";
  farm: { _id: Id<"farms">; name: string; phone: string; collectionAddress: string; lga: string } | null;
  dropOff:
    | { kind: "address"; area: string; lga: string; street: string; landmark: string; note: string | null }
    | { kind: "pickup_point"; name: string; address: string }
    | { kind: "farm"; name: string; address: string };
  consumer: { name: string; phone: string };
  window: Window | null;
  windowEnd: number | null;
  rider: { _id: Id<"riders">; name: string; phone: string } | null;
  riderCollectAt: number | null;
  readyAt: number | null;
  handedOverAt: number | null;
  arrivedAt: number | null;
  collectBy: number | null;
  deliveredAt: number | null;
  late: "no_rider" | "collection_late" | "past_window" | "not_at_point" | "not_collected" | null;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  deliveryPricedAt: number | null;
  paid: boolean;
  bill: BillState | null;
  canPrice: boolean;
};

/** A delivery checkout's bill: waiting for farms or prices, sent, paid, or lapsed. */
export type BillState = {
  status: "awaiting_bill" | "awaiting_payment" | "paid" | "abandoned";
  billedAt: number | null;
  payBy: number | null;
  totalKobo: number;
  abandonReason?: string | null;
  canPrice?: boolean;
};

export type Board = {
  /** Delivery orders not paid yet: rider to brief, price to set, or the bill out */
  awaitingBill: BoardRow[];
  readyForRider: BoardRow[];
  withRider: BoardRow[];
  atPickupPoint: BoardRow[];
  delivered: BoardRow[];
  riders: {
    _id: Id<"riders">;
    name: string;
    phone: string;
    serviceAreaIds: Id<"serviceAreas">[];
    jobs: number;
    plateNumber: string | null;
    bikeModel: string | null;
  }[];
};

export type OrderRow = {
  _id: Id<"orders">;
  number: string;
  status: string;
  escrow: string;
  fulfilment: "delivery" | "pickup";
  farmId: Id<"farms">;
  farmName: string;
  placedAt: number;
  paidAt: number | null;
  respondBy: number | null;
  deliveredAt: number | null;
  itemCount: number;
  summary: string;
  imageUrl: string | null;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  window: Window | null;
  isActive: boolean;
  consumerName: string;
  consumerPhone: string;
  escrowHold: boolean;
  riderId: Id<"riders"> | null;
  disputeId: Id<"disputes"> | null;
  unconfirmedFlaggedAt: number | null;
  reason?: string;
};

export type OrderDetail = {
  _id: Id<"orders">;
  number: string;
  status: string;
  escrow: string;
  escrowHold: boolean;
  holdReason: string | null;
  fulfilment: "delivery" | "pickup";
  farmName: string;
  farmId: Id<"farms">;
  items: { index: number; name: string; quantity: number; priceKobo: number; unitLabel: string; lineTotalKobo: number; imageUrl: string | null }[];
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  placedAt: number;
  paidAt: number | null;
  respondBy: number | null;
  acceptedAt: number | null;
  readyAt: number | null;
  deliveredAt: number | null;
  confirmedAt: number | null;
  releasedAt: number | null;
  endedAt: number | null;
  declineReason: string | null;
  cancelReason: string | null;
  window: Window | null;
  address: { street: string; landmark: string; areaName: string; lga: string; state: string } | null;
  pickupPoint: { _id: Id<"pickupPoints">; name: string; address: string; phone: string } | null;
  /** Pickup at the farm: where the shopper collects */
  collectFrom: { farmName: string; address: string; lga: string; state: string; phone: string; collectWithinDays: number } | null;
  collectBy: number | null;
  deliveryPricedAt: number | null;
  paid: boolean;
  bill: BillState | null;
  riderNote: string | null;
  riderCollectAt: number | null;
  disputeId: Id<"disputes"> | null;
  pickupCode: string | null;
  contact: { name: string; phone: string; email?: string };
  consumer: { userId: Id<"users">; name: string; email: string | null; isGuest: boolean };
  farmDetail: { _id: Id<"farms">; name: string; phone: string; collectionAddress: string } | null;
  payment: { checkoutReference: string; reference: string | null; provider: string | null } | null;
  riderDetail: { _id: Id<"riders">; name: string; phone: string; plateNumber: string | null; bikeModel: string | null } | null;
  unconfirmedFlaggedAt: number | null;
  refunds: { _id: string; amountKobo: number; kind: string; status: string; reason: string; at: number }[];
  payoutIds: string[];
  conversationId: Id<"conversations"> | null;
  timeline: { _id: string; kind: string; at: number; actorKind: string; actorName: string | null; note: string | null }[];
  notes: { _id: string; at: number; note: string; authorName: string | null }[];
};
