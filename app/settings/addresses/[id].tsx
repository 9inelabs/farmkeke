// M-85 Add or edit address (/settings/addresses/new or /settings/addresses/<id>).
// The exact map pin (M-35) is added with maps at checkout in Phase 6.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Pin, Trash } from "@/components/icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  ListGroup,
  Notice,
  RadioRow,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  TextField,
} from "@/components/ui";
import { ADDRESS_ICONS, ADDRESS_LABELS, type AddressLabel } from "@/features/account/addressLabels";
import { useAccount } from "@/features/account/useAccount";
import { errorCode, errorMessage } from "@/lib/errors";
import { usePrefs } from "@/store/prefs";
import { colors, radii, spacing } from "@/theme/tokens";

type Area = { _id: Id<"serviceAreas">; name: string; state: string };

export default function AddressForm() {
  useAccount();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const existing = useQuery(api.addresses.get, isNew ? "skip" : { addressId: id as Id<"addresses"> });
  const browsingArea = usePrefs((s) => s.area);

  const create = useMutation(api.addresses.create);
  const update = useMutation(api.addresses.update);
  const remove = useMutation(api.addresses.remove);

  const [label, setLabel] = useState<AddressLabel>("home");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [area, setArea] = useState<Area | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<{ street?: string; landmark?: string; area?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const states = useQuery(api.areas.listServedStates);
  const [pickerState, setPickerState] = useState<string | null>(null);
  const pickerAreas = useQuery(api.areas.listServiceAreas, pickerState ? { state: pickerState } : "skip");

  // Prefill: the saved address, or for a new one the area chosen for browsing.
  useEffect(() => {
    if (existing) {
      setLabel(existing.label);
      setStreet(existing.street);
      setLandmark(existing.landmark);
      setIsDefault(existing.isDefault);
      if (existing.area) setArea(existing.area);
    } else if (isNew && browsingArea) {
      setArea({
        _id: browsingArea.serviceAreaId as Id<"serviceAreas">,
        name: browsingArea.name,
        state: browsingArea.state,
      });
    }
  }, [existing, isNew, browsingArea]);
  useEffect(() => {
    if (pickerState === null && states && states.length > 0) setPickerState(area?.state ?? states[0]);
  }, [pickerState, states, area]);

  const save = async () => {
    const problems: typeof errors = {};
    if (street.trim().length === 0) problems.street = "Enter the house number and street.";
    if (landmark.trim().length === 0) problems.landmark = "Add a landmark so riders can find you.";
    if (area === null) problems.area = "Choose the area.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0 || area === null) return;
    setBusy(true);
    try {
      const fields = { label, street, landmark, serviceAreaId: area._id, isDefault };
      if (isNew) await create(fields);
      else await update({ addressId: id as Id<"addresses">, ...fields });
      router.back();
    } catch (e) {
      const code = errorCode(e);
      if (code === "STREET_REQUIRED") setErrors({ street: errorMessage(e) });
      else if (code === "LANDMARK_REQUIRED") setErrors({ landmark: errorMessage(e) });
      else if (code === "AREA_NOT_SERVED") setErrors({ area: errorMessage(e) });
      else setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteAddress = async () => {
    setConfirmDelete(false);
    try {
      await remove({ addressId: id as Id<"addresses"> });
      router.back();
    } catch (e) {
      setBanner(errorMessage(e));
    }
  };

  const loading = !isNew && existing === undefined;

  return (
    <Screen
      header={<ScreenHeader title={isNew ? "Add address" : "Edit address"} />}
      footer={<Button label="Save address" fullWidth loading={busy} disabled={loading} onPress={() => void save()} />}
    >
      {loading ? (
        <Skeleton height={320} radius={radii.lg} />
      ) : existing === null ? (
        <Notice tone="error">This address isn't available any more.</Notice>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {banner !== null && <Notice tone="error">{banner}</Notice>}
          <View style={styles.field}>
            <Text variant="label">Label</Text>
            <View style={styles.chips}>
              {(Object.keys(ADDRESS_LABELS) as AddressLabel[]).map((key) => (
                <Chip
                  key={key}
                  label={ADDRESS_LABELS[key]}
                  icon={ADDRESS_ICONS[key]}
                  selected={label === key}
                  onPress={() => setLabel(key)}
                />
              ))}
            </View>
          </View>
          <TextField
            label="Street address"
            placeholder="House number and street"
            value={street}
            onChangeText={(t) => {
              setStreet(t);
              setErrors((e) => ({ ...e, street: undefined }));
            }}
            error={errors.street}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
          />
          <TextField
            label="Nearest landmark"
            placeholder="A church, school or junction nearby"
            value={landmark}
            onChangeText={(t) => {
              setLandmark(t);
              setErrors((e) => ({ ...e, landmark: undefined }));
            }}
            error={errors.landmark}
            helper="Riders use this to find you quickly."
          />
          <View style={styles.field}>
            <Text variant="label">Area</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Area: ${area ? `${area.name}, ${area.state}` : "not chosen"}. Change area`}
              onPress={() => setPicking(true)}
              style={[styles.select, errors.area !== undefined && styles.selectError]}
            >
              <Pin size={18} color={colors.inkMuted} />
              <Text variant="body" style={styles.flex} color={area ? colors.ink : colors.inkMuted}>
                {area ? `${area.name}, ${area.state}` : "Choose the area"}
              </Text>
              <ChevronDown size={18} color={colors.inkMuted} />
            </Pressable>
            {errors.area !== undefined && (
              <Text variant="small" color={colors.error}>
                {errors.area}
              </Text>
            )}
          </View>
          <Checkbox label="Make this my default address" checked={isDefault} onChange={setIsDefault} />
          {!isNew && (
            <Button label="Delete address" icon={Trash} variant="ghost" onPress={() => setConfirmDelete(true)} />
          )}
        </ScrollView>
      )}

      <BottomSheet visible={picking} onClose={() => setPicking(false)}>
        <Text variant="heading">Choose the area</Text>
        {states !== undefined && states.length > 1 && (
          <View style={styles.chips}>
            {states.map((s) => (
              <Chip key={s} label={s} selected={s === pickerState} onPress={() => setPickerState(s)} />
            ))}
          </View>
        )}
        <ScrollView style={styles.sheetList}>
          <ListGroup>
            {(pickerAreas ?? []).map((a) => (
              <RadioRow
                key={a._id}
                title={a.name}
                subtitle={a.lga}
                selected={area?._id === a._id}
                onPress={() => {
                  setArea({ _id: a._id, name: a.name, state: a.state });
                  setErrors((e) => ({ ...e, area: undefined }));
                  setPicking(false);
                }}
              />
            ))}
          </ListGroup>
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text variant="heading">Delete this address?</Text>
        <Text variant="caption">Orders already on their way still go to this address.</Text>
        <Button label="Delete address" variant="danger" fullWidth onPress={() => void deleteAddress()} />
        <Button label="Keep it" variant="ghost" fullWidth onPress={() => setConfirmDelete(false)} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  select: {
    minHeight: 56,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectError: { borderWidth: 1, borderColor: colors.error },
  flex: { flex: 1 },
  sheetList: { maxHeight: 360 },
});
