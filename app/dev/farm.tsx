// Sample farmer screens drawn with the real views, to check each one in the
// browser preview without a farmer account: /dev/farm?s=dashboard (orders,
// new, prepare, handover, pickup, waiting, declined, problem, slip, case,
// earnings, payout, reviews). Steps on the sample order work on this screen
// only (the pickup code is 4821). Nothing here touches the backend.
import { ConvexError } from "convex/values";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui";
import { DashboardView } from "@/features/farm/DashboardView";
import { DisputeView, type FarmDispute } from "@/features/farm/DisputeView";
import { EarningsView } from "@/features/farm/EarningsView";
import { FarmOrderView, type FarmOrder } from "@/features/farm/FarmOrderView";
import { OrdersView } from "@/features/farm/OrdersView";
import { PayoutView, type Payout } from "@/features/farm/PayoutView";
import { ReviewsView, type ReviewFilter } from "@/features/farm/ReviewsView";
import { SlipView, type Slip } from "@/features/farm/SlipView";
import type { FarmTab } from "@/features/farm/status";
import { colors, spacing } from "@/theme/tokens";

const H = 3_600_000;
const now = Date.now();
const wait = () => new Promise((r) => setTimeout(r, 500));

const items = [
  { index: 0, listingId: "l1", unitId: "u1", name: "Fresh tomatoes", quantity: 2, priceKobo: 450000, unitSingular: "basket", unitPlural: "baskets", unitLabel: "baskets", lineTotalKobo: 900000, imageUrl: null },
  { index: 1, listingId: "l2", unitId: "u2", name: "Ugwu leaves", quantity: 3, priceKobo: 80000, unitSingular: "bunch", unitPlural: "bunches", unitLabel: "bunches", lineTotalKobo: 240000, imageUrl: null },
];

const base = {
  _id: "sample",
  number: "FK-10234",
  status: "paid",
  escrow: "held",
  escrowHold: false,
  fulfilment: "delivery",
  farm: { _id: "farm", name: "Okafor Family Farms", area: "Owerri North" },
  farmName: "Okafor Family Farms",
  farmId: "farm",
  items,
  itemsTotalKobo: 1140000,
  deliveryFeeKobo: 150000,
  totalKobo: 1290000,
  placedAt: now - 3 * H,
  paidAt: now - 3 * H,
  respondBy: now + 21 * H + 14 * 60_000,
  acceptedAt: null,
  preparingAt: null,
  packedAt: null,
  readyAt: null,
  outForDeliveryAt: null,
  arrivedAt: null,
  collectBy: null,
  deliveredAt: null,
  confirmedAt: null,
  releasedAt: null,
  endedAt: null,
  declineReason: null,
  cancelReason: null,
  window: null,
  address: { street: "12 Wetheral Road", landmark: "Opposite the filling station", areaName: "New Owerri", lga: "Owerri North", state: "Imo", note: null },
  pickupPoint: null,
  collectFrom: null,
  deliveryPricedAt: now - 2 * H,
  paid: true,
  rider: null,
  riderCollectAt: null,
  disputeId: null,
  hasRefund: false,
  reviewed: false,
  isActive: true,
  events: [],
  consumer: { firstName: "Adaeze", phone: "+2348031234567" },
  declineNote: null,
  money: { productKobo: 1140000, feeKobo: 114000, netKobo: 1026000, final: false },
  next: "accept",
  paymentPending: false,
};

const rider = { name: "Chinedu Okeke", phone: "+2348039998877" };
const ORDERS: Record<string, object> = {
  new: base,
  prepare: { ...base, status: "preparing", acceptedAt: now - 2 * H, preparingAt: now - H, next: "mark_packed" },
  handover: { ...base, status: "ready_for_rider", acceptedAt: now - 5 * H, preparingAt: now - 4 * H, packedAt: now - 2 * H, readyAt: now - H, rider, riderCollectAt: now + H, next: "confirm_handover" },
  pickup: { ...base, fulfilment: "pickup", address: null, deliveryFeeKobo: 0, status: "ready_for_collection", acceptedAt: now - 5 * H, preparingAt: now - 4 * H, packedAt: now - 2 * H, readyAt: now - H, collectBy: now + 71 * H, next: "confirm_collection" },
  waiting: { ...base, status: "ready_for_rider", escrow: "none", paid: false, paidAt: null, paymentPending: true, acceptedAt: now - 5 * H, preparingAt: now - 4 * H, packedAt: now - 2 * H, readyAt: now - H, next: "waiting_for_payment" },
  declined: { ...base, status: "declined", escrow: "refunded", declineReason: "out_of_stock", declineNote: "Tomatoes sold out at the market", endedAt: now - 2 * H, isActive: false, next: null },
  problem: { ...base, status: "disputed", disputeId: "case1", acceptedAt: now - 30 * H, preparingAt: now - 29 * H, packedAt: now - 27 * H, readyAt: now - 27 * H, outForDeliveryAt: now - 26 * H, deliveredAt: now - 24 * H, rider: null, next: null },
};

