// Summary of the F-14 setup checklist, shown on the dashboard and Farm tab.
import { router } from "expo-router";
import { ChevronRight } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

type Checklist = { profile: boolean; collection: boolean; firstListing: boolean };

export const setupDone = (c: Checklist) => [c.profile, c.collection, c.firstListing].filter(Boolean).length;

export function SetupCard({ checklist }: { checklist: Checklist }) {
  const done = setupDone(checklist);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Finish setting up your farm. ${done} of 3 done`}
      onPress={() => router.push("/farm-settings/setup")}
      style={styles.card}
    >
      <View style={styles.flex}>
        <Text variant="bodyMedium">Finish setting up</Text>
        <Text variant="small">{done} of 3 steps done</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(done / 3) * 100}%` }]} />
        </View>
      </View>
      <ChevronRight size={20} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: colors.lime,
    padding: spacing.lg,
  },
  flex: { flex: 1, gap: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.tint, marginTop: spacing.xs },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
});
