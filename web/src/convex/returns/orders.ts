// Order, dispute, refund, review and chat shapes for the order pages (W-50 to W-58).
//
// OrderDetail below is copied from the rebuilt backend (convex/lib/orders.ts
// orderCore + convex/orders/consumer.ts consumerView). The older readers
// further down stay for responses whose shape isn't pinned down yet.
//
// The live functions (orders/consumer.get/find, disputes.*, payments/refunds.forOrder,
// reviews.forOrder, chat.*) need the order owner's identity, so there are no
// samples in convex-spec/samples/. Every reader below is defensive: it accepts
// the field names the backend is likely to use, treats everything as optional,
// and turns the raw response into one stable "view" shape the pages render.

/** orders/consumer.get and .find (consumerView). */
export type OrderDetailItem = {
  index: number;
  listingId: string;
  unitId: string;
  name: string;
  quantity: number;
  priceKobo: number;
  unitSingular: string;
  unitPlural: string;
  unitLabel: string;
  lineTotalKobo: number;
  imageUrl: string | null;
};

export type OrderPickupPoint = {
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
  photoUrl: string | null;
};

/** Pickup at the farm: where and when to collect. */
export type OrderCollectFrom = {
  farmName: string;
  address: string;
  lga: string;
  state: string;
  hours: Array<{ day: number; opens: string; closes: string }>;
  phone: string;
  collectWithinDays: number;
};

/** A delivery order's bill: waiting for the price, ready to pay, paid, or lapsed. */
export type OrderBill = {
  state: "waiting_for_price" | "ready_to_pay" | "paid" | "not_paid";
  checkoutId: string;
  totalKobo: number;
  deliveryFeeKobo: number;
  billedAt: number | null;
  payBy: number | null;
  /** The pay link token (the owner's device only) */
  payToken: string | null;
};

export type OrderDetail = {
  _id: string;
  number: string;
  status: string;
  escrow: "none" | "held" | "released" | "refunded" | "split" | string;
  escrowHold?: boolean;
  fulfilment: "delivery" | "pickup";
  farm: { _id: string; name: string; area?: string } | null;
  farmName: string;
  farmId: string;
  items: OrderDetailItem[];
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  placedAt: number;
  paidAt: number | null;
  respondBy: number | null;
  acceptedAt: number | null;
  preparingAt: number | null;
  packedAt: number | null;
  readyAt: number | null;
  outForDeliveryAt: number | null;
  arrivedAt: number | null;
  collectBy: number | null;
  deliveredAt: number | null;
  confirmedAt: number | null;
  releasedAt: number | null;
  endedAt: number | null;
  declineReason: string | null;
  cancelReason: string | null;
  window: { day: string; from: string; to: string } | null;
  /** street and landmark are null on a view-only order (W-51c) */
  address: { street: string | null; landmark: string | null; areaName?: string; lga?: string; state?: string } | null;
  pickupPoint: OrderPickupPoint | null;
  /** Pickup at the farm (orders without a pickup point) */
  collectFrom?: OrderCollectFrom | null;
  /** Delivery: priced once the farm accepts; paid by bill */
  deliveryPricedAt?: number | null;
  paid?: boolean;
  bill?: OrderBill | null;
  rider: { name: string; phone?: string } | null;
  riderCollectAt: number | null;
  disputeId: string | null;
  hasRefund: boolean;
  reviewed: boolean;
  isActive: boolean;
  events: Array<{ kind: string; status: string; at: number; actorKind?: string; note: string | null }>;
  pickupCode: string | null;
  contact: { name: string; phone: string | null; email?: string };
  canConfirm: boolean;
  canReport: boolean;
  viewOnly: boolean;
  /** Phase 5 (W-51c, view only): the order's email, masked ("a***@gmail.com"); null without one */
  linkEmailHint?: string | null;
};

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const obj = (o: Raw | undefined, ...keys: string[]): Raw | undefined => {
  for (const k of keys) if (o && isObj(o[k])) return o[k] as Raw;
  return undefined;
};
const str = (o: Raw | undefined, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "string" && v.trim() !== "") return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
};
const num = (o: Raw | undefined, ...keys: string[]): number | undefined => {
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
};
const bool = (o: Raw | undefined, ...keys: string[]): boolean | undefined => {
  for (const k of keys) if (typeof o?.[k] === "boolean") return o[k] as boolean;
  return undefined;
};
const arr = (o: Raw | undefined, ...keys: string[]): unknown[] => {
  for (const k of keys) if (Array.isArray(o?.[k])) return o![k] as unknown[];
  return [];
};
/** Time fields may be epoch ms or ISO strings. */
const time = (o: Raw | undefined, ...keys: string[]): number | undefined => {
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return undefined;
};
const photoUrls = (o: Raw | undefined): string[] =>
  [...arr(o, "photoUrls", "photos", "images", "attachments")]
    .map((p) => (typeof p === "string" ? p : isObj(p) ? str(p, "url", "photoUrl") : undefined))
    .filter((u): u is string => !!u && /^(https?:|blob:|data:)/.test(u));

