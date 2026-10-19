// Shapes for the account area (W-43 to W-49). These functions need a signed-in
// user, so there are no samples: every reader below is defensive and accepts
// the field names the live backend is likely to use, falling back safely.
// Known for sure (repo convex/): users.viewer, addresses.list, sessionStatus,
// and orders/consumer.list returning { active: [], past: [] }.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (...vals: unknown[]): string | undefined => {
  for (const v of vals) if (typeof v === "string" && v.length > 0) return v;
  return undefined;
};
const num = (...vals: unknown[]): number | undefined => {
  for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
};
const bool = (...vals: unknown[]): boolean | undefined => {
  for (const v of vals) if (typeof v === "boolean") return v;
  return undefined;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** users.viewer (repo: convex/users.ts) */
export type AccountViewer = {
  _id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isGuest?: boolean;
  isAnonymous?: boolean;
  staffRole?: string | null;
};

/** users.sessionStatus */
export type SessionStatus = "none" | "active" | "revoked";

/** addresses.list item (repo: convex/addresses.ts) */
export type SavedAddress = {
  _id: string;
  label: "home" | "work" | "other";
  street: string;
  landmark: string;
  serviceAreaId: string;
  isDefault: boolean;
  /** The map pin (W-46b "Set pin"), when one was set */
  latitude?: number;
  longitude?: number;
  /** Phase 5 (W-46b): "Directions for the rider" */
  directions?: string;
  area: { name: string; state: string; lga?: string } | null;
};

// ---------- Orders (orders/consumer.list) ----------

export type OrderItem = {
  listingId?: string;
  unitId?: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
};

export type AccountOrder = {
  id: string;
  number: string;
  farmName: string;
  status: string;
  totalKobo: number;
  itemCount: number;
  items: OrderItem[];
  fulfilment: "delivery" | "pickup" | null;
  createdAt: number | null;
  deliveredAt: number | null;
  /** e.g. "held", "released", "refunded" */
  escrow: string | null;
  /** e.g. "Arriving today, 12pm – 3pm" when the backend gives one */
  timingLabel: string | null;
  riderName: string | null;
  refunded: boolean;
  reviewed: boolean | null;
};

function readItem(raw: unknown): OrderItem | null {
  if (!isObj(raw)) return null;
  const listing = isObj(raw.listing) ? raw.listing : {};
  const name = str(raw.name, raw.listingName, raw.productName, raw.title, listing.name);
  if (!name) return null;
  return {
    listingId: str(raw.listingId, listing.id, listing._id),
    unitId: str(raw.unitId),
    name,
    imageUrl: str(raw.imageUrl, raw.photoUrl, listing.imageUrl) ?? null,
    quantity: num(raw.quantity, raw.qty) ?? 1,
  };
}

export function readOrder(raw: unknown): AccountOrder | null {
  if (!isObj(raw)) return null;
  const id = str(raw._id, raw.id, raw.orderId);
  if (!id) return null;
  const farm = isObj(raw.farm) ? raw.farm : {};
  const rider = isObj(raw.rider) ? raw.rider : {};
  const items = arr(raw.items ?? raw.lines).map(readItem).filter((i): i is OrderItem => i !== null);
  const escrowRaw = raw.escrow ?? raw.escrowStatus ?? raw.paymentStatus;
  const escrow = isObj(escrowRaw) ? (str(escrowRaw.status) ?? null) : (str(escrowRaw) ?? null);
  const fulfilmentRaw = str(raw.fulfilment, raw.fulfillment, raw.method, raw.deliveryMethod);
  const status = str(raw.status) ?? "paid";
  return {
    id,
    number: str(raw.number, raw.orderNumber, raw.code, raw.reference) ?? "",
    farmName: str(raw.farmName, farm.name) ?? "Farm",
    status,
    totalKobo: num(raw.totalKobo, raw.totalPaidKobo, raw.amountKobo, raw.total, raw.grandTotalKobo) ?? 0,
    itemCount: num(raw.itemCount, raw.itemsCount) ?? (items.length || 1),
    items,
    fulfilment: fulfilmentRaw === "pickup" ? "pickup" : fulfilmentRaw === "delivery" ? "delivery" : null,
    createdAt: num(raw.createdAt, raw.placedAt, raw.paidAt, raw._creationTime) ?? null,
    deliveredAt: num(raw.deliveredAt, raw.collectedAt) ?? null,
    escrow,
    timingLabel: str(raw.timingLabel, raw.windowLabel, raw.etaLabel, raw.deliveryWindowLabel, raw.statusLine) ?? null,
    riderName: str(raw.riderName, rider.name) ?? null,
    refunded: bool(raw.refunded) ?? (escrow === "refunded" || status === "refunded"),
    reviewed: bool(raw.reviewed, raw.hasReview) ?? null,
  };
}

export function readOrders(raw: unknown): { active: AccountOrder[]; past: AccountOrder[] } | null {
  if (raw === undefined) return null;
  const read = (list: unknown) => arr(list).map(readOrder).filter((o): o is AccountOrder => o !== null);
  if (isObj(raw)) return { active: read(raw.active), past: read(raw.past) };
  // A flat list: split by status.
  const all = read(raw);
  return { active: all.filter((o) => isActiveStatus(o.status)), past: all.filter((o) => !isActiveStatus(o.status)) };
}

const ACTIVE = new Set([
  "awaiting_payment",
  "paid",
  "accepted",
  "preparing",
  "ready_for_rider",
  "out_for_delivery",
  "with_rider",
  "at_pickup_point",
  "delivered",
  "collected",
  "disputed",
]);
export const isActiveStatus = (s: string) => ACTIVE.has(s);
/** Delivered or collected, and waiting for the buyer to confirm receipt. */
export const awaitsConfirmation = (o: AccountOrder) => o.status === "delivered" || o.status === "collected";

// ---------- Saved items (favorites.list) ----------

export type SavedItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceKobo: number;
  unit: string;
  farmName?: string;
  available: boolean;
  backInStock: boolean;
  harvestedOn: string | null;
};

