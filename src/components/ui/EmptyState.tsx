import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Button } from "./Button";
import { Text } from "./Text";

type Props = {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Error states use a red icon. */
  tone?: "brand" | "error";
};

/** One illustration, one sentence, one action (shared state rule 2 and 3). */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, tone = "brand" }: Props) {
  const isError = tone === "error";
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: isError ? colors.errorSoft : colors.tint }]}>
        <Icon size={28} color={isError ? colors.error : colors.forest} strokeWidth={1.75} />
      </View>
      <Text variant="section" align="center">
        {title}
      </Text>
      <Text variant="body" color={colors.inkSoft} align="center" style={styles.message}>
        {message}
      </Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <Button label={actionLabel} variant="secondary" size="small" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xxxl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  message: { maxWidth: 300 },
  action: { marginTop: spacing.md },
});
