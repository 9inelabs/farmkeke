import { Check } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { passwordRules } from "@/lib/session";
import { colors, spacing } from "@/theme/tokens";
import { Text } from "./Text";

/** Password rules ticking off as you type (M-51, M-55). */
export function PasswordRules({ password }: { password: string }) {
  return (
    <View style={styles.list} accessibilityLiveRegion="polite">
      {passwordRules(password).map((rule) => (
        <View key={rule.label} style={styles.rule}>
          <View style={[styles.tick, rule.met && styles.tickOn]}>
            <Check size={10} color={rule.met ? colors.white : colors.inkMuted} strokeWidth={3} />
          </View>
          <Text variant="small" color={rule.met ? colors.success : colors.inkMuted}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  rule: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  tickOn: { backgroundColor: colors.success },
});
