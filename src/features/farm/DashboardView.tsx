// F-10 Dashboard, premium redesign (Nov 2026): a deep green header with the
// greeting, the farm, the bell, what Paystack sent the farm lately and the
// order pipeline in frosted tiles; then quick actions (add a listing,
// messages, reviews, low stock); orders waiting for a reply (with their
// countdown); stock running low. Small, tight type. Since 22 Nov 2026 the
// farm only accepts or declines, so there's no "To prepare" list.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Break, Clipboard, Messages, Plus, Star, Warning, type IconComponent } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop } from "@/components/premium";
import { Notice, Skeleton, Text } from "@/components/ui";
import { SetupCard, setupDone } from "@/features/farmer/SetupCard";
import { formatNaira } from "@/lib/money";
import { androidUi, ripple } from "@/theme/platform";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useLightStatusBar } from "@/theme/useLightStatusBar";
import { EmptyCard, FarmOrderRow, Section } from "./ui";

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
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const d = p.dash;
  const stats = [
    { label: "New", value: d?.counts.new },
    // The farm only accepts (22 Nov 2026): Farmkeke takes accepted orders from there
    { label: "Accepted", value: d?.counts.accepted },
    { label: "Problems", value: d?.counts.disputed },
  ];
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The deep green header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <ForestBackdrop />
          <View style={styles.headRow}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.eyebrow}>
                {p.greeting}
              </Text>
              <Text accessibilityRole="header" numberOfLines={1} style={styles.farmName}>
                {p.farmName ?? "Your farm"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={p.unreadAlerts > 0 ? `Notifications, ${p.unreadAlerts} unread` : "Notifications"}
              hitSlop={4}
              onPress={() => router.push({ pathname: "/notifications", params: { side: "farm" } })}
              style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
            >
              <Bell size={19} color={colors.white} />
              {p.unreadAlerts > 0 ? (
                <View pointerEvents="none" style={styles.bellCount}>
                  <Text maxFontSizeMultiplier={1} style={styles.bellCountText}>
                    {p.unreadAlerts >= 99 ? "99+" : p.unreadAlerts}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.money}>
            <Text style={styles.moneyLabel}>Paid to you, last 30 days</Text>
            {d === undefined ? (
              <View style={styles.moneySkeleton} />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.moneyValue}>
                {formatNaira(d?.paid30dKobo ?? 0)}
              </Text>
            )}
            <Text numberOfLines={2} style={styles.moneySub}>
              {d && d.owedKobo > 0 ? `${formatNaira(d.owedKobo)} owed for refunds comes off your next orders` : "Sent to your bank when shoppers pay"}
            </Text>
          </View>

          <View style={styles.stats}>
            {stats.map((s) => (
              <Pressable key={s.label} accessibilityRole="button" accessibilityLabel={`${s.label}: ${s.value ?? 0}`} onPress={() => router.navigate("/sales")} style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}>
                <Text style={styles.statValue}>{s.value ?? "–"}</Text>
                <Text numberOfLines={1} style={styles.statLabel}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <Stagger>
            <View style={styles.actions}>
              <Action icon={Plus} label="Add listing" tone="lime" onPress={() => router.push("/listing/new")} />
              <Action icon={Messages} label="Messages" count={p.unreadChats} onPress={() => router.push("/farm-messages")} />
              <Action icon={Star} label={p.rating?.average != null ? `${p.rating.average.toFixed(1)} rating` : "Reviews"} onPress={() => router.push("/farm/reviews")} />
              <Action icon={Warning} label="Low stock" count={p.lowStock.length} tone={p.lowStock.length > 0 ? "alert" : "plain"} onPress={() => router.navigate("/listings")} />
            </View>

            {p.checklist && setupDone(p.checklist) < 3 ? <SetupCard checklist={p.checklist} /> : null}
            {p.holidayMode ? (
              <Notice tone="pending" icon={Break}>
                Holiday mode is on. Your listings are hidden.
              </Notice>
            ) : null}

            <Section title="Needs your reply" action={d && d.counts.new > 5 ? "See all" : undefined} onAction={() => router.navigate("/sales")}>
              {d === undefined ? (
                <Skeleton height={72} radius={radii.lg} />
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

            {p.lowStock.length > 0 ? (
              <Section title="Running low" action="Listings" onAction={() => router.navigate("/listings")}>
                <View style={styles.lowCard}>
                  {p.lowStock.slice(0, 4).map((l, i) => (
                    <Pressable
                      key={l.key}
                      accessibilityRole="button"
                      onPress={() => router.navigate("/listings")}
                      android_ripple={ripple}
                      style={({ pressed }) => [styles.lowRow, i > 0 && styles.lowDivider, pressed && !androidUi && styles.lowPressed]}
                    >
                      <View style={styles.lowDot} />
                      <Text variant="label" numberOfLines={1} style={styles.flex}>
                        {l.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.lowNote}>
                        {l.note}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Section>
            ) : null}
          </Stagger>
        </View>
      </ScrollView>
    </View>
  );
}

/** A quick action: an icon in a soft square and a short label, with an optional count. */
function Action({ icon: Icon, label, count = 0, tone = "plain", onPress }: { icon: IconComponent; label: string; count?: number; tone?: "plain" | "lime" | "alert"; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${label}, ${count}` : label}
      onPress={onPress}
      android_ripple={ripple}
      style={({ pressed }) => [styles.action, pressed && !androidUi && styles.actionPressed]}
    >
      <View style={[styles.actionIcon, tone === "lime" && styles.actionIconLime, tone === "alert" && styles.actionIconAlert]}>
        <Icon size={19} color={tone === "alert" ? colors.pendingInk : colors.forest} variant={tone === "lime" ? undefined : "line"} />
        {count > 0 ? (
          <View pointerEvents="none" style={[styles.actionCount, tone === "alert" && styles.actionCountAlert]}>
            <Text maxFontSizeMultiplier={1} style={styles.actionCountText}>
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.2} style={styles.actionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxxl },
  flex: { flex: 1 },
  // Header
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.lg + 2, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", gap: spacing.lg },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase", color: colors.lime },
  farmName: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, color: colors.white },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: borders.hairline,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellPressed: { backgroundColor: "rgba(255,255,255,0.2)" },
  bellCount: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.badge,
    borderWidth: 2,
    borderColor: colors.forestDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  bellCountText: { fontFamily: fonts.bold, fontSize: 9.5, lineHeight: 11, color: colors.white },
  money: { gap: 2 },
  moneyLabel: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.onForest },
  moneyValue: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: colors.white },
  moneySkeleton: { width: 140, height: 30, borderRadius: 8, marginVertical: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  moneySub: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.lime },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: borders.hairline,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 1,
  },
  statPressed: { backgroundColor: "rgba(255,255,255,0.16)" },
  statValue: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: colors.white },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.onForest },
  // Body
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.xl },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1, alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: colors.white, overflow: "hidden" },
  actionPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  actionIconLime: { backgroundColor: colors.lime },
  actionIconAlert: { backgroundColor: colors.pendingSoft },
  actionCount: {
    position: "absolute",
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCountAlert: { backgroundColor: colors.pending },
  actionCountText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: colors.white },
  actionLabel: { alignSelf: "stretch", textAlign: "center", paddingHorizontal: 4, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.ink },
  list: { gap: spacing.sm },
  lowCard: { backgroundColor: colors.white, borderRadius: radii.lg, overflow: "hidden" },
  lowRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, minHeight: 46, paddingHorizontal: spacing.md + 2 },
  lowDivider: { borderTopWidth: borders.hairline, borderTopColor: colors.surfaceSoft },
  lowPressed: { backgroundColor: colors.surfaceSoft },
  lowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pending },
  lowNote: { maxWidth: "45%", fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.pendingInk },
});
