// F-60 Earnings. Since the Paystack split, Paystack sends the farm's share
// straight to its bank the moment a shopper pays: nothing is held and there
// are no payouts to wait for. This shows what's been paid, any refunds the
// farm owes back (taken from its next orders), whether Paystack has the bank
// account, and recent activity.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank, Clock, Danger, Receipt, Undo } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Notice, Skeleton, Text } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { TxRow, type Tx } from "./money";
import { Card, EmptyCard, FarmHeader, Hero, LinkRow, Section } from "./ui";

type Summary = NonNullable<FunctionReturnType<typeof api.earnings.summary>>;

export type EarningsProps = { summary: Summary | null | undefined; recent: Tx[] | undefined };

export function EarningsView({ summary: s, recent }: EarningsProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FarmHeader title="Earnings" />
        <View style={styles.content}>
          <Stagger>
            {s === undefined ? (
              <Skeleton height={200} radius={radii.lg + 10} />
            ) : (
              <Hero
                label="Paid to you"
                value={formatNaira(s?.earnedKobo ?? 0)}
                sub={s?.lastPaid ? `Last payment ${formatNaira(s.lastPaid.amountKobo)} · ${dayMonth(s.lastPaid.at)}` : "Paid to your bank when shoppers pay"}
                stats={[
                  { label: "Orders paid", value: String(s?.paidOrders ?? 0) },
                  { label: "Farmkeke fee", value: formatNaira(s?.commissionKobo ?? 0) },
                  s && s.creditKobo > 0 ? { label: "Credit", value: formatNaira(s.creditKobo) } : { label: "You owe", value: formatNaira(s?.owedKobo ?? 0) },
                ]}
              />
            )}

            {s?.paystack === "problem" ? (
              <Card onPress={() => router.push("/farm/payout-account")} style={styles.problem}>
                <View style={styles.row}>
                  <Danger size={20} color={colors.error} variant="solid" />
                  <View style={styles.flex}>
                    <Text variant="label">Paystack can't pay you yet</Text>
                    <Text variant="small">It didn't accept your bank account. Check it, or contact Farmkeke support. Shoppers can't pay for your orders until it's fixed.</Text>
                  </View>
                </View>
              </Card>
            ) : s?.paystack === "setting_up" ? (
              <Notice tone="pending" icon={Clock}>
                We're setting up your bank account with Paystack. Shoppers can pay for your orders once it's done, usually within the hour.
              </Notice>
            ) : null}

            {s && s.owedKobo > 0 ? (
              <Card style={styles.owed}>
                <View style={styles.row}>
                  <Undo size={20} color={colors.pendingInk} />
                  <View style={styles.flex}>
                    <Text variant="label">You owe {formatNaira(s.owedKobo)} for refunds</Text>
                    <Text variant="small">
                      Farmkeke refunded shoppers for problems with your orders. It comes off your next orders before the rest is sent to you. Nothing else to do.
                    </Text>
                  </View>
                </View>
              </Card>
            ) : s && s.creditKobo > 0 ? (
              <Notice tone="brand">{`Farmkeke owes you ${formatNaira(s.creditKobo)}. It's added to your next order's payment.`}</Notice>
            ) : null}

            {s ? (
              <Card style={styles.flush}>
                <LinkRow icon={Bank} label="Bank account" value={`${s.payoutAccount.bankName} ••${s.payoutAccount.accountLast4}`} onPress={() => router.push("/farm/payout-account")} />
                <LinkRow icon={Receipt} label="All activity" onPress={() => router.push("/farm/transactions")} last />
              </Card>
            ) : null}

            <Section title="Activity" action={recent && recent.length > 0 ? "See all" : undefined} onAction={() => router.push("/farm/transactions")}>
              {recent === undefined ? (
                <Skeleton height={180} radius={radii.lg + 4} />
              ) : recent.length === 0 ? (
                <EmptyCard icon={Receipt} title="No payments yet" note="When a shopper pays for one of your orders, your share shows here." />
              ) : (
                <Card style={styles.flush}>
                  {recent.map((t, i) => (
                    <TxRow key={t._id} t={t} last={i === recent.length - 1} />
                  ))}
                </Card>
              )}
            </Section>

            {s ? (
              <Text variant="small" align="center">
                Farmkeke's fee is {s.commissionBps / 100}% of products. Delivery isn't counted. Paystack's own fee is shared between you and Farmkeke in proportion to each share. Your bank usually gets the money the next working day.
              </Text>
            ) : null}
          </Stagger>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, gap: 2 },
  scroll: { paddingBottom: spacing.xxxl },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, gap: spacing.xl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  problem: { borderWidth: 1, borderColor: colors.errorSoft },
  owed: { borderWidth: 1, borderColor: colors.pendingSoft },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
});
