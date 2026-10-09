import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Props = {
  title: string;
  /** Hide the back chevron on tab roots. */
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
};

/** Figma header: back chevron and a large title on the left, optional action on the right. */
export function ScreenHeader({ title, showBack = true, onBack, right }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={showBack ? "button" : "header"}
        accessibilityLabel={showBack ? `Back. ${title}` : title}
        disabled={!showBack}
        hitSlop={8}
        onPress={onBack ?? (() => router.back())}
        style={styles.titleRow}
      >
        {showBack && <ChevronLeft size={24} color={colors.ink} strokeWidth={2.25} />}
        <Text variant="title" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, flexShrink: 1 },
  title: { flexShrink: 1 },
});
