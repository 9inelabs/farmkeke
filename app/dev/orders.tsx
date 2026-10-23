// Sample orders drawn with the real order screen, to check each state in the
// browser preview without placing orders: /dev/orders?state=out (bill, pickup,
// delivered, declined, view). Nothing here touches the backend.
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui";
import { OrderView } from "@/features/orders/OrderView";
import type { OrderDetail } from "@/features/orders/useOrder";
import { colors, spacing } from "@/theme/tokens";

const H = 3_600_000;
const now = Date.now();

const base = {
  _id: "sample",
  number: "FK-10234",
  status: "accepted",
  escrow: "held",
  escrowHold: false,
  fulfilment: "delivery",
  farm: { _id: "farm", name: "Okafor Family Farms", area: "Owerri North" },
  farmName: "Okafor Family Farms",
  farmId: "farm",
  items: [
    { index: 0, listingId: "l1", unitId: "u1", name: "Fresh tomatoes", quantity: 2, priceKobo: 450000, unitSingular: "basket", unitPlural: "baskets", unitLabel: "baskets", lineTotalKobo: 900000, imageUrl: null },
    { index: 1, listingId: "l2", unitId: "u2", name: "Ugwu leaves", quantity: 3, priceKobo: 80000, unitSingular: "bunch", unitPlural: "bunches", unitLabel: "bunches", lineTotalKobo: 240000, imageUrl: null },
  ],
  itemsTotalKobo: 1140000,
  deliveryFeeKobo: 150000,
  totalKobo: 1290000,
  placedAt: now - 26 * H,
  paidAt: now - 20 * H,
  respondBy: now - 2 * H,
  acceptedAt: now - 24 * H,
  preparingAt: now - 23 * H,
  packedAt: now - 3 * H,
  readyAt: now - 3 * H,
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
  address: { street: "12 Wetheral Road", landmark: "Opposite the filling station", areaName: "New Owerri", lga: "Owerri North", state: "Imo", note: "Blue gate" },
  pickupPoint: null,
  collectFrom: null,
  deliveryPricedAt: now - 21 * H,
  paid: true,
  rider: null,
  riderCollectAt: null,
  disputeId: null,
  hasRefund: false,
  reviewed: false,
  isActive: true,
  events: [],
  bill: { state: "paid", checkoutId: "c1", totalKobo: 1290000, deliveryFeeKobo: 150000, billedAt: now - 21 * H, payBy: now - 9 * H, payToken: null },
  pickupCode: null,
  contact: { name: "Adaeze Nwankwo", phone: "+2348031234567", email: "ada@example.com" },
  canConfirm: false,
  canReport: false,
  viewOnly: false,
  linkEmailHint: null,
};

const pickupFarm = { farmName: "Okafor Family Farms", address: "Km 4 Owerri–Aba Road", lga: "Owerri North", state: "Imo", hours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "17:00" })), phone: "+2348030000000", collectWithinDays: 3 };

const SAMPLES: Record<string, { label: string; order: object }> = {
  out: { label: "Out for delivery", order: { ...base, status: "out_for_delivery", outForDeliveryAt: now - H, rider: { name: "Chinedu Okeke", phone: "+2348039998877" } } },
  bill: {
    label: "Bill ready",
    order: { ...base, status: "preparing", escrow: "none", paid: false, paidAt: null, bill: { ...base.bill, state: "ready_to_pay", payBy: now + 11 * H, payToken: "sample-token-0000000000000000000000000" } },
  },
  pickup: {
    label: "Pickup ready",
    order: { ...base, fulfilment: "pickup", status: "ready_for_collection", address: null, deliveryFeeKobo: 0, totalKobo: 1140000, bill: null, pickupCode: "4821", collectBy: now + 72 * H, collectFrom: pickupFarm },
  },
  delivered: { label: "Delivered", order: { ...base, status: "delivered", deliveredAt: now - H / 2, canConfirm: true, canReport: true } },
  done: { label: "Completed", order: { ...base, status: "completed", escrow: "released", deliveredAt: now - 5 * H, confirmedAt: now - 4 * H, releasedAt: now - 4 * H, isActive: false } },
  declined: { label: "Declined", order: { ...base, status: "declined", escrow: "refunded", declineReason: "We sold out of tomatoes this morning", hasRefund: true, isActive: false } },
  view: { label: "View only", order: { ...base, status: "out_for_delivery", viewOnly: true, linkEmailHint: "a***@example.com" } },
};

export default function OrderSamples() {
  const { state = "out" } = useLocalSearchParams<{ state?: string }>();
  const sample = SAMPLES[state] ?? SAMPLES.out!;
  return (
    <View style={styles.screen}>
      <OrderView order={sample.order as unknown as OrderDetail} />
      <View style={styles.picker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {Object.entries(SAMPLES).map(([key, s]) => (
            <Chip key={key} label={s.label} selected={key === state} onPress={() => router.setParams({ state: key })} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  picker: { position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: spacing.sm, backgroundColor: "rgba(255,255,255,0.95)" },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
});
