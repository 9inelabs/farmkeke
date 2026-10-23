// M-19 Add to cart: choose the unit and quantity, then add. Opened from any
// product card's "+" or the product page (useShopUi.openAdd). Reads the
// listing fresh, so the price and stock are current.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Leaf } from "@/components/icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet, Button, Chip, Notice, QuantityStepper, Skeleton, Text } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { useCart } from "@/store/cart";
import { useShopUi } from "@/store/shopUi";
import { colors, radii, spacing } from "@/theme/tokens";

export function AddToCartSheet() {
  const listingId = useShopUi((s) => s.addingId);
  const close = useShopUi((s) => s.closeAdd);
  return (
    <BottomSheet visible={listingId !== null} onClose={close}>
      {listingId !== null ? <SheetBody key={listingId} listingId={listingId} onClose={close} /> : null}
    </BottomSheet>
  );
}

function SheetBody({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const listing = useQuery(api.checkout.listingForCart, { listingId });
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines);
  const showAdded = useShopUi((s) => s.showAdded);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | null>(null);

  if (listing === undefined) {
    return (
      <View style={styles.body}>
        <Skeleton height={64} radius={radii.md} />
        <Skeleton height={36} width={180} radius={radii.pill} />
        <Skeleton height={48} radius={radii.control} />
      </View>
    );
  }

  const buyable = listing?.available ? listing.units.filter((u) => u.stock >= Math.max(1, u.minOrder)) : [];
  if (listing === null || buyable.length === 0) {
    return (
      <View style={styles.body}>
        <Text variant="section">{listing === null ? "This product isn't available" : `${listing.name} is sold out`}</Text>
        <Text variant="body" color={colors.inkSoft}>
          The farm has none to sell right now. Have a look at similar produce instead.
        </Text>
        <Button
          label="See the product"
          variant="secondary"
          onPress={() => {
            onClose();
            router.push(`/product/${listingId}`);
          }}
        />
      </View>
    );
  }

  const unit = buyable.find((u) => u.unitId === unitId) ?? buyable[0]!;
  const min = Math.max(1, unit.minOrder);
  const already = inCart.find((l) => l.listingId === listing.id && l.unitId === unit.unitId)?.quantity ?? 0;
  const room = Math.max(0, unit.stock - already);
  const quantity = Math.min(Math.max(qty ?? min, min), Math.max(room, min));

  const confirm = () => {
    add({
      listingId: listing.id,
      unitId: unit.unitId,
      quantity,
      priceKobo: unit.priceKobo,
      name: listing.name,
      unitSingular: unit.singular,
      unitPlural: unit.plural,
      farmId: listing.farmId,
      farmName: listing.farmName,
      imageUrl: listing.imageUrl,
      minOrder: unit.minOrder,
      stock: unit.stock,
    });
    onClose();
    showAdded(listing.name);
  };

  return (
    <View style={styles.body}>
      <View style={styles.head}>
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Leaf size={22} color={colors.inkMuted} />
          </View>
        )}
        <View style={styles.headCopy}>
          <Text variant="heading" numberOfLines={2}>
            {listing.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {listing.farmName}
          </Text>
          <Text variant="price">
            {formatNaira(unit.priceKobo)} <Text variant="small">per {unit.singular}</Text>
          </Text>
        </View>
      </View>

      {buyable.length > 1 ? (
        <View style={styles.units} accessibilityRole="radiogroup" accessibilityLabel="Size">
          {buyable.map((u) => (
            <Chip
              key={u.unitId}
              label={`${u.singular[0]!.toUpperCase()}${u.singular.slice(1)} · ${formatNaira(u.priceKobo)}`}
              selected={u.unitId === unit.unitId}
              onPress={() => {
                setUnitId(u.unitId);
                setQty(null);
              }}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.qtyRow}>
        <View>
          <Text variant="label">How many {unit.plural}?</Text>
          <Text variant="small">
            {min > 1 ? `At least ${min}. ` : ""}
            {room} left{already > 0 ? ` (${already} in your cart)` : ""}
          </Text>
        </View>
        <QuantityStepper value={quantity} min={min} max={Math.max(room, min)} onChange={setQty} />
      </View>

      {room < min ? (
        <Notice tone="pending">You already have all the {unit.plural} the farm has in your cart.</Notice>
      ) : (
        <Button label={`Add to cart · ${formatNaira(unit.priceKobo * quantity)}`} size="large" onPress={confirm} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.md },
  head: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  photo: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.placeholder },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  headCopy: { flex: 1, gap: 2 },
  units: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
});
