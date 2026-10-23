// A listing's own page in farmer mode: status, F-31 staff reason, F-28 quick
// update, F-27 edit by section, F-29 pause / out of stock / delete.
import { router } from "expo-router";
import { BoxRemove, Edit, Eye, Pause, Play, Refresh, Trash } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, ListGroup, ListRow, Notice, Screen, ScreenHeader, Skeleton, StatusBadge, Text } from "@/components/ui";
import { ConfirmActionSheet, type ListingAction } from "@/features/listings/ConfirmActionSheet";
import { LISTING_STEPS } from "@/features/listings/ListingStep";
import { QuickUpdateSheet } from "@/features/listings/QuickUpdateSheet";
import { STATUS_BADGE, stockLabel, tabOf } from "@/features/listings/status";
import { useListing } from "@/features/listings/useListing";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function ListingPage() {
  const { listingId, listing } = useListing();
  const [quick, setQuick] = useState(false);
  const [action, setAction] = useState<ListingAction | null>(null);

  if (listing === undefined) {
    return (
      <Screen header={<ScreenHeader title="Listing" />}>
        <Skeleton height={280} radius={radii.lg} />
      </Screen>
    );
  }

  const tab = tabOf(listing);
  const badge = STATUS_BADGE[tab];
  const editSection = (key: string) => router.push({ pathname: `/listing/${listingId}/${key}`, params: { edit: "1" } });

  return (
    <Screen header={<ScreenHeader title={listing.name || "Untitled listing"} />}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <StatusBadge label={badge.label} tone={badge.tone} />
          {listing.status === "under_review" && listing.expectedReviewAt ? (
            <Text variant="small">Decision expected by {new Date(listing.expectedReviewAt).toLocaleString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit" })}</Text>
          ) : null}
        </View>

        {listing.status === "needs_changes" && (
          <View style={styles.changes}>
            <Notice tone="pending">{`Farmkeke asked for changes: ${listing.reviewNote ?? "see the note from our team."}`}</Notice>
            <Button label="Edit and resubmit" icon={Edit} fullWidth onPress={() => router.push(`/listing/${listingId}/preview`)} />
          </View>
        )}
        {listing.status === "draft" && (
          <Button label="Continue this draft" fullWidth onPress={() => router.push(`/listing/${listingId}/preview`)} />
        )}

        <View style={styles.units}>
          {listing.units.length === 0 ? (
            <Text variant="caption">No price yet.</Text>
          ) : (
            listing.units.map((u, i) => (
              <View key={u.unitId} style={[styles.unitRow, i > 0 && styles.divider]}>
                <Text variant="bodyMedium" style={styles.flex}>
                  {formatNaira(u.priceKobo)} per {u.singular}
                </Text>
                <Text variant="small" color={u.stock === 0 ? colors.error : u.stock <= 3 ? colors.pendingInk : colors.inkMuted}>
                  {u.stock === 0 ? "Sold out" : stockLabel(u)}
                </Text>
              </View>
            ))
          )}
        </View>

        {listing.status !== "draft" && listing.units.length > 0 && (
          <Button label="Quick update price or stock" icon={Refresh} variant="secondary" fullWidth onPress={() => setQuick(true)} />
        )}

        <ListGroup title="Edit">
          {LISTING_STEPS.slice(0, 4).map((s) => (
            <ListRow key={s.key} icon={Edit} title={s.title} onPress={() => editSection(s.key)} />
          ))}
          <ListRow icon={Eye} title="Preview as buyers see it" onPress={() => router.push(`/listing/${listingId}/preview`)} />
        </ListGroup>
        {listing.status === "live" && (
          <Text variant="small">
            Price, stock and delivery changes apply at once. Changing photos, the name, category or description sends the listing back for a quick review
            {listing.farm.trusted ? ", except for trusted farms like yours." : "."}
          </Text>
        )}

        <ListGroup title="Status">
          {listing.status === "live" && <ListRow icon={Pause} title="Pause listing" subtitle="Hide it from buyers for now" onPress={() => setAction("pause")} />}
          {listing.status === "paused" && <ListRow icon={Play} title="Resume listing" subtitle="Show it to buyers again" onPress={() => setAction("resume")} />}
          {listing.status !== "draft" && !listing.outOfStock && (
            <ListRow icon={BoxRemove} title="Mark as out of stock" subtitle="Sets every unit's stock to 0" onPress={() => setAction("out_of_stock")} />
          )}
          <ListRow icon={Trash} title="Delete listing" tone="danger" onPress={() => setAction("delete")} />
        </ListGroup>
      </ScrollView>

      <QuickUpdateSheet listingId={listingId} units={listing.units} visible={quick} onClose={() => setQuick(false)} />
      <ConfirmActionSheet
        action={action}
        listingIds={[listingId]}
        onClose={() => setAction(null)}
        onDone={(done) => {
          if (done === "delete") router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  top: { gap: spacing.xs },
  changes: { gap: spacing.sm },
  units: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime },
  unitRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  divider: { borderTopWidth: borders.hairline, borderTopColor: colors.line },
  flex: { flex: 1 },
});
