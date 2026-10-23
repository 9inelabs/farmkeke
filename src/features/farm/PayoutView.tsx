// F-63 Payout detail: the amount, where it went, its reference, and the
// orders it pays for (products, fee, what the farm got).
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "@/components/icons";
import { ScreenHeader, StatusBadge, Text } from "@/components/ui";
import { dayTime } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { payoutBadge } from "./money";
import { Card, Fact, MoneyLine } from "./ui";

export type Payout = NonNullable<FunctionReturnType<typeof api.payments.payouts.get>>;

export function PayoutView({ p }: { p: Payout }) {
  const b = payoutBadge(p);
  const products = p.items.reduce((s, i) => s + i.itemsTotalKobo, 0);
  const fees = p.items.reduce((s, i) => s + i.commissionKobo, 0);
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Payout" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glow} />
          <Text variant="small" color="rgba(255,255,255,0.7)">
            {p.status === "sent" ? "Sent to your bank" : p.status === "failed" ? "Not sent" : "On its way"}
          </Text>
          <Text style={styles.amount}>{formatNaira(p.amountKobo)}</Text>
          <View style={styles.badges}>
            <StatusBadge label={b.label} tone={b.tone} />
            {p.simulated ? <StatusBadge label="Test payout" tone="neutral" /> : null}
          </View>
        </View>

        <Card>
          <View style={styles.facts}>
            <Fact label="Bank" value={`${p.bankName} ••${p.accountLast4}`} />
            <Fact label={p.sentAt ? "Sent" : "Created"} value={dayTime(p.sentAt ?? p.createdAt)} />
          </View>
          <View style={styles.rule} />
          <Text variant="small">Reference</Text>
          <Text variant="label" selectable style={styles.ref}>
            {p.reference}
          </Text>
        </Card>

        <Card>
          <Text variant="heading">Orders · {p.items.length}</Text>
          {p.items.map((i) => (
            <Pressable key={i.orderId} accessibilityRole="button" onPress={() => router.push({ pathname: "/farm-order/[id]", params: { id: i.orderId } })} style={styles.order}>
              <View style={styles.flex}>
                <Text variant="label">{i.number}</Text>
                <Text variant="small">
                  {formatNaira(i.itemsTotalKobo)} − {formatNaira(i.commissionKobo)} fee
                </Text>
              </View>
              <Text variant="label">{formatNaira(i.amountKobo)}</Text>
              <ChevronRight size={16} color={colors.inkMuted} />
            </Pressable>
          ))}
          <View style={styles.rule} />
          <MoneyLine label="Products" value={formatNaira(products)} />
          <MoneyLine label="Farmkeke fee" value={`−${formatNaira(fees)}`} />
          <MoneyLine label="Paid to you" value={formatNaira(p.amountKobo)} strong />
        </Card>

        {p.failed ? (
          <Text variant="small" align="center">
            Farmkeke will try again once your payout account is checked.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, gap: 2 },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { backgroundColor: colors.forest, borderRadius: radii.lg + 10, padding: spacing.xl, gap: 2, overflow: "hidden" },
  glow: { position: "absolute", right: -60, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(169,214,84,0.14)" },
  amount: { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 44, color: colors.white, letterSpacing: -0.6 },
  badges: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  facts: { flexDirection: "row", gap: spacing.md },
  rule: { height: 1, backgroundColor: colors.surfaceSoft, marginVertical: spacing.xs },
  ref: { fontFamily: fonts.medium, letterSpacing: 0.3 },
  order: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
});
