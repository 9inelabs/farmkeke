// F-10 Dashboard — Phase 3 shell. New orders with countdowns, orders to
// prepare and low-stock alerts arrive with listings and orders (Phases 4 and 6).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ClipboardList, Palmtree } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Notice, Skeleton, StatusBadge, Text } from "@/components/ui";
import { SetupCard, setupDone } from "@/features/farmer/SetupCard";
import { greeting } from "@/lib/greeting";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function Dashboard() {
  const farm = useQuery(api.farms.mine);
  const viewer = useQuery(api.users.viewer);
  const first = viewer?.name?.split(/\s+/)[0];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <StatusBadge label="Farmer mode" tone="brand" />
          <Text variant="caption">
            {greeting()}
            {first ? `, ${first}` : ""}
          </Text>
          {farm ? (
            <Text variant="title" accessibilityRole="header" numberOfLines={1}>
              {farm.name}
            </Text>
          ) : (
            <Skeleton width={200} height={28} />
          )}
        </View>

        {farm && setupDone(farm.checklist) < 3 && <SetupCard checklist={farm.checklist} />}
        {farm?.holidayMode && (
          <Notice tone="pending" icon={Palmtree}>
            Holiday mode is on. Buyers can't see your listings until you turn it off in Farm → Availability.
          </Notice>
        )}

        <View style={styles.stats}>
          <Stat label="New orders" value="0" hint="Accept within 24 hours" />
          <Stat label="To prepare" value="0" hint="Accepted, not yet packed" />
        </View>
        <View style={styles.money}>
          <View style={styles.flex}>
            <Text variant="small">Held by Farmkeke</Text>
            <Text variant="price">{formatNaira(0)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.flex}>
            <Text variant="small">Released to you</Text>
            <Text variant="price">{formatNaira(0)}</Text>
          </View>
        </View>

        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          message="When buyers order from your farm, they'll show here. You'll have 24 hours to accept each one."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="label">{label}</Text>
      <Text variant="small">{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.xs },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.tint, borderRadius: radii.lg, padding: spacing.lg, gap: 2 },
  money: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  flex: { flex: 1, gap: 2 },
  divider: { width: borders.hairline, backgroundColor: colors.line },
});
