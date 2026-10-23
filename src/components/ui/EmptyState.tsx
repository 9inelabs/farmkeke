import type { IconComponent } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { Stagger } from "@/components/motion/reveal";
import { colors, spacing } from "@/theme/tokens";
import { Button } from "./Button";
import { Text } from "./Text";

type Props = {
  icon: IconComponent;
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
      <Stagger itemStyle={styles.item}>
        <View style={[styles.iconCircle, { backgroundColor: isError ? colors.errorSoft : colors.lime }]}>
          <Icon size={30} color={isError ? colors.error : colors.forest} variant={isError ? "line" : "solid"} />
        </View>
        <Text variant="section" align="center">
          {title}
        </Text>
        <Text variant="body" color={colors.inkSoft} align="center" style={styles.message}>
          {message}
        </Text>
        {actionLabel !== undefined && onAction !== undefined && (
          <Button label={actionLabel} variant="dark" pill onPress={onAction} style={styles.action} />
        )}
      </Stagger>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xxxl },
  item: { alignSelf: "stretch", alignItems: "center" },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  message: { maxWidth: 300 },
  action: { marginTop: spacing.xl, height: 46, paddingHorizontal: spacing.xxl },
});
