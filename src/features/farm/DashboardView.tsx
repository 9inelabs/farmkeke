// F-10 Dashboard: what needs doing now. The money held for the farm and the
// order pipeline up top; orders waiting for a reply (with their countdown);
// orders to prepare; stock running low.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Break, Clipboard, Messages, Plus, Star, Warning } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { BellButton, Button, Notice, Skeleton } from "@/components/ui";
import { SetupCard, setupDone } from "@/features/farmer/SetupCard";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { farmBadge } from "./status";
import { EmptyCard, FarmHeader, FarmOrderRow, Hero, Section, Tile } from "./ui";

type Dash = NonNullable<FunctionReturnType<typeof api.orders.farmer.dashboard>>;
type Checklist = { profile: boolean; collection: boolean; firstListing: boolean };

export type DashboardProps = {
  greeting: string;
  farmName: string | undefined;
  checklist: Checklist | undefined;
  holidayMode: boolean;
  dash: Dash | null | undefined;
  rating: { average: number | null; count: number } | null | undefined;
  unreadAlerts: number;
  unreadChats: number;
  lowStock: { key: string; listingId: string; name: string; note: string }[];
  now: number;
};

const openOrder = (id: string) => router.push({ pathname: "/farm-order/[id]", params: { id } });

export function DashboardView(p: DashboardProps) {
  const d = p.dash;
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FarmHeader
          eyebrow={p.greeting}
          title={p.farmName ?? "Your farm"}
          right={<BellButton unread={p.unreadAlerts} onPress={() => router.push({ pathname: "/notifications", params: { side: "farm" } })} />}
        />
        <View style={styles.content}>
          <Stagger>
            {p.checklist && setupDone(p.checklist) < 3 ? <SetupCard checklist={p.checklist} /> : null}
            {p.holidayMode ? (
              <Notice tone="pending" icon={Break}>
                Holiday mode is on. Your listings are hidden.
              </Notice>
            ) : null}

            {d === undefined ? (
              <Skeleton height={190} radius={radii.lg + 10} />
            ) : (
              <Hero
                label="Held for you"
                value={formatNaira(d?.heldKobo ?? 0)}
                sub="Released when buyers confirm"
                stats={[
                  { label: "New", value: String(d?.counts.new ?? 0) },
                  { label: "To prepare", value: String(d?.counts.to_prepare ?? 0) },
                  { label: "Out", value: String(d?.counts.with_rider ?? 0) },
                ]}
              />
            )}

            <View style={styles.tiles}>
              <Tile icon={Star} value={p.rating?.average != null ? p.rating.average.toFixed(1) : "–"} label={p.rating?.count ? `${p.rating.count} reviews` : "No reviews"} onPress={() => router.push("/farm/reviews")} />
              <Tile icon={Messages} value={String(p.unreadChats)} label="Unread chats" onPress={() => router.push("/farm-messages")} />
              <Tile icon={Warning} value={String(p.lowStock.length)} label="Low stock" tone={p.lowStock.length > 0 ? "alert" : "plain"} onPress={() => router.navigate("/listings")} />
            </View>

            <Section title="Needs your reply" action={d && d.counts.new > 5 ? "See all" : undefined} onAction={() => router.navigate("/sales")}>
              {d === undefined ? (
                <Skeleton height={76} radius={radii.lg} />
              ) : d && d.newOrders.length > 0 ? (
                <View style={styles.list}>
                  {d.newOrders.map((o) => (
                    <FarmOrderRow key={o._id} o={o} now={p.now} showCountdown onPress={() => openOrder(o._id)} />
                  ))}
                </View>
              ) : (
                <EmptyCard icon={Clipboard} title="You're all caught up" note="New orders appear here. You have 24 hours to reply." />
              )}
            </Section>

            {d && d.toPrepare.length > 0 ? (
              <Section title="To prepare" action={d.counts.to_prepare > 5 ? "See all" : undefined} onAction={() => router.navigate("/sales")}>
                <View style={styles.list}>
                  {d.toPrepare.map((o) => (
                    <FarmOrderRow key={o._id} o={o} now={p.now} badge={farmBadge(o)} onPress={() => openOrder(o._id)} />
                  ))}
                </View>
              </Section>
            ) : null}

            {p.lowStock.length > 0 ? (
              <Section title="Running low" action="Listings" onAction={() => router.navigate("/listings")}>
                <View style={styles.list}>
                  {p.lowStock.slice(0, 4).map((l) => (
                    <Notice key={l.key} tone="pending" icon={Warning}>
                      {`${l.name}: ${l.note}`}
                    </Notice>
                  ))}
                </View>
              </Section>
            ) : null}

            <Button label="Add a listing" icon={Plus} variant="secondary" pill fullWidth onPress={() => router.push("/listing/new")} />
          </Stagger>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxxl },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, gap: spacing.xl },
  tiles: { flexDirection: "row", gap: spacing.sm },
  list: { gap: spacing.sm },
});