const row = (o: Partial<typeof base> & { _id: string; number: string; status: string }, extra: object = {}) => ({
  ...base,
  ...o,
  itemCount: 2,
  summary: "2 × Fresh tomatoes + 1 more",
  imageUrl: null,
  checkoutId: "c1",
  consumerFirstName: "Adaeze",
  area: "New Owerri",
  ...extra,
});
const rows = {
  new: [row({ _id: "o1", number: "FK-10234", status: "paid" }), row({ _id: "o2", number: "FK-10241", status: "placed", respondBy: now + 4 * H }, { consumerFirstName: "Tunde", summary: "5 × Plantain", area: "Ikenegbu" }), row({ _id: "o3", number: "FK-10248", status: "paid", respondBy: now + 70 * 60_000, fulfilment: "pickup" }, { consumerFirstName: "Ngozi", summary: "1 × Palm oil (5 L)", area: null })],
  to_prepare: [row({ _id: "o4", number: "FK-10220", status: "preparing" }), row({ _id: "o5", number: "FK-10219", status: "accepted" }, { consumerFirstName: "Emeka" })],
};

const dash = {
  farm: { _id: "farm", name: "Okafor Family Farms", status: "active", holidayMode: false },
  counts: { new: 3, to_prepare: 2, with_rider: 1, disputed: 0 },
  newOrders: rows.new,
  toPrepare: rows.to_prepare,
  heldKobo: 4_872_000,
  commissionBps: 1000,
};

const slip = {
  number: "FK-10234",
  farmName: "Okafor Family Farms",
  placedAt: now - 3 * H,
  paidAt: now - 3 * H,
  consumerFirstName: "Adaeze",
  fulfilment: "delivery",
  area: "New Owerri, Owerri North",
  pickupPointName: null,
  window: null,
  items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitLabel: i.unitLabel, lineTotalKobo: i.lineTotalKobo })),
  itemsTotalKobo: 1140000,
};

const dispute = {
  as: "farmer",
  _id: "case1",
  number: "DS-1042",
  orderId: "sample",
  orderNumber: "FK-10234",
  farmId: "farm",
  farmName: "Okafor Family Farms",
  consumerFirstName: "Adaeze",
  reason: "damaged",
  reasonLabel: "Damaged or spoiled",
  items: [{ index: 0, name: "Fresh tomatoes", quantity: 2, unitLabel: "baskets", lineTotalKobo: 900000, affectedQuantity: 1, affectedUnitLabel: "basket", affectedKobo: 450000 }],
  note: "Half the tomatoes in one basket were crushed.",
  photos: [],
  amountKobo: 450000,
  status: "open",
  reportedAt: now - 5 * H,
  farmReplyBy: now + 19 * H,
  farmReplyOverdue: false,
  decideBy: now + 43 * H,
  farmResponse: null,
  decision: null,
  heldKobo: 1290000,
  deliveryFeeKobo: 150000,
  itemsTotalKobo: 1140000,
  canMessage: true,
  canRespond: true,
  unread: false,
  messages: [{ _id: "m1", from: "staff", audience: null, mine: false, authorName: "Farmkeke support", body: "Hi, could you share a photo of how the order was packed?", photos: [], at: now - 4 * H }],
};

const summary = {
  heldKobo: 4_872_000,
  heldOrders: 6,
  releasedKobo: 38_450_000,
  paidOutKobo: 35_200_000,
  pendingPayoutKobo: 3_250_000,
  failedPayoutKobo: 0,
  commissionKobo: 4_272_000,
  commissionBps: 1000,
  lastPayout: { amountKobo: 3_250_000, sentAt: now - 26 * H, status: "sent" },
  payoutAccount: { bankName: "Access Bank", accountLast4: "4821", accountName: "Okafor Family Farms" },
};
const tx = [
  { _id: "t1", at: now - 2 * H, kind: "release", direction: "in", amountKobo: 1026000, status: "done", orderId: "o1", orderNumber: "FK-10198", note: null, simulated: false },
  { _id: "t2", at: now - 2 * H, kind: "commission", direction: "fee", amountKobo: 114000, status: "done", orderId: "o1", orderNumber: "FK-10198", note: null, simulated: false },
  { _id: "t3", at: now - 26 * H, kind: "payout", direction: "paid_out", amountKobo: 3250000, status: "done", orderId: "o2", orderNumber: "FK-10180", note: null, simulated: false },
  { _id: "t4", at: now - 50 * H, kind: "release", direction: "in", amountKobo: 2224000, status: "done", orderId: "o3", orderNumber: "FK-10180", note: null, simulated: false },
] as const;
const payouts = [
  { _id: "p1", amountKobo: 3250000, status: "pending", reference: "FKP-20261022-0041", bankName: "Access Bank", accountLast4: "4821", simulated: false, createdAt: now - 3 * H, sentAt: null, failed: false },
  { _id: "p2", amountKobo: 5410000, status: "sent", reference: "FKP-20261015-0032", bankName: "Access Bank", accountLast4: "4821", simulated: false, createdAt: now - 8 * 24 * H, sentAt: now - 8 * 24 * H, failed: false },
] as const;
const payout = {
  ...payouts[1],
  items: [
    { orderId: "o1", number: "FK-10150", itemsTotalKobo: 3600000, commissionKobo: 360000, amountKobo: 3240000 },
    { orderId: "o2", number: "FK-10162", itemsTotalKobo: 2411111, commissionKobo: 241111, amountKobo: 2170000 },
  ],
};
const reviews = [
  { _id: "r1", rating: 5, tags: ["Fresh", "Well packed"], comment: "The tomatoes were firm and so fresh. Will order again.", reviewerName: "Adaeze N.", createdAt: now - 30 * H, orderId: "o1", orderNumber: "FK-10198", hidden: false },
  { _id: "r2", rating: 4, tags: ["On time"], comment: null, reviewerName: "Tunde A.", createdAt: now - 80 * H, orderId: "o2", orderNumber: "FK-10180", hidden: false },
  { _id: "r3", rating: 3, tags: [], comment: "Good ugwu, but one bunch was small.", reviewerName: null, createdAt: now - 200 * H, orderId: "o3", orderNumber: "FK-10150", hidden: false },
];

