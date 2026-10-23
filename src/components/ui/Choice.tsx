import { Check } from "@/components/icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

/** Radio list row (M-06 areas, sort options). */
export function RadioRow({
  title,
  subtitle,
  selected,
  onPress,
  trailing,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.dot} />}</View>
      <View style={styles.copy}>
        <Text variant="bodyMedium">{title}</Text>
        {subtitle !== undefined && <Text variant="small">{subtitle}</Text>}
      </View>
      {trailing}
    </Pressable>
  );
}

/** Square checkbox with a label. */
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
      </View>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 60 },
  pressed: { backgroundColor: colors.surfaceMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.inkMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.forest },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.forest },
  copy: { flex: 1, gap: 2, paddingVertical: spacing.md },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm - 2,
    borderWidth: borders.hairline * 3,
    borderColor: colors.inkMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
});
