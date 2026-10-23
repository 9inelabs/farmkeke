// M-68 Problem reported: the case number, the payment still held, and when
// the farm and Farmkeke will reply.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ShieldCheck } from "@/components/icons";
import { Button, StatusScreen, Text } from "@/components/ui";
import { dayTime } from "@/features/orders/format";
import { useOrder } from "@/features/orders/useOrder";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function ProblemSent() {
  const { id, number } = useLocalSearchParams<{ id: string; number?: string }>();
  const { isLoading } = useConvexAuth();
  // Load through the order first: a bad link (not an order id) shows "not found" instead of failing
  const access = useOrder(id);
  const known = !isLoading && access.state === "ok" && !access.order.viewOnly;
  const found = useQuery(api.disputes.forOrder, known ? { orderId: id as Id<"orders"> } : "skip");
  const d = access.state === "loading" ? undefined : known ? found : null;
  const rows: [string, string][] = d
    ? [
        ["Case number", d.number],
        ["Order", `${d.orderNumber} · ${d.farmName}`],
        ["Problem", d.reasonLabel],
        ["Farm can reply by", dayTime(d.farmReplyBy)],
        ["We decide by", dayTime(d.decideBy)],
      ]
    : number
      ? [["Case number", number]]
      : [];
  return (
    <StatusScreen
      icon={ShieldCheck}
      title="We've got your report"
      message="Your payment stays held while we look into it. We'll update you by text, email and in the app."
      actions={
        <>
          <Button label="Follow this case" variant="dark" size="large" pill fullWidth onPress={() => router.replace({ pathname: "/order/[id]/dispute", params: { id } })} />
          <Button label="Back to the order" variant="ghost" fullWidth onPress={() => router.replace({ pathname: "/order/[id]", params: { id } })} />
        </>
      }
    >
      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[styles.row, i > 0 && styles.divider]}>
              <Text variant="caption">{k}</Text>
              <Text variant="label" style={[styles.value, i === 0 && styles.bold]}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </StatusScreen>
  );
}

const styles = StyleSheet.create({
  rows: { alignSelf: "stretch", marginTop: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  value: { flexShrink: 1, textAlign: "right" },
  bold: { fontFamily: fonts.bold },
});