// ---------------------------------------------------------------------------
// Orders

/** Where an order is in the escrow flow (Screen Inventory "Escrow order states"). */
export type OrderStage =
  | "awaiting_payment"
  | "paid"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "at_pickup_point"
  | "delivered"
  | "collected"
  | "completed"
  | "disputed"
  | "declined"
  | "expired"
  | "cancelled"
  | "refunded"
  | "unknown";

const STAGE_WORDS: Array<[RegExp, OrderStage]> = [
  [/await\w*pay|pending_pay|unpaid|payment_pending/, "awaiting_payment"],
  [/await\w*confirm|to_confirm|unconfirmed/, "delivered"],
  [/pending_accept|await\w*accept|await\w*farm|^new$|^paid$|^placed$/, "paid"],
  [/disput|problem/, "disputed"],
  [/declin|reject/, "declined"],
  [/expir/, "expired"],
  [/cancel/, "cancelled"],
  [/refund/, "refunded"],
  [/complet|confirm|released|closed|done/, "completed"],
  [/^collected$|collected_by|collected_at_point/, "collected"],
  [/delivered/, "delivered"],
  [/out_for|with_rider|in_transit|on_the_way|dispatch|collected_from_farm|picked_up/, "out_for_delivery"],
  [/pickup_point|at_point|ready_for_pickup|ready_for_collection|awaiting_collection|at_pickup/, "at_pickup_point"],
  [/ready|packed|handover|handed/, "ready"],
  [/prepar|to_prepare/, "preparing"],
  [/accept/, "accepted"],
  [/paid|new|placed|held|pending/, "paid"],
];

export function stageOf(status: string | undefined): OrderStage {
  if (!status) return "unknown";
  const s = status.toLowerCase().replace(/[\s-]+/g, "_");
  for (const [re, stage] of STAGE_WORDS) if (re.test(s)) return stage;
  return "unknown";
}

/** Rank on the happy path, used to mark timeline steps done. */
export const STAGE_RANK: Record<OrderStage, number> = {
  awaiting_payment: 0,
  paid: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  out_for_delivery: 5,
  at_pickup_point: 5,
  delivered: 6,
  collected: 6,
  completed: 7,
  disputed: 6,
  declined: -1,
  expired: -1,
  cancelled: -1,
  refunded: -1,
  unknown: 1,
};

export type OrderItem = {
  index: number;
  name: string;
  quantity: number;
  unitLabel: string;
  lineKobo: number;
  imageUrl: string | null;
  key: string;
};

export type PickupPointView = {
  name: string;
  address?: string;
  lga?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  hours: Array<{ day: number; opens: string; closes: string }>;
  collectWithinDays?: number;
};

export type OrderView = {
  id: string;
  number: string;
  status: string;
  stage: OrderStage;
  fulfilment: "delivery" | "pickup";
  farmName: string;
  farmId?: string;
  placedAt?: number;
  items: OrderItem[];
  itemsKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  /** Escrow state when the backend gives it */
  escrow?: string;
  /** When each step happened (epoch ms), when the backend gives it */
  at: Partial<Record<"paid" | "accepted" | "preparing" | "ready" | "out" | "arrived" | "delivered" | "confirmed", number>>;
  acceptBy?: number;
  window?: { day?: string; from?: string; to?: string };
  rider?: { name: string; phone?: string };
  address?: { line: string; landmark?: string; area?: string };
  pickup?: { code?: string; point?: PickupPointView; collectBy?: number };
  contactPhone?: string;
  /** false when this device/user may only view (W-51c) */
  canAct: boolean;
  disputeId?: string;
  hasRefund: boolean;
  reviewed: boolean;
};

