// Money rows for farmer mode: one ledger line (F-61). Paystack sends the
// farm's share when the shopper pays; refunds the farm owes are taken from
// later shares.
import { StyleSheet, View } from "react-native";
import { CashIn, Receipt, Undo, Warning } from "@/components/icons";
import { Text } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export type Tx = { _id: string; at: number; direction: "in" | "fee" | "owed" | "recovered"; amountKobo: number; status: string; orderNumber: string; simulated?: boolean };

const TX = {
  in: { icon: CashIn, title: "Paid to your bank", tint: colors.tint, color: colors.forest },
  fee: { icon: Receipt, title: "Farmkeke fee", tint: colors.surfaceSoft, color: colors.inkSoft },
  owed: { icon: Warning, title: "Refund you owe", tint: colors.pendingSoft, color: colors.pendingInk },
  recovered: { icon: Undo, title: "Refund paid back", tint: colors.surfaceSoft, color: colors.inkSoft },
} as const;

export function TxRow({ t, last = false }: { t: Tx; last?: boolean }) {
  const m = TX[t.direction];
  // A negative "paid back" is a credit Farmkeke added to the farm's share
  const credit = t.direction === "recovered" && t.amountKobo < 0;
  const title = credit ? "Credit from Farmkeke" : m.title;
  const sign = t.direction === "in" || credit ? "+" : "−";
  const amount = Math.abs(t.amountKobo);
  return (
    <View style={[styles.row, !last && styles.divider]} accessible accessibilityLabel={`${title}, ${sign}${formatNaira(amount)}, order ${t.orderNumber}`}>
      <View style={[styles.icon, { backgroundColor: m.tint }]}>
        <m.icon size={18} color={m.color} />
      </View>
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" numberOfLines={1}>
          {t.orderNumber ? `${t.orderNumber} · ` : ""}
          {dayMonth(t.at)}
          {t.status === "pending" ? " · Pending" : t.status === "failed" ? " · Failed" : ""}
        </Text>
      </View>
      <Text style={[styles.amount, (t.direction === "in" || credit) && styles.in, t.direction === "fee" && styles.fee]}>
        {sign}
        {formatNaira(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
  icon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  amount: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  in: { color: colors.success },
  fee: { color: colors.inkSoft },
});
