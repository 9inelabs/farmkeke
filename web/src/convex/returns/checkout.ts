// Shapes for cart, checkout and payment (W-08, W-20 to W-30), copied from the
// rebuilt backend in convex/checkout.ts, convex/payments/checkout.ts and
// convex/orders/consumer.ts (placedSummary). Samples: convex-spec/samples/
// checkout.*.json. Fields the live deployment may not send yet are optional.

/** One change the server found in the cart (W-20c). */
export type CartChange = {
  kind: "unavailable" | "sold_out" | "price" | "quantity";
  listingId: string;
  unitId: string;
  name: string;
  oldPriceKobo?: number;
  priceKobo?: number;
  oldQuantity?: number;
  quantity?: number;
};

export type QuoteLine = {
  listingId: string;
  unitId: string;
  name: string;
  imageUrl: string | null;
  priceKobo: number;
  quantity: number;
  lineTotalKobo: number;
  stock: number;
  minOrder: number;
  unitSingular: string;
  unitPlural: string;
  delivery: boolean;
  pickup: boolean;
};

export type QuoteFarm = {
  farmId: string;
  farmName: string;
  /** The farm's LGA, e.g. "Owerri North" */
  farmArea?: string;
  farmPhotoUrl?: string | null;
  /** Phase 5: median payment-to-acceptance hours ("Usually accepts within 2 hours"); null with no history. */
  responseTimeHours?: number | null;
  /** Phase 5: the acceptance deadline (24). */
  acceptsWithinHours?: number;
  lines: QuoteLine[];
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  /** Pickup at the farm: "Owerri North, Imo", and when the farm hands over orders */
  collectionArea?: string;
  collectionHours?: Array<{ day: number; opens: string; closes: string }>;
};

export type QuoteBlocker = { listingId: string; name: string; farmName: string };

/** checkout.quote */
export type Quote = {
  area: {
    _id: string;
    name: string;
    lga: string;
    state: string;
    deliveryFeeKobo: number;
    latitude?: number;
    longitude?: number;
  } | null;
  changes: CartChange[];
  deliveryBlockers: QuoteBlocker[];
  pickupBlockers: QuoteBlocker[];
  farms: QuoteFarm[];
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  /** Delivery: the fee is added to the bill once staff have priced it */
  deliveryFeeLater?: boolean;
};

/** A W-23 time slot: open, or closed because it's full or too soon (Phase 5). */
export type SlotState = { from: string; to: string; open: boolean; reason?: "full" | "too_soon" | null };

/** checkout.deliveryWindows */
export type DeliveryWindows = {
  days: Array<{ day: string; slots: Array<{ from: string; to: string }>; allSlots?: SlotState[] }>;
  /** Phase 5: every day the farms can make, with every slot (full days too). */
  allDays?: Array<{ day: string; slots: SlotState[] }>;
  readyDay: string | null;
};

/** checkout.pickupPoints item */
export type CheckoutPickupPoint = {
  _id: string;
  name: string;
  address: string;
  state: string;
  lga: string;
  latitude: number;
  longitude: number;
  hours: Array<{ day: number; opens: string; closes: string }>;
  phone?: string;
  collectWithinDays: number;
  photoUrl?: string | null;
  distanceKm: number | null;
  /** Phase 5 (with farmIds and now): "YYYY-MM-DD" the order can wait here from. */
  readyDay?: string | null;
};

/** checkout.contactDefaults */
export type ContactDefaults = { name: string | null; phone: string | null; email: string | null };

/** checkout.place */
export type PlaceResult = {
  checkoutId: string;
  reference: string;
  totalKobo: number;
  orders: Array<{ orderId: string; number: string; farmName: string; totalKobo: number }>;
  /** Pickup is paid now; delivery is paid when the bill comes */
  payNow?: boolean;
};

/** orderRow() in convex/lib/orders.ts, used by payments/checkout.get and placedSummary. */
export type OrderRow = {
  _id: string;
  number: string;
  status: string;
  escrow?: string;
  fulfilment: "delivery" | "pickup";
  farmId: string;
  farmName: string;
  placedAt: number;
  paidAt: number | null;
  respondBy: number | null;
  deliveredAt: number | null;
  itemCount: number;
  summary: string;
  imageUrl: string | null;
  /** One photo per item, first 4 items (older backends: absent) */
  imageUrls?: Array<string | null>;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  window: { day: string; from: string; to: string } | null;
  isActive: boolean;
  pickupCode?: string | null;
  checkoutId?: string;
  deliveryPricedAt?: number | null;
  paid?: boolean;
  /** Pickup at the farm (placedSummary) */
  collectFrom?: CollectFrom | null;
  /** Unpaid delivery (orders.consumer.list): the bill is out and can be paid */
  billReady?: boolean;
};

/** Pickup at the farm: where and when to collect. */
export type CollectFrom = {
  farmName: string;
  address: string;
  lga: string;
  state: string;
  hours: Array<{ day: number; opens: string; closes: string }>;
  phone: string;
  collectWithinDays: number;
};

export type CheckoutStatus = "awaiting_bill" | "awaiting_payment" | "paid" | "abandoned" | string;

/** payments/checkout.get */
export type CheckoutForPay = {
  _id: string;
  reference: string;
  status: CheckoutStatus;
  fulfilment: "delivery" | "pickup";
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  paidAt: number | null;
  contact: { name: string; phone: string; email?: string };
  canSaveCard?: boolean;
  lastAttempt: {
    status: "started" | "opened" | "success" | "failed" | "abandoned" | "mismatch" | string;
    method: "card" | "bank_transfer" | "ussd" | "saved_card" | null;
    reason: string | null;
    reference: string;
    /** Phase 5: when the attempt started, and the card's brand and last 4 digits. */
    startedAt?: number;
    cardLast4?: string | null;
    cardBrand?: string | null;
    channel?: string | null;
  } | null;
  orders: OrderRow[];
  payments?: { live: boolean; testStep: boolean };
  /** False when paying someone else's bill through its pay link */
  isOwner?: boolean;
  billedAt?: number | null;
  payBy?: number | null;
  /** The bill's pay link token (owner only) */
  payToken?: string | null;
  abandonReason?: string | null;
};

/** orders/consumer.placedSummary */
export type PlacedSummary = {
  checkoutId: string;
  reference: string;
  status: CheckoutStatus;
  paidAt: number | null;
  fulfilment: "delivery" | "pickup";
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  contact: { name: string; phone: string; email?: string };
  isGuest: boolean;
  orders: OrderRow[];
  /** Phase 5: where it goes, for "A Farmkeke rider delivers to …". */
  address?: { street: string; landmark?: string; areaName?: string; lga?: string; state?: string; note?: string | null } | null;
  pickupPoint?: { name: string; address?: string; lga?: string } | null;
  window?: { day: string; from: string; to: string } | null;
  /** Delivery: the bill's pay-by time and pay link token, once the bill is out */
  payBy?: number | null;
  payToken?: string | null;
};

/** payments/checkout.start (live mode) */
export type PaymentStart = { accessCode: string; authorizationUrl: string; reference: string };