function readItems(o: Raw | undefined): OrderItem[] {
  return arr(o, "items", "lines", "orderItems").map((x, index) => {
    const it = isObj(x) ? x : {};
    const listing = obj(it, "listing", "product");
    const unit = obj(it, "unit");
    const quantity = num(it, "quantity", "qty") ?? 1;
    const unitPrice = num(it, "priceKobo", "unitPriceKobo") ?? 0;
    const lineKobo = num(it, "lineTotalKobo", "totalKobo", "subtotalKobo", "amountKobo") ?? unitPrice * quantity;
    const unitLabel =
      str(it, "unitLabel", "unitName", "unitSingular") ??
      (typeof it.unit === "string" ? it.unit : undefined) ??
      str(unit, "singular", "name", "label") ??
      "";
    return {
      index: num(it, "index") ?? index,
      name: str(it, "name", "listingName", "productName", "title") ?? str(listing, "name") ?? "Item",
      quantity,
      unitLabel,
      lineKobo,
      imageUrl: str(it, "imageUrl", "photoUrl") ?? str(listing, "imageUrl") ?? null,
      key: str(it, "_id", "id", "listingId") ?? `item-${index}`,
    };
  });
}

function readPoint(p: Raw | undefined): PickupPointView | undefined {
  if (!p) return undefined;
  return {
    name: str(p, "name") ?? "Pickup point",
    address: str(p, "address"),
    lga: str(p, "lga"),
    phone: str(p, "phone"),
    latitude: num(p, "latitude", "lat"),
    longitude: num(p, "longitude", "lng"),
    hours: arr(p, "hours")
      .filter(isObj)
      .map((h) => ({ day: num(h, "day") ?? 0, opens: str(h, "opens") ?? "", closes: str(h, "closes") ?? "" }))
      .filter((h) => h.opens && h.closes),
    collectWithinDays: num(p, "collectWithinDays"),
  };
}

