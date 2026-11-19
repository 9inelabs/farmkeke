import { StyleSheet, View } from "react-native";
import { Pin, PinCheck } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

/** The "Drop-off pin" row: icon, label and status line, and one button. */
export function PinRow({
  set,
  subtitle,
  buttonLabel,
  loading = false,
  onPress,
}: {
  set: boolean;
  subtitle: string;
  buttonLabel: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, set && styles.iconOn]}>
        {set ? <PinCheck size={22} color={colors.forest} variant="solid" /> : <Pin size={22} color={colors.forest} />}
      </View>
      <View style={styles.flex}>
        <Text variant="label">Drop-off pin</Text>
        <Text variant="small">{subtitle}</Text>
      </View>
      <Button label={buttonLabel} variant="secondary" size="small" loading={loading} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  iconOn: { backgroundColor: colors.lime },
  flex: { flex: 1 },
});
