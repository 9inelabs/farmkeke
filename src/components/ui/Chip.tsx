import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Props = {
  label: string;
  selected?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
};

/** Selectable chip: unit options, filters, quick tags, address labels. */
export function Chip({ label, selected = false, icon: Icon, onPress }: Props) {
  const fg = selected ? colors.forest : colors.ink;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected }}
      disabled={onPress === undefined}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {Icon !== undefined && <Icon size={14} color={fg} strokeWidth={2} />}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderWidth: borders.hairline,
  },
  idle: { backgroundColor: colors.white, borderColor: colors.line },
  selected: { backgroundColor: colors.tint, borderColor: colors.lime },
});
