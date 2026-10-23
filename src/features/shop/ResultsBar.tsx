// "24 products · Filter" row above category and search results.
import { Sliders } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export function ResultsBar({ summary, active, onFilter }: { summary: string; active: number; onFilter: () => void }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" style={styles.flex} numberOfLines={1}>
        {summary}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active > 0 ? `Filter and sort, ${active} filters on` : "Filter and sort"}
        onPress={onFilter}
        style={[styles.button, active > 0 && styles.on]}
      >
        <Sliders size={16} color={colors.forest} />
        <Text variant="label" color={colors.forest}>
          {active > 0 ? `Filter (${active})` : "Filter"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.line,
  },
  on: { backgroundColor: colors.tint, borderColor: colors.lime },
});
