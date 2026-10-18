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
  /** Not sent yet ("Usually accepts within 2 hours"); see BUILD-STATUS backend gaps. */
  acceptsWithinHours?: number;
  lines: QuoteLine[];
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
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
};

/** checkout.deliveryWindows */
export type DeliveryWindows = {
  days: Array<{ day: string; slots: Array<{ from: string; to: string }> }>;
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
};

/** checkout.contactDefaults */
export type ContactDefaults = { name: string | null; phone: string | null; email: string | null };

/** checkout.place */
export type PlaceResult = {
  checkoutId: string;
  reference: string;
  totalKobo: number;
  orders: Array<{ orderId: string; number: string; farmName: string; totalKobo: number }>;
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
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  window: { day: string; from: string; to: string } | null;
  isActive: boolean;
  pickupCode?: string | null;
};

export type CheckoutStatus = "awaiting_payment" | "paid" | "abandoned" | string;

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
    /** Not sent yet: when the attempt started, and the card's last 4 digits. */
    startedAt?: number;
    cardLast4?: string;
  } | null;
  orders: OrderRow[];
  payments?: { live: boolean; testStep: boolean };
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
  /** Not sent yet: where it goes, for "A Farmkeke rider delivers to …". */
  address?: { street: string; landmark?: string; areaName?: string } | null;
  pickupPoint?: { name: string; address?: string } | null;
};

/** payments/checkout.start (live mode) */
export type PaymentStart = { accessCode: string; authorizationUrl: string; reference: string };
