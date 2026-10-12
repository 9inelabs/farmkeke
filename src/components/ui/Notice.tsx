import { AlertCircle, Info, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Tone = "brand" | "error" | "pending";

const tones: Record<Tone, { bg: string; fg: string; border: string; icon: LucideIcon }> = {
  brand: { bg: colors.tint, fg: colors.forest, border: colors.lime, icon: Info },
  error: { bg: colors.errorSoft, fg: colors.error, border: colors.errorSoft, icon: AlertCircle },
  pending: { bg: colors.pendingSoft, fg: colors.pendingInk, border: colors.pendingSoft, icon: Info },
};

type Props = {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
};

/** Inline message box: info (tint), error (red) or waiting (amber). */
export function Notice({ tone = "brand", icon, children }: Props) {
  const t = tones[tone];
  const Icon = icon ?? t.icon;
  return (
    <View
      accessibilityLiveRegion={tone === "error" ? "polite" : "none"}
      style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icon size={18} color={t.fg} strokeWidth={2} />
      <View style={styles.copy}>
        {typeof children === "string" ? (
          <Text variant="caption" color={t.fg}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
  },
  copy: { flex: 1 },
});
