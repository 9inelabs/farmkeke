// M-72 Refund status (payments/refunds.forOrder): how much, back to which
// payment method, and where it's up to, with the reference to give a bank.
import { api } from "@convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Receipt } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen, Text, Timeline, type TimelineStep } from "@/components/ui";
import { dayTime } from "@/features/orders/format";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

/** "Card ending 4081" → "card ending 4081"; "Your bank account" → "bank account" */
const methodPhrase = (label: string) => label.replace(/^Your /, "").replace(/^\w/, (c) => c.toLowerCase());

export default function Refund() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading } = useConvexAuth();
  const access = useOrder(id);
  const refunds = useQuery(api.payments.refunds.forOrder, isLoading ? "skip" : { orderId: id });

  if (access.state === "loading" || refunds === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Refund" />
        <View style={styles.body}>
          <Skeleton height={150} radius={radii.lg + 8} />
          <Skeleton height={260} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  const r = refunds[refunds.length - 1];
  if (access.state === "missing" || !r) {
    return (
      <StatusScreen
        icon={Receipt}
        header={<ScreenHeader title="Refund" />}
        title="No refund on this order yet"
        message="If a refund is decided, you'll see where it's up to here, and we'll text you."
        actions={<Button label="Back to the order" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }
  const o = access.order;
  const sent = r.status === "processing" || r.status === "processed" || !!r.sentAt;
  const settled = r.status === "processed" && !!r.settledAt;
  const failed = r.status === "failed";
  const pill = failed ? "Delayed, we're on it" : settled ? "In your account" : sent ? "On its way to you" : "Being sent";

  const steps: TimelineStep[] = [
    { key: "decided", title: `Decision made: ${r.kind === "part" ? "part refund" : "full refund"}`, detail: dayTime(r.decidedAt), state: "done" },
    {
      key: "sent",
      title: failed ? "Refund delayed" : "Refund sent",
      detail: failed
        ? "Something went wrong sending it. Our team is retrying and will contact you."
        : sent
          ? `${r.sentAt ? `${dayTime(r.sentAt)} · ` : ""}Back to your ${methodPhrase(r.methodLabel)}`
          : "Usually within a few minutes",
      state: sent ? "done" : "current",
    },
    { key: "bank", title: "With your bank", detail: sent && !settled ? "Banks can take a few working days to show it on your statement" : undefined, state: settled ? "done" : sent ? "current" : "todo" },
    { key: "account", title: "In your account", detail: r.settledAt ? dayTime(r.settledAt) : undefined, state: settled ? "done" : "todo" },
  ];
  const released = r.kind === "part" ? Math.max(0, o.totalKobo - r.amountKobo) : 0;
  const rows: [string, string][] = [
    ["Refund method", r.methodLabel],
    ["Refund reference", r.reference],
    ...(released > 0 ? ([[`Released to ${o.farmName}`, formatNaira(released)]] as [string, string][]) : []),
    ["Order total", formatNaira(o.totalKobo)],
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Refund" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text variant="label" color={colors.lime}>
            Refund for order {o.number}
          </Text>
          <Text style={styles.amount}>{formatNaira(r.amountKobo)}</Text>
          <Text variant="small" color="rgba(255,255,255,0.8)">
            {r.reason}
          </Text>
          <View style={styles.pill}>
            <Text variant="small" color={colors.forest} style={styles.bold}>
              {pill}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text variant="heading">Refund progress</Text>
          <Timeline steps={steps} />
        </View>
        <View style={styles.card}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[styles.row, i > 0 && styles.divider]}>
              <Text variant="caption">{k}</Text>
              <Text variant="label" style={styles.value} selectable>
                {v}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text variant="label">Not received after 7 working days?</Text>
          <Text variant="small">Share the refund reference with your bank, or ask us to check.</Text>
          <Button label="Contact support" variant="secondary" size="small" onPress={() => void Linking.openURL(`mailto:support@farmkeke.com?subject=${encodeURIComponent(`Refund for order ${o.number}`)}`)} style={styles.support} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  bold: { fontFamily: fonts.bold },
  body: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { backgroundColor: colors.forest, borderRadius: radii.lg + 8, padding: spacing.xl, gap: spacing.xs },
  amount: { fontFamily: fonts.displayBold, fontSize: 31, lineHeight: 38, color: colors.white, letterSpacing: -0.5 },
  pill: { alignSelf: "flex-start", marginTop: spacing.sm, backgroundColor: colors.lime, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  value: { flexShrink: 1, textAlign: "right" },
  support: { alignSelf: "flex-start", marginTop: spacing.xs },
});