export function toOrderView(raw: unknown): OrderView | null {
  if (!isObj(raw)) return null;
  // Some responses wrap the order: { order, items, ... }
  const o: Raw = isObj(raw.order) ? { ...raw, ...(raw.order as Raw) } : raw;
  const id = str(o, "_id", "id", "orderId");
  if (!id) return null;
  const status = str(o, "status", "state") ?? "";
  const farm = obj(o, "farm");
  const items = readItems(o);
  const itemsKobo = num(o, "itemsKobo", "subtotalKobo", "itemsTotalKobo", "productsKobo") ?? items.reduce((s, i) => s + i.lineKobo, 0);
  const deliveryFeeKobo = num(o, "deliveryFeeKobo", "deliveryKobo", "feeKobo") ?? 0;
  const totalKobo = num(o, "totalKobo", "amountKobo", "totalPaidKobo") ?? itemsKobo + deliveryFeeKobo;
  const fulfilmentRaw = str(o, "fulfilment", "fulfillment", "method");
  const pointRaw = obj(o, "pickupPoint", "point");
  const fulfilment: "delivery" | "pickup" = fulfilmentRaw === "pickup" || (!fulfilmentRaw && pointRaw) ? "pickup" : "delivery";
  const timeline = obj(o, "timestamps", "times", "at");
  const ev = (...keys: string[]) => time(timeline, ...keys) ?? time(o, ...keys);
  // Events as a list: [{ status|kind, at|time }]
  const events = arr(o, "events", "timeline", "history").filter(isObj);
  const evAt = (stage: OrderStage[]) => {
    const hit = events.find((e) => stage.includes(stageOf(str(e, "status", "kind", "type", "step"))));
    return hit ? time(hit, "at", "time", "createdAt", "_creationTime") : undefined;
  };
  const rider = obj(o, "rider");
  const riderName = str(rider, "name") ?? str(o, "riderName");
  const addr = obj(o, "address", "deliveryAddress");
  const addrLine = str(addr, "street", "line", "address") ?? (typeof o.address === "string" ? o.address : undefined);
  const windowRaw = obj(o, "window", "deliveryWindow");
  const pickupRaw = obj(o, "pickup");
  const contact = obj(o, "contact");
  const dispute = obj(o, "dispute");
  const review = obj(o, "review");
  const viewOnly = bool(o, "viewOnly", "readOnly");
  const canConfirm = bool(o, "canConfirm", "canAct", "isOwner", "mine");
  const stage = stageOf(status);
  return {
    id,
    number: str(o, "number", "orderNumber", "reference", "code") ?? "",
    status,
    stage,
    fulfilment,
    farmName: str(farm, "name") ?? str(o, "farmName") ?? "the farm",
    farmId: str(farm, "_id", "id") ?? str(o, "farmId"),
    placedAt: ev("placedAt", "paidAt", "createdAt") ?? evAt(["paid"]) ?? time(o, "_creationTime"),
    items,
    itemsKobo,
    deliveryFeeKobo,
    totalKobo,
    escrow: str(o, "escrow", "escrowStatus", "escrowState", "paymentStatus"),
    at: {
      paid: ev("paidAt", "placedAt", "createdAt") ?? evAt(["paid"]),
      accepted: ev("acceptedAt") ?? evAt(["accepted"]),
      preparing: ev("preparingAt", "startedPreparingAt") ?? evAt(["preparing"]),
      ready: ev("readyAt", "packedAt", "readyForRiderAt", "handedOverAt") ?? evAt(["ready"]),
      out: ev("outForDeliveryAt", "dispatchedAt", "pickedUpAt", "collectedFromFarmAt") ?? evAt(["out_for_delivery"]),
      arrived: ev("arrivedAt", "atPickupPointAt", "droppedAt", "readyForPickupAt") ?? evAt(["at_pickup_point"]),
      delivered: ev("deliveredAt", "collectedAt") ?? evAt(["delivered", "collected"]),
      confirmed: ev("confirmedAt", "releasedAt", "completedAt") ?? evAt(["completed"]),
    },
    acceptBy: ev("acceptBy", "acceptDeadline", "respondBy", "expiresAt", "farmerDeadline"),
    window: windowRaw
      ? { day: str(windowRaw, "day", "date"), from: str(windowRaw, "from", "start"), to: str(windowRaw, "to", "end") }
      : undefined,
    rider: riderName ? { name: riderName, phone: str(rider, "phone") ?? str(o, "riderPhone") } : undefined,
    address: addrLine
      ? {
          line: [addrLine, str(addr, "areaName", "area", "lga")].filter(Boolean).join(", "),
          landmark: str(addr, "landmark"),
          area: str(addr, "areaName", "area", "lga"),
        }
      : undefined,
    pickup:
      fulfilment === "pickup"
        ? {
            code: str(o, "pickupCode") ?? str(pickupRaw, "code"),
            point: readPoint(pointRaw ?? obj(pickupRaw, "point")),
            collectBy: ev("collectBy", "collectByAt", "pickupDeadline") ?? time(pickupRaw, "collectBy"),
          }
        : undefined,
    contactPhone: str(contact, "phone") ?? str(o, "phone", "contactPhone"),
    canAct: viewOnly === true ? false : canConfirm ?? true,
    disputeId: str(o, "disputeId") ?? str(dispute, "_id", "id"),
    hasRefund: !!(bool(o, "hasRefund") ?? obj(o, "refund")),
    reviewed: !!(bool(o, "reviewed", "hasReview") ?? review),
  };
}

