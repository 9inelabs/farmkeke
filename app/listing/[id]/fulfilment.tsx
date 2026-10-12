// F-24 Add listing: fulfilment (and F-27 edit).
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Check, Store, Truck, type LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { ListingStep } from "@/features/listings/ListingStep";
import { useListing } from "@/features/listings/useListing";
import { errorMessage } from "@/lib/errors";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function ListingFulfilment() {
  const { listingId, listing, editing } = useListing();
  const save = useMutation(api.listings.saveFulfilment);
  const [delivery, setDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadedId = listing?._id;
  useEffect(() => {
    if (!listing) return;
    setDelivery(listing.delivery);
    setPickup(listing.pickup);
  }, [loadedId]); // load once

  const onSave = async () => {
    if (!delivery && !pickup) {
      setBanner("Choose delivery, pickup or both.");
      return false;
    }
    setBusy(true);
    setBanner(null);
    try {
      await save({ listingId, delivery, pickup });
      return true;
    } catch (e) {
      setBanner(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListingStep
      stepKey="fulfilment"
      listingId={listingId}
      editing={editing}
      intro="A Farmkeke rider collects every order from your farm. Choose where it can go from there."
      loading={listing === undefined}
      banner={banner}
      busy={busy}
      onSave={onSave}
    >
      <Option
        icon={Truck}
        title="Delivery to the buyer's door"
        body="For produce that travels well. The rider brings it straight to the buyer."
        selected={delivery}
        onPress={() => setDelivery((v) => !v)}
      />
      <Option
        icon={Store}
        title="Pickup at a Farmkeke pickup point"
        body="The rider drops it at a pickup point; the buyer collects it within 2 days."
        selected={pickup}
        onPress={() => setPickup((v) => !v)}
      />
    </ListingStep>
  );
}

function Option({ icon: Icon, title, body, selected, onPress }: { icon: LucideIcon; title: string; body: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.card, selected && styles.cardOn]}>
      <View style={styles.icon}>
        <Icon size={20} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="small">{body}</Text>
      </View>
      <View style={[styles.box, selected && styles.boxOn]}>{selected && <Check size={14} color={colors.white} strokeWidth={3} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
  },
  cardOn: { borderColor: colors.forest, borderWidth: 1.5, backgroundColor: colors.tint },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
});
