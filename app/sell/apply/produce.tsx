// F-04 Apply: what you grow (step 2 of 6).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CategoryTile, ChipGroup, Skeleton, Text, TextField } from "@/components/ui";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { SEASONS, type Season } from "@/features/farmer/constants";
import { StepFooter } from "@/features/farmer/StepFooter";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

export default function WhatYouGrow() {
  const app = useEditableApplication();
  const categories = useQuery(api.catalog.listCategories);
  const save = useMutation(api.farmerApplications.saveProduce);

  const [categoryIds, setCategoryIds] = useState<Id<"categories">[]>([]);
  const [mainCrops, setMainCrops] = useState("");
  const [typicalVolume, setTypicalVolume] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    setCategoryIds(app.categoryIds);
    setMainCrops(app.mainCrops ?? "");
    setTypicalVolume(app.typicalVolume ?? "");
    setSeasons(app.seasons);
  }, [appId]); // load once per application

  const toggleCategory = (id: Id<"categories">) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const persist = () => save({ categoryIds, mainCrops, typicalVolume, seasons });

  const next = async () => {
    const problems: Record<string, string> = {};
    if (categoryIds.length === 0) problems.categories = "Choose at least one category.";
    if (!mainCrops.trim()) problems.mainCrops = "Tell us your main crops or products.";
    if (seasons.length === 0) problems.seasons = "Choose when you sell.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await persist();
      router.push("/sell/apply/collection");
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveLater = async () => {
    try {
      await persist();
      return true;
    } catch (e) {
      setBanner(errorMessage(e));
      return false;
    }
  };

  return (
    <ApplyStep
      step={2}
      intro="This helps us know what to expect from your farm. You'll list exact produce and prices later."
      loading={app === undefined}
      banner={banner}
      adminNote={app?.status === "more_info" && app.moreInfo?.sections.includes("produce") ? app.moreInfo.note : null}
      footer={<StepFooter busy={busy} onContinue={() => void next()} onSaveLater={saveLater} />}
    >
      <View style={styles.group}>
        <Text variant="label">What do you sell?</Text>
        <Text variant="small">Choose all that apply.</Text>
        <View style={styles.grid}>
          {categories === undefined
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} width={63} height={63} radius={radii.lg} />)
            : categories.map((c) => (
                <CategoryTile
                  key={c._id}
                  name={c.name}
                  illustration={c.illustration}
                  selected={categoryIds.includes(c._id)}
                  onPress={() => toggleCategory(c._id)}
                />
              ))}
        </View>
        {errors.categories ? (
          <Text variant="small" color={colors.error}>
            {errors.categories}
          </Text>
        ) : null}
      </View>
      <TextField
        label="Main crops or products"
        value={mainCrops}
        onChangeText={setMainCrops}
        placeholder="e.g. Tomatoes, peppers, ugwu"
        error={errors.mainCrops}
        onFocus={() => setErrors((e) => ({ ...e, mainCrops: "" }))}
      />
      <TextField
        label="How much you usually have (optional)"
        value={typicalVolume}
        onChangeText={setTypicalVolume}
        placeholder="e.g. About 20 baskets of tomatoes a week"
      />
      <ChipGroup label="When do you sell?" multiple options={SEASONS} value={seasons} onChange={setSeasons} error={errors.seasons} />
    </ApplyStep>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.lg, marginTop: spacing.sm },
});