/** Status badge text and colour class (words always shown, never colour alone). */
export function statusBadge(o: Pick<OrderView, "stage" | "fulfilment">): { label: string; cls: string } {
  switch (o.stage) {
    case "awaiting_payment":
      return { label: "Awaiting payment", cls: "b-pend" };
    case "paid":
      return { label: "Waiting for the farm", cls: "b-pend" };
    case "accepted":
      return { label: "Accepted", cls: "b-pend" };
    case "preparing":
      return { label: "Preparing", cls: "b-pend" };
    case "ready":
      return { label: o.fulfilment === "pickup" ? "On its way to the pickup point" : "Ready for rider", cls: "b-pend" };
    case "out_for_delivery":
      return { label: o.fulfilment === "pickup" ? "On its way to the pickup point" : "Out for delivery", cls: "b-pend" };
    case "at_pickup_point":
      return { label: "Ready for pickup", cls: "b-ok" };
    case "delivered":
      return { label: "Delivered", cls: "b-ok" };
    case "collected":
      return { label: "Collected", cls: "b-ok" };
    case "completed":
      return { label: "Completed", cls: "b-ok" };
    case "disputed":
      return { label: "Problem reported", cls: "b-err" };
    case "declined":
      return { label: "Declined by farm", cls: "b-err" };
    case "expired":
      return { label: "Expired", cls: "b-grey" };
    case "cancelled":
      return { label: "Cancelled", cls: "b-grey" };
    case "refunded":
      return { label: "Refunded", cls: "b-grey" };
    default:
      return { label: "In progress", cls: "b-grey" };
  }
}

// ---------------------------------------------------------------------------
// Disputes

export type DisputeReason = "missing" | "damaged" | "wrong_item" | "not_received" | "short" | "other";

export type DisputeMessage = {
  key: string;
  from: "consumer" | "farmer" | "staff";
  name?: string;
  body: string;
  photos: string[];
  at?: number;
};

export type DisputeView = {
  id: string;
  number: string;
  status: string;
  phase: "awaiting_farm" | "reviewing" | "resolved";
  reason?: DisputeReason;
  itemIndexes: number[];
  note: string;
  photos: string[];
  amountKobo?: number;
  createdAt?: number;
  farmRepliedAt?: number;
  farmReplyBy?: number;
  decideBy?: number;
  decidedAt?: number;
  farmResponse?: string;
  outcome?: string;
  messages: DisputeMessage[];
};

function fromOf(m: Raw): DisputeMessage["from"] {
  const s = (str(m, "as", "from", "author", "role", "side", "senderRole") ?? "").toLowerCase();
  if (/farm/.test(s)) return "farmer";
  if (/staff|admin|support|farmkeke/.test(s)) return "staff";
  return "consumer";
}

export function toDisputeView(raw: unknown): DisputeView | null {
  if (!isObj(raw)) return null;
  const d: Raw = isObj(raw.dispute) ? { ...raw, ...(raw.dispute as Raw) } : raw;
  const id = str(d, "_id", "id", "disputeId");
  if (!id) return null;
  const status = str(d, "status", "state") ?? "";
  const s = status.toLowerCase();
  const farmReply = obj(d, "farmResponse", "response", "farmerResponse");
  const farmRepliedAt = time(d, "farmRepliedAt", "respondedAt") ?? time(farmReply, "at", "createdAt", "_creationTime");
  const decidedAt = time(d, "decidedAt", "resolvedAt");
  const phase: DisputeView["phase"] =
    decidedAt || /resolv|decid|closed|refund|releas|split/.test(s)
      ? "resolved"
      : farmRepliedAt || /review|respond|replied/.test(s)
        ? "reviewing"
        : "awaiting_farm";
  const reason = str(d, "reason") as DisputeReason | undefined;
  const messages = arr(d, "messages", "thread").filter(isObj).map((m, i) => ({
    key: str(m, "_id", "id") ?? `m-${i}`,
    from: fromOf(m),
    name: str(m, "name", "authorName", "senderName"),
    body: str(m, "body", "text", "note") ?? "",
    photos: photoUrls(m),
    at: time(m, "at", "createdAt", "_creationTime"),
  }));
  const createdAt = time(d, "createdAt", "openedAt", "_creationTime");
  return {
    id,
    number: str(d, "number", "caseNumber", "reference", "code") ?? "",
    status,
    phase,
    reason,
    itemIndexes: arr(d, "itemIndexes", "items").filter((n): n is number => typeof n === "number"),
    note: str(d, "note", "description") ?? "",
    photos: photoUrls(d),
    amountKobo: num(d, "amountKobo", "disputedKobo", "amountInQuestionKobo"),
    createdAt,
    farmRepliedAt,
    farmReplyBy: time(d, "farmReplyBy", "respondBy", "farmDeadline", "responseDeadline"),
    decideBy: time(d, "decideBy", "decisionBy", "decisionDeadline"),
    decidedAt,
    farmResponse: str(d, "farmResponseNote") ?? str(farmReply, "note", "body", "text") ?? (typeof d.farmResponse === "string" ? d.farmResponse : undefined),
    outcome: str(d, "outcome", "decision", "resolution"),
    messages,
  };
}