export function readSaved(raw: unknown): SavedItem[] | null {
  if (raw === undefined) return null;
  const list = isObj(raw) ? arr(raw.items ?? raw.page ?? raw.listings) : arr(raw);
  return list
    .map((r): SavedItem | null => {
      if (!isObj(r)) return null;
      const l = isObj(r.listing) ? { ...r, ...r.listing } : r;
      const id = str(l.listingId, l.id, (r.listing as Obj | undefined)?._id, l._id);
      const name = str(l.name);
      if (!id || !name) return null;
      const stock = num(l.stock);
      const soldOut = bool(l.soldOut);
      const available = bool(l.available, l.inStock) ?? (soldOut !== undefined ? !soldOut : stock !== undefined ? stock > 0 : true);
      return {
        id,
        name,
        imageUrl: str(l.imageUrl, l.photoUrl) ?? null,
        priceKobo: num(l.priceKobo) ?? 0,
        unit: str(l.unit, l.unitLabel) ?? "",
        farmName: str(l.farmName, isObj(l.farm) ? l.farm.name : undefined),
        available,
        backInStock: bool(l.backInStock) ?? false,
        harvestedOn: str(l.harvestedOn) ?? null,
      };
    })
    .filter((i): i is SavedItem => i !== null);
}

// ---------- Notification preferences (notifications.preferences) ----------

export type PrefChannel = "push" | "sms" | "email";
export type PrefRow = {
  alert: string;
  title?: string;
  description?: string;
  locked: boolean;
  on: Partial<Record<PrefChannel, boolean>>;
};

function readChannels(o: Obj): Partial<Record<PrefChannel, boolean>> {
  const src = isObj(o.channels) ? o.channels : o;
  const out: Partial<Record<PrefChannel, boolean>> = {};
  for (const c of ["push", "sms", "email"] as const) {
    const v = src[c];
    if (typeof v === "boolean") out[c] = v;
  }
  return out;
}

/** Accepts a list of rows, a { alerts: [...] } object, {alert, channel, on} rows, or a map. */
export function readPrefs(raw: unknown): PrefRow[] | null {
  if (raw === undefined) return null;
  if (raw === null) return [];
  const list = Array.isArray(raw)
    ? raw
    : isObj(raw) && Array.isArray(raw.alerts ?? raw.items ?? raw.preferences ?? raw.rows)
      ? arr(raw.alerts ?? raw.items ?? raw.preferences ?? raw.rows)
      : null;
  const rows = new Map<string, PrefRow>();
  if (list) {
    for (const r of list) {
      if (!isObj(r)) continue;
      const alert = str(r.alert, r.key, r.id, r.type);
      if (!alert) continue;
      const row = rows.get(alert) ?? {
        alert,
        title: str(r.title, r.label, r.name),
        description: str(r.description, r.desc, r.detail),
        locked: bool(r.locked, r.required, r.alwaysOn) ?? false,
        on: {},
      };
      const channel = str(r.channel) as PrefChannel | undefined;
      if (channel && typeof r.on === "boolean") row.on[channel] = r.on;
      else Object.assign(row.on, readChannels(r));
      rows.set(alert, row);
    }
    return [...rows.values()];
  }
  if (isObj(raw)) {
    for (const [alert, v] of Object.entries(raw)) {
      if (isObj(v)) rows.set(alert, { alert, locked: bool(v.locked, v.required) ?? false, on: readChannels(v) });
    }
  }
  return [...rows.values()];
}

// ---------- Exact shapes from the rebuilt backend (convex/) ----------

/** favorites.list item (convex/favorites.ts) */
export type FavoriteItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceKobo: number;
  unit: string;
  farmName: string;
  harvestedOn: string | null;
  available: boolean;
  unavailableReason: "unavailable" | "sold_out" | null;
  savedAt: number;
  /** Phase 5 (W-47): stock came back since the last visit to Saved items. */
  backInStock?: boolean;
  /** Phase 5 (W-47): the item's "Notify me" switch. */
  notify?: boolean;
  farmId?: string;
  unitId?: string;
};

/** orders/consumer.recentItems (W-43 "Buy again"), Phase 5 */
export type RecentItem = {
  listingId: string;
  unitId: string;
  name: string;
  imageUrl: string | null;
  priceKobo: number;
  unitSingular: string;
  unitPlural: string;
  farmId: string;
  farmName: string;
  lastOrderedAt: number;
  lastQuantity: number;
};

/** notifications.preferences (convex/notifications.ts, lib/alerts.ts) */
export type NotificationPrefs = {
  side: "shop" | "farm";
  channels: Array<"push" | "sms" | "email">;
  hasEmail: boolean;
  alerts: Array<{
    alert: string;
    title: string;
    description: string;
    locked: boolean;
    push: boolean;
    sms: boolean;
    email: boolean;
  }>;
} | null;
