// F-60 Earnings: everything the farm has earned, what's still held, what's
// on its way and what's reached the bank; the payout account; recent
// activity and payouts.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank, Danger, Receipt, Wallet } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Skeleton, Text } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { PayoutRow, TxRow, type PayoutRowData, type Tx } from "./money";
import { Card, EmptyCard, FarmHeader, Hero, LinkRow, Section } from "./ui";

type Summary = NonNullable<FunctionReturnType<typeof api.earnings.summary>>;

export type EarningsProps = { summary: Summary | null | undefined; recent: Tx[] | undefined; payouts: PayoutRowData[] | undefined };

export function EarningsView({ summary: s, recent, payouts }: EarningsProps) {
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
                label="Total earned"
                value={formatNaira(s?.releasedKobo ?? 0)}
                sub={s?.lastPayout ? `Last payout ${formatNaira(s.lastPayout.amountKobo)}${s.lastPayout.sentAt ? ` · ${dayMonth(s.lastPayout.sentAt)}` : ""}` : "After Farmkeke's fee"}
                stats={[
                  { label: "Held", value: formatNaira(s?.heldKobo ?? 0) },
                  { label: "Sending", value: formatNaira(s?.pendingPayoutKobo ?? 0) },
                  { label: "Paid out", value: formatNaira(s?.paidOutKobo ?? 0) },
                ]}
              />
            )}

            {s && s.failedPayoutKobo > 0 ? (
              <Card onPress={() => router.push("/farm/payout-account")} style={styles.failed}>
                <View style={styles.row}>
                  <Danger size={20} color={colors.error} variant="solid" />
                  <View style={styles.flex}>
                    <Text variant="label">{formatNaira(s.failedPayoutKobo)} couldn't be sent</Text>
                    <Text variant="small">Check your payout account</Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {s ? (
              <Card style={styles.flush}>
                <LinkRow icon={Bank} label="Payout account" value={`${s.payoutAccount.bankName} ••${s.payoutAccount.accountLast4}`} onPress={() => router.push("/farm/payout-account")} />
                <LinkRow icon={Receipt} label="All activity" onPress={() => router.push("/farm/transactions")} />
                <LinkRow icon={Wallet} label="Payouts" value={payouts ? String(payouts.length) : undefined} onPress={() => router.push("/payouts")} last />
              </Card>
            ) : null}

            <Section title="Activity" action={recent && recent.length > 0 ? "See all" : undefined} onAction={() => router.push("/farm/transactions")}>
              {recent === undefined ? (
                <Skeleton height={180} radius={radii.lg + 4} />
              ) : recent.length === 0 ? (
                <EmptyCard icon={Receipt} title="No money moved yet" note="Released payments and payouts show here." />
              ) : (
                <Card style={styles.flush}>
                  {recent.map((t, i) => (
                    <TxRow key={t._id} t={t} last={i === recent.length - 1} />
                  ))}
                </Card>
              )}
            </Section>

            {payouts && payouts.length > 0 ? (
              <Section title="Recent payouts" action="See all" onAction={() => router.push("/payouts")}>
                <Card style={styles.flush}>
                  {payouts.slice(0, 3).map((p, i, all) => (
                    <PayoutRow key={p._id} p={p} last={i === all.length - 1} onPress={() => router.push({ pathname: "/payouts/[id]", params: { id: p._id } })} />
                  ))}
                </Card>
              </Section>
            ) : null}

            {s ? (
              <Text variant="small" align="center">
                Farmkeke's fee is {s.commissionBps / 100}% of products. Delivery isn't counted.
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  failed: { borderWidth: 1, borderColor: colors.errorSoft },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
});
