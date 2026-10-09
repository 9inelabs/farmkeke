import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Chip } from "./Chip";
import { Text } from "./Text";

type Option<T> = { value: T; label: string };

type Props<T> = {
  label: string;
  options: readonly Option<T>[];
  error?: string | null;
  helper?: string;
} & ({ multiple?: false; value: T | undefined; onChange: (value: T) => void } | { multiple: true; value: T[]; onChange: (value: T[]) => void });

/** A labelled row of chips, single or multiple choice. */
export function ChipGroup<T extends string | number>(props: Props<T>) {
  const isSelected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: T) => {
    if (props.multiple) props.onChange(isSelected(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onChange(v);
  };
  return (
    <View style={styles.wrap} accessibilityRole={props.multiple ? undefined : "radiogroup"} accessibilityLabel={props.label}>
      <Text variant="label">{props.label}</Text>
      {props.helper !== undefined && <Text variant="small">{props.helper}</Text>}
      <View style={styles.chips}>
        {props.options.map((o) => (
          <Chip key={String(o.value)} label={o.label} selected={isSelected(o.value)} onPress={() => toggle(o.value)} />
        ))}
      </View>
      {props.error ? (
        <Text variant="small" color={colors.error}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