// ---------------------------------------------------------------------------
// Refunds

export type RefundView = {
  id: string;
  amountKobo: number;
  status: string;
  phase: "decided" | "sent" | "with_bank" | "settled" | "failed";
  kind?: "full" | "part";
  method?: string;
  reference?: string;
  decidedAt?: number;
  sentAt?: number;
  settledAt?: number;
  releasedToFarmKobo?: number;
  disputeNumber?: string;
  description?: string;
};

export function toRefundView(raw: unknown): RefundView | null {
  const r0 = Array.isArray(raw) ? raw[raw.length - 1] : raw;
  if (!isObj(r0)) return null;
  const r: Raw = isObj(r0.refund) ? { ...r0, ...(r0.refund as Raw) } : r0;
  const amountKobo = num(r, "amountKobo", "refundKobo", "kobo");
  if (amountKobo === undefined) return null;
  const status = str(r, "status", "state") ?? "";
  const s = status.toLowerCase();
  const method = obj(r, "method", "paymentMethod", "channel");
  const last4 = str(method, "last4") ?? str(r, "last4", "cardLast4");
  const methodKind = (str(method, "kind", "type", "channel") ?? str(r, "channel", "methodKind") ?? "").toLowerCase();
  const methodLabel =
    str(r, "methodLabel", "destination") ??
    (last4 ? `Card ending ${last4}` : /bank|transfer/.test(methodKind) ? "Your bank account" : /card/.test(methodKind) ? "Your card" : undefined);
  const kindRaw = (str(r, "kind", "type", "scope") ?? "").toLowerCase();
  return {
    id: str(r, "_id", "id") ?? "refund",
    amountKobo,
    status,
    phase: /fail|error|revers/.test(s)
      ? "failed"
      : /settled|success|complete|received|done/.test(s)
        ? "settled"
        : /processing|with_bank|pending_bank|sent|transit/.test(s)
          ? "with_bank"
          : /send|initi/.test(s)
            ? "sent"
            : "decided",
    kind: /part|split/.test(kindRaw) ? "part" : /full/.test(kindRaw) ? "full" : undefined,
    method: methodLabel,
    reference: str(r, "reference", "refundReference", "number", "providerReference"),
    decidedAt: time(r, "decidedAt", "createdAt", "_creationTime"),
    sentAt: time(r, "sentAt", "initiatedAt"),
    settledAt: time(r, "settledAt", "completedAt"),
    releasedToFarmKobo: num(r, "releasedToFarmKobo", "releasedKobo", "farmKobo"),
    disputeNumber: str(r, "disputeNumber", "caseNumber"),
    description: str(r, "description", "note", "reason"),
  };
}

// ---------------------------------------------------------------------------
// Reviews

export type ReviewView = { rating: number; tags: string[]; comment?: string };

export function toReviewView(raw: unknown): ReviewView | null {
  if (!isObj(raw)) return null;
  const r: Raw = isObj(raw.review) ? (raw.review as Raw) : raw;
  const rating = num(r, "rating", "stars");
  if (rating === undefined) return null;
  return { rating, tags: arr(r, "tags").filter((t): t is string => typeof t === "string"), comment: str(r, "comment") };
}

// ---------------------------------------------------------------------------
// Chat

export type ChatMessage = {
  key: string;
  mine: boolean;
  body: string;
  photos: string[];
  at: number;
  read: boolean;
};

export function toChatMessage(raw: unknown, i: number): ChatMessage | null {
  if (!isObj(raw)) return null;
  const side = (str(raw, "side", "from", "senderSide", "author", "as") ?? "").toLowerCase();
  const mine = bool(raw, "mine", "isMine", "fromMe") ?? /shop|consumer|buyer|customer/.test(side);
  return {
    key: str(raw, "_id", "id") ?? `c-${i}`,
    mine,
    body: str(raw, "body", "text") ?? "",
    photos: photoUrls(raw),
    at: time(raw, "createdAt", "sentAt", "at", "_creationTime") ?? 0,
    read: !!(bool(raw, "read", "isRead", "seen") ?? time(raw, "readAt", "seenAt")),
  };
}

