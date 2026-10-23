// F-49 Packing slip: what to pack for one order, on a paper-like card. Each
// line can be ticked while packing; Share sends the slip as text.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Share as ShareIcon } from "@/components/icons";
import { Button, ScreenHeader, Text } from "@/components/ui";
import { dayTime } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export type Slip = NonNullable<FunctionReturnType<typeof api.orders.farmer.packingSlip>>;

function slipText(s: Slip): string {
  return [
    `${s.farmName} · Packing slip`,
    `Order ${s.number} for ${s.consumerFirstName}`,
    s.fulfilment === "delivery" ? `Delivery to ${s.area ?? "the buyer"}` : `Pickup${s.pickupPointName ? ` at ${s.pickupPointName}` : " at the farm"}`,
    "",
    ...s.items.map((i) => `[ ] ${i.quantity} ${i.unitLabel} · ${i.name}`),
    "",
    `Items total ${formatNaira(s.itemsTotalKobo)}`,
  ].join("\n");
}

export function SlipView({ slip: s }: { slip: Slip }) {
  const [packed, setPacked] = useState<number[]>([]);
  const units = s.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Packing slip" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.paper}>
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text variant="overline" color={colors.limeInk}>
                {s.farmName}
              </Text>
              <Text style={styles.number}>{s.number}</Text>
              <Text variant="small">{dayTime(s.paidAt ?? s.placedAt)}</Text>
            </View>
            <View style={styles.tag}>
              <Text variant="small" color={colors.forest} style={styles.semibold}>
                {s.fulfilment === "delivery" ? "Delivery" : "Pickup"}
              </Text>
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.flex}>
              <Text variant="small">For</Text>
              <Text variant="label">{s.consumerFirstName || "Buyer"}</Text>
            </View>
            <View style={styles.flex}>
              <Text variant="small">{s.fulfilment === "delivery" ? "Area" : "Where"}</Text>
              <Text variant="label" numberOfLines={2}>
                {s.fulfilment === "delivery" ? (s.area ?? "–") : (s.pickupPointName ?? "Your farm")}
              </Text>
            </View>
          </View>

          <View style={styles.tear} />

          <View style={styles.cols}>
            <Text variant="small" style={styles.flex}>
              Item
            </Text>
            <Text variant="small">Total</Text>
          </View>
          {s.items.map((it, i) => {
            const on = packed.includes(i);
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => setPacked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}
                style={styles.line}
              >
                <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={13} color={colors.white} strokeWidth={3} /> : null}</View>
                <View style={styles.flex}>
                  <Text variant="label" style={on && styles.struck}>
                    {it.name}
                  </Text>
                  <Text variant="small">
                    {it.quantity} {it.unitLabel}
                  </Text>
                </View>
                <Text variant="label">{formatNaira(it.lineTotalKobo)}</Text>
              </Pressable>
            );
          })}

          <View style={styles.tear} />
          <View style={styles.total}>
            <Text variant="caption" style={styles.flex}>
              {s.items.length} items · {units} units
            </Text>
            <Text variant="heading">{formatNaira(s.itemsTotalKobo)}</Text>
          </View>
          <Text variant="small" align="center" style={styles.progress}>
            {packed.length === s.items.length ? "All packed" : `${packed.length} of ${s.items.length} packed`}
          </Text>
        </View>
        <Button label="Share slip" icon={ShareIcon} variant="dark" size="large" pill fullWidth onPress={() => void Share.share({ message: slipText(s) })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.lg },
  paper: { backgroundColor: colors.white, borderRadius: radii.lg + 6, padding: spacing.xl, gap: spacing.md },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  number: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.ink },
  tag: { paddingHorizontal: spacing.sm, height: 26, borderRadius: 13, backgroundColor: colors.tint, justifyContent: "center" },
  meta: { flexDirection: "row", gap: spacing.md },
  tear: { borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, marginVertical: spacing.xs },
  cols: { flexDirection: "row" },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  struck: { textDecorationLine: "line-through", color: colors.inkMuted },
  total: { flexDirection: "row", alignItems: "center" },
  progress: { marginTop: spacing.xs },
});
