// F-72 Availability: weekly open days and holiday mode (hides listings).
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Break } from "@/components/icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { Button, ChipGroup, Notice, Screen, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { useFarm } from "@/features/farmer/useFarm";
import { errorMessage } from "@/lib/errors";
import { androidUi } from "@/theme/platform";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function Availability() {
  const farm = useFarm();
  const update = useMutation(api.farms.updateAvailability);
  const [days, setDays] = useState<number[]>([]);
  const [holiday, setHoliday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const farmId = farm?._id;
  useEffect(() => {
    if (!farm) return;
    setDays(farm.openDays);
    setHoliday(farm.holidayMode);
  }, [farmId]); // load once

  const save = async () => {
    if (days.length === 0 && !holiday) {
      setError("Choose at least one day, or turn on holiday mode.");
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await update({ openDays: days, holidayMode: holiday });
      router.back();
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Availability" />}
      footer={<Button label="Save availability" fullWidth loading={busy} disabled={farm === undefined} onPress={() => void save()} />}
    >
      {farm === undefined ? (
        <Skeleton height={240} radius={radii.lg} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {banner !== null && <Notice tone="error">{banner}</Notice>}
          <ChipGroup
            label="Days you take orders"
            multiple
            options={DAYS}
            value={days}
            onChange={(d) => {
              setDays(d);
              setError(null);
            }}
            error={error}
          />
          <View style={styles.holiday}>
            <View style={styles.icon}>
              <Break size={20} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyMedium">Holiday mode</Text>
              <Text variant="small">Hides all your listings from buyers. Orders already placed still need to be completed.</Text>
            </View>
            <Switch
              value={holiday}
              onValueChange={setHoliday}
              // iPhone: a lime track and white knob; Android (Material): forest track, lime knob
              trackColor={{ true: androidUi ? colors.forest : colors.lime, false: colors.line }}
              thumbColor={androidUi ? (holiday ? colors.lime : "#F4F4F4") : colors.white}
              ios_backgroundColor={colors.line}
              accessibilityLabel="Holiday mode"
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingBottom: spacing.xxl },
  holiday: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
  },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
});
