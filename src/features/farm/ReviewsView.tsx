// F-80 Reviews: the farm's average, how the stars spread, and every review,
// filtered by stars.
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Star } from "@/components/icons";
import { ScreenHeader, Skeleton, StatusBadge, Text } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { EmptyCard, TabStrip } from "./ui";

export type ReviewRow = {
  _id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  reviewerName: string | null;
  createdAt: number;
  orderId: string;
  orderNumber: string;
  hidden: boolean;
};
type Summary = { average: number | null; count: number; stars: number[] };
type Filter = "all" | "5" | "4" | "3" | "2" | "1";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  ...[5, 4, 3, 2, 1].map((n) => ({ key: String(n) as Filter, label: `${n} ★` })),
];

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= Math.round(value) ? colors.pending : colors.line} variant="solid" />
      ))}
    </View>
  );
}

export type ReviewsProps = {
  summary: Summary | null | undefined;
  reviews: ReviewRow[] | undefined;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onLoadMore?: () => void;
};

export function ReviewsView({ summary: s, reviews, filter, onFilter, onLoadMore }: ReviewsProps) {
  const max = Math.max(1, ...(s?.stars ?? [0]));
  const counts = s ? (Object.fromEntries([["all", s.count], ...s.stars.map((n, i) => [String(i + 1), n])]) as Record<Filter, number>) : undefined;

  const header = (
    <View style={styles.stack}>
      {s === undefined ? (
        <Skeleton height={170} radius={radii.lg + 10} />
      ) : (
        <View style={styles.summary}>
          <View style={styles.score}>
            <Text style={styles.average}>{s?.average != null ? s.average.toFixed(1) : "–"}</Text>
            <Stars value={s?.average ?? 0} size={16} />
            <Text variant="small">{s?.count ? `${s.count} review${s.count === 1 ? "" : "s"}` : "No reviews yet"}</Text>
          </View>
          <View style={styles.bars}>
            {[5, 4, 3, 2, 1].map((n) => {
              const c = s?.stars[n - 1] ?? 0;
              return (
                <View key={n} style={styles.barRow}>
                  <Text variant="small" style={styles.barLabel}>
                    {n}
                  </Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(c / max) * 100}%` }]} />
                  </View>
                  <Text variant="small" style={styles.barCount}>
                    {c}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
      <View style={styles.strip}>
        <TabStrip tabs={FILTERS} value={filter} onChange={onFilter} counts={counts} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Reviews" />
      <FlatList
        data={reviews ?? []}
        keyExtractor={(r) => r._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        onEndReached={onLoadMore}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          reviews === undefined ? (
            <Skeleton height={120} radius={radii.lg + 4} />
          ) : (
            <EmptyCard icon={Star} title={filter === "all" ? "No reviews yet" : `No ${filter}-star reviews`} note={filter === "all" ? "Buyers can rate each order once it's confirmed." : undefined} />
          )
        }
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Stars value={r.rating} />
              <Text variant="small" style={styles.flex}>
                {dayMonth(r.createdAt)}
              </Text>
              {r.hidden ? <StatusBadge label="Hidden" tone="neutral" /> : null}
            </View>
            {r.comment ? <Text variant="body">{r.comment}</Text> : null}
            {r.tags.length > 0 ? (
              <View style={styles.tags}>
                {r.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text variant="small" color={colors.forest}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.push({ pathname: "/farm-order/[id]", params: { id: r.orderId } })} style={styles.foot}>
              <Text variant="small" style={styles.flex}>
                {r.reviewerName ?? "A buyer"} · {r.orderNumber}
              </Text>
              <ChevronRight size={14} color={colors.inkMuted} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

export type { Filter as ReviewFilter };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  stack: { gap: spacing.md, marginBottom: spacing.xs },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.sm },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.xl, backgroundColor: colors.white, borderRadius: radii.lg + 8, padding: spacing.xl },
  score: { alignItems: "center", gap: spacing.xs },
  average: { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 41, color: colors.ink },
  stars: { flexDirection: "row", gap: 2 },
  bars: { flex: 1, gap: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  barLabel: { width: 10, textAlign: "center" },
  barCount: { minWidth: 18, textAlign: "right" },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.pending },
  strip: { marginHorizontal: -spacing.screen },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  foot: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.tint },
});
