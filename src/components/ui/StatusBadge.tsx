import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Text } from "./Text";

export type BadgeTone = "success" | "pending" | "error" | "brand" | "neutral";

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  pending: { bg: colors.pendingSoft, fg: "#9A6412" },
  error: { bg: colors.errorSoft, fg: colors.error },
  brand: { bg: colors.tint, fg: colors.forest },
  neutral: { bg: colors.surfaceMuted, fg: colors.inkSoft },
};

/** Small status label with a leading dot (order states, listing states). */
export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text variant="small" color={fg} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.medium },
});
