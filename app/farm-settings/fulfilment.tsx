// F-71 Fulfilment settings: when and where Farmkeke riders collect.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, ChipGroup, Notice, Screen, ScreenHeader, Skeleton, TextField } from "@/components/ui";
import { LEAD_TIMES } from "@/features/farmer/constants";
import { HoursEditor, type Hours } from "@/features/farmer/HoursEditor";
import { useFarm } from "@/features/farmer/useFarm";
import { errorMessage } from "@/lib/errors";
import { radii, spacing } from "@/theme/tokens";

const LEAD_OPTIONS = LEAD_TIMES.map((l) => ({ value: l.value, label: l.label }));

export default function FulfilmentSettings() {
  const farm = useFarm();
  const update = useMutation(api.farms.updateFulfilment);
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState<Hours>([]);
  const [leadTime, setLeadTime] = useState<number | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const farmId = farm?._id;
  useEffect(() => {
    if (!farm) return;
    setAddress(farm.collectionAddress);
    setHours(farm.collectionHours);
    setLeadTime(farm.leadTimeHours);
  }, [farmId]); // load once

  const save = async () => {
    const problems: Record<string, string> = {};
    if (!address.trim()) problems.address = "Enter where riders should collect.";
    if (hours.length === 0) problems.hours = "Choose at least one day.";
    else if (hours[0].opens >= hours[0].closes) problems.hours = "Closing time must be after opening time.";
    if (leadTime === undefined) problems.leadTime = "Choose how long you need.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0 || leadTime === undefined) return;
    setBusy(true);
    try {
      await update({ collectionAddress: address, collectionHours: hours, leadTimeHours: leadTime });
      router.back();
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Fulfilment settings" />}
      footer={<Button label="Save settings" fullWidth loading={busy} disabled={farm === undefined} onPress={() => void save()} />}
    >
      {farm === undefined ? (
        <Skeleton height={320} radius={radii.lg} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {banner !== null && <Notice tone="error">{banner}</Notice>}
          <Notice>Farmkeke riders collect every order from you. New orders are scheduled around these hours.</Notice>
          <TextField label="Collection address" value={address} onChangeText={setAddress} multiline error={errors.address} />
          <HoursEditor value={hours} onChange={setHours} error={errors.hours} />
          <ChipGroup
            label="Preparation time"
            helper="From when you accept an order to when it's ready for the rider."
            options={LEAD_OPTIONS}
            value={leadTime}
            onChange={setLeadTime}
            error={errors.leadTime}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.xl, paddingBottom: spacing.xxl } });