export type ChatThreadView = { farmName?: string; replyNote?: string; unread: number };

export function toChatThread(raw: unknown): ChatThreadView | null {
  if (!isObj(raw)) return null;
  const farm = obj(raw, "farm", "other", "counterpart");
  return {
    farmName: str(farm, "name") ?? str(raw, "farmName", "title"),
    replyNote: str(raw, "replyNote", "responseTime"),
    unread: num(raw, "unread", "unreadCount") ?? 0,
  };
}

/** Upload URL response: the URL string itself, or { url } / { uploadUrl }. */
export function readUploadUrl(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw;
  if (isObj(raw)) return str(raw, "url", "uploadUrl");
  return undefined;
}

// ---------------------------------------------------------------------------
// Exact shapes from the rebuilt backend (convex/), used by the group C pages.

/** disputes.get / disputes.forOrder (convex/lib/disputes.ts disputeView) */
export type DisputeDetail = {
  as?: "consumer" | "farmer";
  _id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  farmId: string;
  farmName: string;
  consumerFirstName: string;
  reason: DisputeReason;
  reasonLabel: string;
  items: Array<{
    index: number;
    name: string;
    quantity: number;
    unitLabel: string;
    lineTotalKobo: number;
    /** Phase 5: units affected ("1 of 2 baskets") and their value */
    affectedQuantity?: number;
    affectedUnitLabel?: string;
    affectedKobo?: number;
  }>;
  note: string;
  photos: string[];
  amountKobo: number;
  status: "open" | "farmer_responded" | "resolved";
  reportedAt: number;
  farmReplyBy: number;
  decideBy: number;
  farmResponse: {
    at: number;
    note: string;
    photos: string[];
    /** Phase 5 (W-54): "Agrees to refund"; null for replies without a stance */
    stance?: "agrees" | "disagrees" | "partly" | null;
    stanceLabel?: string | null;
  } | null;
  decision: { outcome: "released" | "refunded" | "split"; refundKobo: number; releaseKobo: number; note: string; at: number | null } | null;
  heldKobo: number;
  deliveryFeeKobo: number;
  itemsTotalKobo: number;
  canMessage: boolean;
  unread: boolean;
  messages: Array<{
    _id: string;
    from: "consumer" | "farmer" | "staff";
    audience: string | null;
    mine: boolean;
    authorName: string | null;
    body: string;
    photos: string[];
    at: number;
  }>;
};

/** payments/refunds.forOrder item (convex/payments/refunds.ts) */
export type RefundRow = {
  _id: string;
  orderNumber: string;
  amountKobo: number;
  kind: "full" | "part";
  status: "queued" | "sending" | "processing" | "processed" | "failed";
  reason: string;
  methodLabel: string;
  channel: string | null;
  reference: string;
  simulated: boolean;
  decidedAt: number;
  sentAt: number | null;
  expectedAt: number | null;
  settledAt: number | null;
};

/** reviews.forOrder (convex/reviews.ts) */
export type ReviewForOrder = {
  orderId: string;
  number: string;
  status: string;
  farmId: string;
  farmName: string;
  farmPhotoUrl: string | null;
  deliveredAt: number | null;
  items: Array<{ name: string; quantity: number; imageUrl: string | null }>;
  canReview: boolean;
  review: { rating: number; tags: string[]; comment?: string } | null;
} | null;

/** chat.thread (convex/chat.ts) */
export type ChatThread = {
  conversationId: string | null;
  side: "shop" | "farm";
  canSend: boolean;
  unread: number;
  order: {
    _id: string;
    number: string;
    status: string;
    fulfilment: "delivery" | "pickup";
    summary: string;
    itemCount: number;
    totalKobo: number;
    imageUrl: string | null;
  };
  counterpart: { kind: "farm" | "shopper"; name: string; photoUrl: string | null };
  /** Not sent yet ("Usually replies within an hour"); see BUILD-STATUS backend gaps. */
  replyNote?: string;
} | null;

/** chat.messages page item */
export type ChatMessageRow = {
  _id: string;
  side: "shop" | "farm";
  mine: boolean;
  body: string;
  photos: string[];
  at: number;
  read: boolean;
};
