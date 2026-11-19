import { Check } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { passwordRules } from "@/lib/session";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Text } from "./Text";

/**
 * Password rules ticking off as you type (M-51, M-55). `meter` adds a
 * three-part strength bar and lays the rules out in a row, as on the
 * premium sign-in screens.
 */
export function PasswordRules({ password, meter = false }: { password: string; meter?: boolean }) {
  const rules = passwordRules(password);
  if (meter) {
    const met = rules.filter((r) => r.met).length;
    return (
      <View style={styles.meterWrap} accessibilityLiveRegion="polite">
        <View style={styles.bar}>
          {rules.map((_, i) => (
            <View key={i} style={styles.track}>
              <Animated.View layout={LinearTransition.duration(250)} style={[styles.fill, { width: i < met ? "100%" : "0%" }]} />
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {rules.map((rule) => (
            <View key={rule.label} style={styles.inline}>
              {rule.met ? <Check size={14} color={colors.success} strokeWidth={3} /> : <View style={styles.bullet} />}
              <Text style={[styles.inlineText, { color: rule.met ? colors.success : colors.inkMuted }]}>{rule.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.list} accessibilityLiveRegion="polite">
      {rules.map((rule) => (
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
  meterWrap: { gap: 9 },
  bar: { flexDirection: "row", gap: 5 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E6ECDF", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: colors.forest },
  row: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
  inline: { flexDirection: "row", alignItems: "center", gap: 5 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CFD6C8", marginHorizontal: 4 },
  inlineText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
});
