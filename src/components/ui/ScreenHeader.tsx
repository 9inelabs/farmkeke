import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { androidUi } from "@/theme/platform";
import { colors, spacing } from "@/theme/tokens";
import { BackIcon } from "./BackIcon";
import { Text } from "./Text";

type Props = {
  title: string;
  /** Hide the back chevron on tab roots. */
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  /** A short line under the title ("You're shopping as a guest.") */
  subtitle?: string;
};

/** Back mark (chevron on iPhone, arrow on Android) and a small title on the left (a larger title on tab roots), optional action on the right. */
export function ScreenHeader({ title, showBack = true, onBack, right, subtitle }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Pressable
          accessibilityRole={showBack ? "button" : "header"}
          accessibilityLabel={showBack ? `Back. ${title}` : title}
          disabled={!showBack}
          hitSlop={8}
          onPress={onBack ?? (() => router.back())}
          style={styles.titleRow}
        >
          {showBack && <BackIcon />}
          <Text variant={showBack ? "backTitle" : "screenTitle"} numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </Text>
        </Pressable>
        {subtitle ? (
          <Text variant="small" color={colors.inkSoft} style={showBack && styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
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
    minHeight: 56,
  },
  left: { flexShrink: 1, gap: 2 },
  subtitle: { marginLeft: androidUi ? 32 : 20 },
  // Material puts more room between the arrow and the title
  titleRow: { flexDirection: "row", alignItems: "center", gap: androidUi ? 14 : 4, flexShrink: 1, marginLeft: -4 },
  title: { flexShrink: 1 },
});
