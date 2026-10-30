// Sample notification screens drawn with the real views, for the browser
// preview (which has no push): /dev/alerts?s=shop (farm, off, denied,
// unavailable, primer, farm-primer). Switches work on this screen only.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui";
import { AlertSettingsView, type AlertPrefs } from "@/features/push/AlertSettingsView";
import type { PushStatus } from "@/features/push/push";
import { PushPrimer } from "@/features/push/PushPrimer";
import { colors, spacing } from "@/theme/tokens";

const SHOP = {
  side: "shop",
  channels: ["push", "sms", "email"],
  hasEmail: true,
  alerts: [
    { alert: "order_updates", title: "Order updates", description: "Farm accepted, out for delivery, delivered, ready for pickup", locked: false, smsAvailable: true, push: true, sms: true, email: true },
    { alert: "payments", title: "Payments and refunds", description: "Bills, payment confirmed, money released, refunds", locked: true, smsAvailable: true, push: true, sms: true, email: true },
    { alert: "messages", title: "Messages from farmers", description: "When a farm replies about your order", locked: false, smsAvailable: false, push: true, sms: false, email: true },
    { alert: "reminders", title: "Reminders", description: "Confirm receipt and review your order", locked: false, smsAvailable: false, push: true, sms: false, email: true },
    { alert: "back_in_stock", title: "Back in stock", description: "When a saved item is available again", locked: false, smsAvailable: false, push: true, sms: false, email: true },
    { alert: "offers", title: "Offers and news", description: "Seasonal produce and Farmkeke news", locked: false, smsAvailable: false, push: false, sms: false, email: false },
  ],
};
const FARM = {
  side: "farm",
  channels: ["push", "sms", "email"],
  hasEmail: true,
  alerts: [
    { alert: "orders", title: "New orders and deadlines", description: "New orders, deadline near, expired or cancelled orders, rider collection", locked: false, smsAvailable: true, push: true, sms: true, email: true },
    { alert: "problems", title: "Problem reports", description: "A shopper reported a problem, and Farmkeke's decision", locked: false, smsAvailable: false, push: true, sms: false, email: true },
    { alert: "payments", title: "Payments and payouts", description: "Payment released, payout sent, payout account changed", locked: true, smsAvailable: true, push: true, sms: true, email: true },
    { alert: "messages", title: "Messages", description: "Shoppers' messages about their orders, and support replies", locked: false, smsAvailable: false, push: true, sms: false, email: false },
    { alert: "listings", title: "Listings", description: "Listing approved or sent back, low stock", locked: false, smsAvailable: false, push: true, sms: false, email: true },
    { alert: "reviews", title: "Reviews", description: "When a shopper rates an order", locked: false, smsAvailable: false, push: true, sms: false, email: false },
    { alert: "news", title: "Farmkeke news", description: "Offers, tips and news from Farmkeke", locked: false, smsAvailable: false, push: false, sms: false, email: false },
  ],
};

const SCREENS: Record<string, { label: string; side: "shop" | "farm"; status: PushStatus; primer?: boolean }> = {
  shop: { label: "Shopper", side: "shop", status: "granted" },
  farm: { label: "Farmer", side: "farm", status: "granted" },
  off: { label: "Push off", side: "shop", status: "undetermined" },
  denied: { label: "Blocked", side: "farm", status: "denied" },
  unavailable: { label: "Web", side: "shop", status: "unavailable" },
  primer: { label: "Primer", side: "shop", status: "undetermined", primer: true },
  "farm-primer": { label: "Farm primer", side: "farm", status: "undetermined", primer: true },
};

function Sample({ id }: { id: string }) {
  const s = SCREENS[id] ?? SCREENS.shop!;
  const [prefs, setPrefs] = useState(() => (s.side === "farm" ? FARM : SHOP) as unknown as AlertPrefs);
  const [primer, setPrimer] = useState(s.primer === true);
  return (
    <>
      <AlertSettingsView
        side={s.side}
        prefs={prefs}
        status={s.status}
        onToggle={(alert, channel, on) => setPrefs((p) => ({ ...p, alerts: p.alerts.map((a) => (a.alert === alert ? { ...a, [channel]: on } : a)) }))}
        onEnablePush={() => setPrimer(true)}
      />
      <PushPrimer side={s.side} visible={primer} onClose={() => setPrimer(false)} status={s.status} />
    </>
  );
}

export default function AlertSamples() {
  const { s = "shop" } = useLocalSearchParams<{ s?: string }>();
  return (
    <View style={styles.screen}>
      <View style={styles.picker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {Object.entries(SCREENS).map(([key, v]) => (
            <Chip key={key} label={v.label} selected={key === s} onPress={() => router.setParams({ s: key })} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.flex}>
        <Sample key={s} id={s} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  picker: { paddingVertical: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
});
