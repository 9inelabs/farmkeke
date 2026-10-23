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
        <Text variant="bodyMedium" color={colors.white}>
          Finish setting up your farm
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.8)">
          {done} of 3 done
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(done / 3) * 100}%` }]} />
        </View>
      </View>
      <ChevronRight size={20} color={colors.lime} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.forest,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  flex: { flex: 1, gap: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", marginTop: spacing.xs },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
});
