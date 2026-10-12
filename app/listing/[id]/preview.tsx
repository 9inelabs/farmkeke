// F-25 Listing preview: see it as buyers will, then submit (F-31 resubmit).
import { api } from "@convex/_generated/api";
import type { ListingStep as StepKey } from "@convex/lib/listing";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { AlertCircle, Pencil } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Notice, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { LISTING_STEPS } from "@/features/listings/ListingStep";
import { useListing } from "@/features/listings/useListing";
import { ProductDetailView } from "@/features/product/ProductDetailView";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

export default function ListingPreview() {
  const { listingId, listing } = useListing();
  const submit = useMutation(api.listings.submit);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problems = listing ? (Object.entries(listing.problems) as [StepKey, string[]][]) : [];
  const alreadyOut = listing?.status === "live" || listing?.status === "under_review" || listing?.status === "paused";

  const send = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const { status } = await submit({ listingId });
      router.replace({ pathname: `/listing/${listingId}/submitted`, params: { status } });
    } catch (e) {
      const code = errorCode(e);
      setBanner(
        code === "INCOMPLETE"
          ? "Some details are missing. Fix the sections marked above."
          : code === "FARM_SUSPENDED"
            ? "Selling is paused on your farm, so this can't go live right now."
            : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={alreadyOut ? "Listing preview" : "Preview"} />
      {listing === undefined ? (
        <View style={styles.pad}>
          <Skeleton height={320} radius={radii.lg} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.pad}>
            <Text variant="caption">This is how buyers will see your listing.</Text>
            {listing.status === "needs_changes" && listing.reviewNote ? (
              <Notice tone="pending">{`Farmkeke asked for changes: ${listing.reviewNote}`}</Notice>
            ) : null}
            {problems.map(([step, messages]) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: `/listing/${listingId}/${step}`, params: { edit: "1" } })}
                style={styles.problem}
              >
                <AlertCircle size={16} color={colors.error} />
                <Text variant="small" color={colors.error} style={styles.flex}>
                  {LISTING_STEPS.find((s) => s.key === step)?.title}: {messages.join(", ")}
                </Text>
                <Pencil size={14} color={colors.error} />
              </Pressable>
            ))}
          </View>
          <ProductDetailView
            name={listing.name}
            photos={listing.photos.map((p) => p.url)}
            units={listing.units}
            description={listing.description}
            harvestedOn={listing.harvestedOn}
            delivery={listing.delivery}
            pickup={listing.pickup}
            farm={listing.farm}
          />
          <View style={styles.pad}>
            <Text variant="overline">Change something</Text>
            <View style={styles.edits}>
              {LISTING_STEPS.slice(0, 4).map((s) => (
                <Button
                  key={s.key}
                  label={s.title}
                  icon={Pencil}
                  variant="secondary"
                  size="small"
                  onPress={() => router.push({ pathname: `/listing/${listingId}/${s.key}`, params: { edit: "1" } })}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
      <View style={styles.footer}>
        {banner !== null && <Notice tone="error">{banner}</Notice>}
        {alreadyOut ? (
          <Button label="Done" fullWidth onPress={() => router.back()} />
        ) : (
          <Button
            label={listing?.farm.trusted ? "Publish listing" : listing?.status === "needs_changes" ? "Resubmit for review" : "Submit for review"}
            fullWidth
            loading={busy}
            disabled={listing === undefined || problems.length > 0}
            onPress={() => void send()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  pad: { padding: spacing.screen, gap: spacing.sm },
  problem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  flex: { flex: 1 },
  edits: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { paddingHorizontal: spacing.screen, paddingVertical: spacing.md, gap: spacing.sm },
});
