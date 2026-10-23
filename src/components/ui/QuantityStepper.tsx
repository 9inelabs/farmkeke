import { Minus, Plus } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
};

/** Pill stepper from the Product detail frame: light minus, dark plus. */
export function QuantityStepper({ value, min = 1, max = 999, onChange }: Props) {
  const canDecrease = value > min;
  const canIncrease = value < max;
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Quantity"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment" && canIncrease) onChange(value + 1);
        if (event.nativeEvent.actionName === "decrement" && canDecrease) onChange(value - 1);
      }}
    >
      <Pressable
        disabled={!canDecrease}
        hitSlop={6}
        onPress={() => onChange(value - 1)}
        style={[styles.button, styles.minus, !canDecrease && styles.disabled]}
      >
        <Minus size={14} color={colors.ink} strokeWidth={2.5} />
      </Pressable>
      <Text variant="bodyMedium" style={styles.value}>
        {String(value).padStart(2, "0")}
      </Text>
      <Pressable
        disabled={!canIncrease}
        hitSlop={6}
        onPress={() => onChange(value + 1)}
        style={[styles.button, styles.plus, !canIncrease && styles.disabled]}
      >
        <Plus size={14} color={colors.white} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 36,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  button: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  minus: { backgroundColor: colors.stepperTrack },
  plus: { backgroundColor: colors.ink },
  disabled: { opacity: 0.35 },
  value: { minWidth: 22, textAlign: "center" },
});
