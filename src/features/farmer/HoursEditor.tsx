// Collection days and hours (F-05, F-71): the same opening and closing time
// on every chosen day, which is how farms describe rider collection.
import { StyleSheet, View } from "react-native";
import { ChipGroup, SelectField, Text } from "@/components/ui";
import { formatHours, formatTime } from "@/lib/hours";
import { colors, spacing } from "@/theme/tokens";

export type Hours = { day: number; opens: string; closes: string }[];

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIMES = Array.from({ length: 17 }, (_, i) => {
  const hhmm = `${String(i + 5).padStart(2, "0")}:00`; // 5 AM … 9 PM
  return { value: hhmm, label: formatTime(hhmm) };
});

type Props = { value: Hours; onChange: (hours: Hours) => void; error?: string | null };

export function HoursEditor({ value, onChange, error }: Props) {
  const days = value.map((h) => h.day);
  const opens = value[0]?.opens ?? "08:00";
  const closes = value[0]?.closes ?? "17:00";
  const build = (d: number[], o: string, c: string) => d.map((day) => ({ day, opens: o, closes: c }));
  const timeError = value.length > 0 && opens >= closes ? "Closing time must be after opening time." : null;

  return (
    <View style={styles.wrap}>
      <ChipGroup label="Days riders can collect" multiple options={DAYS} value={days} onChange={(d) => onChange(build(d, opens, closes))} error={error} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <SelectField label="From" placeholder="Opens" options={TIMES} value={opens} onChange={(o) => onChange(build(days, o, closes))} />
        </View>
        <View style={styles.flex}>
          <SelectField label="To" placeholder="Closes" options={TIMES} value={closes} onChange={(c) => onChange(build(days, opens, c))} error={timeError} />
        </View>
      </View>
      {value.length > 0 && !timeError && (
        <Text variant="small" color={colors.forest}>
          {formatHours(value)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
