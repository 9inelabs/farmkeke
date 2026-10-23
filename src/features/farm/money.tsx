// Money rows for farmer mode: a ledger line (F-61) and a payout (F-63).
import { Pressable, StyleSheet, View } from "react-native";
import { Bank, CashIn, ChevronRight, Receipt } from "@/components/icons";
import { StatusBadge, Text, type BadgeTone } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export type Tx = { _id: string; at: number; direction: "in" | "paid_out" | "fee"; amountKobo: number; status: string; orderNumber: string; simulated?: boolean };
export type PayoutRowData = { _id: string; amountKobo: number; status: "pending" | "sent" | "failed"; bankName: string; accountLast4: string; simulated: boolean; createdAt: number; sentAt: number | null };

const TX = {
  in: { icon: CashIn, title: "Released to you", tint: colors.tint, color: colors.forest },
  paid_out: { icon: Bank, title: "Paid to your bank", tint: colors.infoSoft, color: colors.info },
  fee: { icon: Receipt, title: "Farmkeke fee", tint: colors.surfaceSoft, color: colors.inkSoft },
} as const;

export function TxRow({ t, last = false }: { t: Tx; last?: boolean }) {
  const m = TX[t.direction];
  const sign = t.direction === "in" ? "+" : "−";
  return (
    <View style={[styles.row, !last && styles.divider]} accessible accessibilityLabel={`${m.title}, ${sign}${formatNaira(t.amountKobo)}, order ${t.orderNumber}`}>
      <View style={[styles.icon, { backgroundColor: m.tint }]}>
        <m.icon size={18} color={m.color} />
      </View>
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1}>
          {m.title}
        </Text>
        <Text variant="small" numberOfLines={1}>
          {t.orderNumber ? `${t.orderNumber} · ` : ""}
          {dayMonth(t.at)}
          {t.status === "pending" ? " · Pending" : t.status === "failed" ? " · Failed" : ""}
        </Text>
      </View>
      <Text style={[styles.amount, t.direction === "in" && styles.in, t.direction === "fee" && styles.fee]}>
        {sign}
        {formatNaira(t.amountKobo)}
      </Text>
    </View>
  );
}

export const payoutBadge = (p: { status: PayoutRowData["status"] }): { label: string; tone: BadgeTone } =>
  p.status === "sent" ? { label: "Sent", tone: "success" } : p.status === "failed" ? { label: "Failed", tone: "error" } : { label: "Sending", tone: "pending" };

export function PayoutRow({ p, onPress, last = false }: { p: PayoutRowData; onPress: () => void; last?: boolean }) {
  const b = payoutBadge(p);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: colors.tint }]}>
        <Bank size={18} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <Text variant="label">{formatNaira(p.amountKobo)}</Text>
        <Text variant="small" numberOfLines={1}>
          ••{p.accountLast4} · {dayMonth(p.sentAt ?? p.createdAt)}
          {p.simulated ? " · Test" : ""}
        </Text>
      </View>
      <StatusBadge label={b.label} tone={b.tone} />
      <ChevronRight size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
  pressed: { backgroundColor: colors.surfaceSoft },
  icon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  amount: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  in: { color: colors.success },
  fee: { color: colors.inkSoft },
});
