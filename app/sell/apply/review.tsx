// F-08 Apply: review and submit (step 6 of 6). Also where F-09b resubmits.
import { api } from "@convex/_generated/api";
import type { Section } from "@convex/lib/application";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { Edit, Info } from "@/components/icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Checkbox, Text } from "@/components/ui";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { DOCUMENTS, FARM_SIZES, FARM_TYPES, labelOf, LEAD_TIMES, SEASONS, STEPS } from "@/features/farmer/constants";
import { nationalPhone } from "@/features/farmer/StepFooter";
import { useEditableApplication, type Application } from "@/features/farmer/useApplication";
import { errorCode, errorMessage } from "@/lib/errors";
import { formatHours } from "@/lib/hours";
import { borders, colors, radii, spacing } from "@/theme/tokens";

function summary(app: Application, categories: string[]): Record<Section, string[]> {
  const docCount = (kind: keyof typeof DOCUMENTS) =>
    app.documents.filter((d) => d.kind === kind && d.status !== "rejected").length;
  return {
    farm: [
      app.farmName ?? "",
      nationalPhone(app.phone),
      [app.address, app.lga, app.state].filter(Boolean).join(", "),
      [labelOf(FARM_SIZES, app.farmSize), labelOf(FARM_TYPES, app.farmType)].filter(Boolean).join(" · "),
    ],
    produce: [categories.join(", "), app.mainCrops ?? "", app.seasons.map((s) => labelOf(SEASONS, s)).join(", ")],
    collection: [
      app.collectionAddress ?? "",
      app.collectionHours.length ? formatHours(app.collectionHours) : "",
      app.leadTimeHours ? `Needs ${LEAD_TIMES.find((l) => l.value === app.leadTimeHours)?.detail ?? `${app.leadTimeHours} hours`} to prepare` : "",
    ],
    documents: (Object.keys(DOCUMENTS) as (keyof typeof DOCUMENTS)[]).map(
      (kind) => `${DOCUMENTS[kind].title}: ${docCount(kind)} ${docCount(kind) === 1 ? "photo" : "photos"}`,
    ),
    payout: [app.bankName ?? "", app.accountNumber ? `•••• ${app.accountNumber.slice(-4)}` : "", app.accountName ?? ""],
  };
}

export default function Review() {
  const app = useEditableApplication();
  const categories = useQuery(api.catalog.listCategories);
  const submit = useMutation(api.farmerApplications.submit);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = (categories ?? []).filter((c) => app?.categoryIds.includes(c._id)).map((c) => c.name);
  const lines = app ? summary(app, chosen) : null;
  const incomplete = app ? Object.keys(app.problems).length > 0 : true;

  const send = async () => {
    if (!terms) {
      setTermsError("Tick the box to agree to the farmer terms.");
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const { reference } = await submit({ acceptTerms: true });
      router.replace({ pathname: "/sell/submitted", params: { reference } });
    } catch (e) {
      const code = errorCode(e);
      if (code === "PHONE_TAKEN") setBanner("That phone number is already used by another Farmkeke account. Use a different number in Farm details.");
      else if (code === "INCOMPLETE") setBanner("Some details are missing. Fix the sections marked below.");
      else setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ApplyStep
      step={6}
      intro="Check everything before you send it. You can edit any section."
      loading={app === undefined || categories === undefined}
      banner={banner}
      footer={
        <Button
          label={app?.status === "more_info" ? "Resubmit application" : "Submit application"}
          fullWidth
          loading={busy}
          disabled={incomplete}
          onPress={() => void send()}
        />
      }
    >
      {app && lines
        ? STEPS.slice(0, 5).map((step) => {
            const section = step.section as Section;
            const problems = app.problems[section] ?? [];
            return (
              <View key={section} style={[styles.card, problems.length > 0 && styles.cardFlagged]}>
                <View style={styles.cardHeader}>
                  <Text variant="bodyMedium" style={styles.flex}>
                    {step.title}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${step.title}`}
                    hitSlop={8}
                    onPress={() => router.push(step.path)}
                    style={styles.edit}
                  >
                    <Edit size={14} color={colors.forest} />
                    <Text variant="label" color={colors.forest}>
                      Edit
                    </Text>
                  </Pressable>
                </View>
                {lines[section].filter(Boolean).map((line) => (
                  <Text key={line} variant="caption" color={colors.ink}>
                    {line}
                  </Text>
                ))}
                {problems.map((p) => (
                  <View key={p} style={styles.problem}>
                    <Info size={14} color={colors.error} />
                    <Text variant="small" color={colors.error}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })
        : null}

      <View style={styles.terms}>
        <Checkbox
          label="I agree to the Farmkeke farmer terms"
          checked={terms}
          onChange={(v) => {
            setTerms(v);
            setTermsError(null);
          }}
        />
        <Text variant="small" color={colors.forest} accessibilityRole="link" onPress={() => router.push("/farm-settings/terms")}>
          Read the farmer terms
        </Text>
        {termsError ? (
          <Text variant="small" color={colors.error}>
            {termsError}
          </Text>
        ) : null}
      </View>
    </ApplyStep>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime, padding: spacing.md, gap: 4 },
  cardFlagged: { borderColor: colors.error, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  flex: { flex: 1 },
  edit: { flexDirection: "row", alignItems: "center", gap: 4 },
  problem: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  terms: { gap: spacing.sm },
});