const SCREENS: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  new: "New order",
  prepare: "Packing",
  handover: "Hand to rider",
  pickup: "Pickup code",
  waiting: "Unpaid",
  declined: "Declined",
  problem: "Disputed",
  slip: "Packing slip",
  case: "Case reply",
  earnings: "Earnings",
  payout: "Payout",
  reviews: "Reviews",
};

// Moves the sample order along, as the backend would
function SampleOrder({ start }: { start: string }) {
  const [o, setO] = useState<Record<string, unknown>>(() => ORDERS[start] as Record<string, unknown>);
  const step = (patch: Record<string, unknown>) => async () => {
    await wait();
    setO((x) => ({ ...x, ...patch }));
  };
  return (
    <FarmOrderView
      key={start}
      now={now}
      order={o as unknown as FarmOrder}
      actions={{
        accept: step({ status: "accepted", acceptedAt: Date.now(), next: "start_preparing" }),
        decline: async (reason, note) => {
          await wait();
          setO((x) => ({ ...x, status: "declined", escrow: "refunded", declineReason: reason, declineNote: note ?? null, endedAt: Date.now(), isActive: false, next: null }));
        },
        startPreparing: step({ status: "preparing", preparingAt: Date.now(), next: "mark_packed" }),
        markPacked: step({ packedAt: Date.now(), next: "ready_for_rider" }),
        ready: step({ status: "ready_for_rider", readyAt: Date.now(), rider, next: "confirm_handover" }),
        handover: step({ status: "out_for_delivery", outForDeliveryAt: Date.now(), next: null }),
        collect: async (code) => {
          await wait();
          if (code !== "4821") throw new ConvexError({ code: "WRONG_PICKUP_CODE" });
          setO((x) => ({ ...x, status: "collected", deliveredAt: Date.now(), next: null }));
        },
      }}
    />
  );
}

export default function FarmSamples() {
  const { s = "dashboard" } = useLocalSearchParams<{ s?: string }>();
  const [tab, setTab] = useState<FarmTab>("new");
  const [filter, setFilter] = useState<ReviewFilter>("all");

  let screen: React.ReactNode;
  if (s === "dashboard") {
    screen = (
      <DashboardView
        greeting="Good morning, Chidi"
        farmName="Okafor Family Farms"
        checklist={{ profile: true, collection: true, firstListing: true }}
        holidayMode={false}
        dash={dash as never}
        rating={{ average: 4.8, count: 126 }}
        unreadAlerts={2}
        unreadChats={3}
        lowStock={[{ key: "k1", listingId: "l1", name: "Fresh tomatoes", note: "2 baskets left" }]}
        now={now}
      />
    );
  } else if (s === "orders") {
    screen = <OrdersView tab={tab} onTab={setTab} counts={{ new: 3, to_prepare: 2, with_rider: 1, completed: 48 }} orders={(tab === "new" || tab === "to_prepare" ? rows[tab] : []) as never} unreadChats={3} now={now} />;
  } else if (ORDERS[s]) {
    screen = <SampleOrder key={s} start={s} />;
  } else if (s === "slip") {
    screen = <SlipView slip={slip as unknown as Slip} />;
  } else if (s === "case") {
    screen = <DisputeView d={dispute as unknown as FarmDispute} now={now} generateUploadUrl={async () => ""} onRespond={wait} onSend={wait} />;
  } else if (s === "earnings") {
    screen = <EarningsView summary={summary as never} recent={tx as never} payouts={payouts as never} />;
  } else if (s === "payout") {
    screen = <PayoutView p={payout as unknown as Payout} />;
  } else {
    screen = <ReviewsView summary={{ average: 4.8, count: 126, stars: [1, 2, 6, 21, 96] }} reviews={filter === "all" ? reviews : reviews.filter((r) => String(r.rating) === filter)} filter={filter} onFilter={setFilter} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.picker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {Object.entries(SCREENS).map(([key, label]) => (
            <Chip key={key} label={label} selected={key === s} onPress={() => router.setParams({ s: key })} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.flex}>{screen}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  picker: { paddingVertical: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
});
