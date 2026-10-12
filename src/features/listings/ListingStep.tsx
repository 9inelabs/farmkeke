// Layout for the add / edit listing steps (F-21 to F-25, F-27).
import { router } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Button, StepScreen } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export const LISTING_STEPS = [
  { key: "photos", title: "Photos" },
  { key: "details", title: "About the produce" },
  { key: "pricing", title: "Price, unit and stock" },
  { key: "fulfilment", title: "Delivery and pickup" },
  { key: "preview", title: "Preview" },
] as const;

export type ListingStepKey = (typeof LISTING_STEPS)[number]["key"];

type Props = {
  stepKey: ListingStepKey;
  listingId: string;
  /** Editing one section of an existing listing (F-27): no progress bar, Save returns. */
  editing: boolean;
  intro?: string;
  loading?: boolean;
  banner?: string | null;
  staffNote?: string | null;
  busy: boolean;
  /**
   * Saves this step; return false to stay. "continue" checks the step is
   * complete; "draft" saves whatever is there.
   */
  onSave: (mode: "continue" | "draft") => Promise<boolean>;
  children: ReactNode;
};

export function ListingStep({ stepKey, listingId, editing, intro, loading, banner, staffNote, busy, onSave, children }: Props) {
  const index = LISTING_STEPS.findIndex((s) => s.key === stepKey);
  const next = LISTING_STEPS[index + 1];
  const proceed = async () => {
    if (!(await onSave("continue"))) return;
    if (editing) router.back();
    else if (next) router.push(`/listing/${listingId}/${next.key}`);
  };
  return (
    <StepScreen
      headerTitle={editing ? "Edit listing" : "Add listing"}
      title={LISTING_STEPS[index].title}
      step={editing ? undefined : index + 1}
      totalSteps={editing ? undefined : LISTING_STEPS.length}
      intro={intro}
      loading={loading}
      banner={banner}
      staffNote={staffNote}
      footer={
        <View style={{ gap: spacing.xs }}>
          <Button label={editing ? "Save" : "Continue"} fullWidth loading={busy} onPress={() => void proceed()} />
          {!editing && (
            <Button
              label="Save as draft"
              variant="ghost"
              fullWidth
              disabled={busy}
              onPress={() => void onSave("draft").then((saved) => saved && router.dismissTo("/listings"))}
            />
          )}
        </View>
      }
    >
      {children}
    </StepScreen>
  );
}
