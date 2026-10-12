// F-22 Add listing: details (and F-27 edit).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Chip, SelectField, Text, TextField } from "@/components/ui";
import { ListingStep } from "@/features/listings/ListingStep";
import { useListing } from "@/features/listings/useListing";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};

export default function ListingDetails() {
  const { listingId, listing, editing } = useListing();
  const categories = useQuery(api.catalog.listCategories);
  const save = useMutation(api.listings.saveDetails);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [harvestedOn, setHarvestedOn] = useState<string | undefined>();
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadedId = listing?._id;
  useEffect(() => {
    if (!listing) return;
    setName(listing.name);
    setCategoryId(listing.categoryId);
    setDescription(listing.description ?? "");
    setHarvestedOn(listing.harvestedOn);
  }, [loadedId]); // load once

  const today = daysAgo(0);
  const yesterday = daysAgo(1);
  const isOther = harvestedOn !== undefined && harvestedOn !== today && harvestedOn !== yesterday;

  const onSave = async (mode: "continue" | "draft") => {
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = "Give the produce a name buyers will search for.";
    if (!categoryId) problems.category = "Choose a category.";
    setErrors(problems);
    setBanner(null);
    // A draft needs at least a category to save details; otherwise skip quietly.
    if (mode === "continue" && Object.keys(problems).length > 0) return false;
    if (!name.trim() || !categoryId) return mode === "draft";
    setBusy(true);
    try {
      await save({ listingId, name, categoryId: categoryId as Id<"categories">, description, harvestedOn });
      return true;
    } catch (e) {
      if (errorCode(e) === "INVALID_DATE") setErrors({ harvest: "Choose a date in the last 90 days." });
      else setBanner(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListingStep
      stepKey="details"
      listingId={listingId}
      editing={editing}
      intro="Clear names sell better: say what it is and how it's sold."
      loading={listing === undefined || categories === undefined}
      banner={banner}
      staffNote={listing?.status === "needs_changes" ? listing.reviewNote : null}
      busy={busy}
      onSave={onSave}
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Fresh tomatoes"
        maxLength={60}
        error={errors.name}
        onFocus={() => setErrors((e) => ({ ...e, name: "" }))}
      />
      <SelectField
        label="Category"
        placeholder="Choose a category"
        options={(categories ?? []).map((c) => ({ value: c._id, label: c.name }))}
        value={categoryId}
        onChange={setCategoryId}
        error={errors.category}
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={600}
        placeholder="How it's grown, size, ripeness, how it's packed"
        helper={`${description.length}/600`}
      />
      <View style={styles.group}>
        <Text variant="label">When was it harvested? (optional)</Text>
        <View style={styles.chips}>
          <Chip label="Today" selected={harvestedOn === today} onPress={() => setHarvestedOn(today)} />
          <Chip label="Yesterday" selected={harvestedOn === yesterday} onPress={() => setHarvestedOn(yesterday)} />
          <Chip
            label={isOther ? new Date(`${harvestedOn}T12:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "Pick a date"}
            selected={isOther}
            onPress={() => setPicking(true)}
          />
          <Chip label="Not fresh produce" selected={harvestedOn === undefined} onPress={() => setHarvestedOn(undefined)} />
        </View>
        {errors.harvest ? (
          <Text variant="small" color={colors.error}>
            {errors.harvest}
          </Text>
        ) : (
          <Text variant="small">Buyers see "Picked today". Skip it for things like garri or dried crayfish.</Text>
        )}
        {picking && (
          <DateTimePicker
            value={harvestedOn ? new Date(`${harvestedOn}T12:00:00`) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            maximumDate={new Date()}
            minimumDate={new Date(Date.now() - 90 * 86_400_000)}
            onChange={(event, date) => {
              if (Platform.OS !== "ios") setPicking(false);
              if (event.type === "set" && date) setHarvestedOn(ymd(date));
            }}
          />
        )}
      </View>
    </ListingStep>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
