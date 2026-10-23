// The product page from the "Product detail" design: a big photo with the
// quantity stepper and photo count on it, then a rounded card with the name,
// price, units, the farm and the escrow promise. Used for the shopper's
// product page (M-17) and the farmer's listing preview (F-25), which leaves
// out the stepper, the heart and the farm link.
import { Image } from "expo-image";
import { Heart, Image as ImageIcon, Leaf, Shop, Star, Truck, Verified } from "@/components/icons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Avatar, EscrowCard, PressableScale, QuantityStepper, Text } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, shadow, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useScreenWidth } from "@/theme/useScreenSize";

type Unit = { unitId: string; priceKobo: number; stock: number; minOrder: number; singular: string; plural: string };

type Props = {
  name: string;
  photos: (string | null)[];
  units: Unit[];
  description?: string;
  harvestedOn?: string;
  delivery: boolean;
  pickup: boolean;
  farm: { name: string; lga: string; state: string; photoUrl: string | null; rating?: number | null; ratingCount?: number };
  selectedUnitId?: string;
  onSelectUnit?: (unitId: string) => void;
  // Shopper's page (M-17); the farmer's preview (F-25) leaves these out
  onPhotoPress?: (index: number) => void;
  onFarmPress?: () => void;
  /** e.g. "To Owerri North. Priced after the farm accepts" (instead of "Available") */
  deliveryNote?: string;
  pickupNote?: string;
  /** The stepper on the photo; left out on the farmer's preview. */
  quantity?: { value: number; min: number; max: number; onChange: (next: number) => void };
  saved?: { value: boolean; onToggle: () => void };
};

// The body card overlaps the photo by this much, so the photo reads as sitting behind it.
const OVERLAP = 24;

function harvestLabel(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000);
  const short = date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  if (diff <= 0) return `Picked today, ${short}`;
  if (diff === 1) return `Picked yesterday, ${short}`;
  return `Picked ${short}`;
}

export function ProductDetailView(props: Props) {
  const width = useScreenWidth();
  const [photoIndex, setPhotoIndex] = useState(0);
  const unit = props.units.find((u) => u.unitId === props.selectedUnitId) ?? props.units[0];
  const photos = props.photos.length > 0 ? props.photos : [null];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const photoHeight = Math.round(width * 1.02);

  return (
    <View>
      <View>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) =>
            item ? (
              <Pressable
                disabled={props.onPhotoPress === undefined}
                accessibilityRole={props.onPhotoPress ? "imagebutton" : undefined}
                accessibilityLabel={props.onPhotoPress ? `${props.name}, photo ${index + 1}. Open full screen` : props.name}
                onPress={() => props.onPhotoPress?.(index)}
              >
                <Image source={{ uri: item }} style={{ width, height: photoHeight }} contentFit="cover" transition={200} />
              </Pressable>
            ) : (
              <View style={[styles.placeholder, { width, height: photoHeight }]}>
                <Leaf size={44} color={colors.inkMuted} />
              </View>
            )
          }
        />
        <View style={[styles.photoBar, { bottom: OVERLAP + spacing.md }]} pointerEvents="box-none">
          {props.quantity ? (
            <View style={styles.stepper}>
              <QuantityStepper {...props.quantity} />
            </View>
          ) : (
            <View />
          )}
          <View style={styles.photoCount}>
            <ImageIcon size={16} color={colors.ink} />
            <Text variant="label" color={colors.ink}>
              {photoIndex + 1} of {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {props.harvestedOn ? (
          <View style={styles.harvest}>
            <Leaf size={12} color={colors.forest} />
            <Text variant="small" color={colors.forest}>
              {harvestLabel(props.harvestedOn)}
            </Text>
          </View>
        ) : null}
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="title" style={styles.name}>
              {props.name || "Untitled produce"}
            </Text>
            {unit ? (
              <View style={styles.priceRow}>
                <Text variant="priceLarge" style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
                  {formatNaira(unit.priceKobo)}
                </Text>
                <Text variant="bodyMedium" color={colors.limeInk} style={styles.per}>
                  per {unit.singular}
                </Text>
              </View>
            ) : null}
          </View>
          {props.saved ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={props.saved.value ? "Remove from saved items" : "Save for later"}
              accessibilityState={{ selected: props.saved.value }}
              onPress={props.saved.onToggle}
              pressedScale={0.88}
              style={styles.heart}
            >
              <Heart size={24} color={props.saved.value ? colors.danger : colors.ink} variant={props.saved.value ? "solid" : "line"} />
            </PressableScale>
          ) : null}
        </View>
        {unit ? (
          <Text variant="small">
            {unit.stock > 0 ? `${unit.stock} ${unit.stock === 1 ? unit.singular : unit.plural} left` : "Sold out"}
            {unit.minOrder > 1 ? ` · minimum ${unit.minOrder} ${unit.plural}` : ""}
          </Text>
        ) : null}

        {props.units.length > 1 && (
          <View style={styles.units}>
            <Text variant="small" color={colors.inkSoft}>
              Other units
            </Text>
            <View style={styles.chips}>
              {props.units.map((u) => {
                const selected = u.unitId === unit?.unitId;
                return (
                  <Pressable
                    key={u.unitId}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${u.singular}, ${formatNaira(u.priceKobo)}`}
                    disabled={props.onSelectUnit === undefined}
                    onPress={() => props.onSelectUnit?.(u.unitId)}
                    style={[styles.unit, selected && styles.unitOn]}
                  >
                    <Text variant="label" color={selected ? colors.limeInk : colors.inkSoft} style={styles.unitText}>
                      {u.singular}
                      {selected ? <Text variant="label" style={styles.unitPrice}>{` • ${formatNaira(u.priceKobo)}`}</Text> : null}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.farm}>
          <View>
            {props.farm.photoUrl ? (
              <Image source={{ uri: props.farm.photoUrl }} style={styles.farmPhoto} contentFit="cover" />
            ) : (
              <Avatar name={props.farm.name} size={FARM_PHOTO} />
            )}
            <View style={styles.verified}>
              <Verified size={18} color={colors.success} variant="solid" />
            </View>
          </View>
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={1}>
              {props.farm.name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {props.farm.lga}, {props.farm.state}
            </Text>
            {props.farm.rating != null ? (
              <View style={styles.rating}>
                <Star size={12} color={colors.pending} fill={colors.pending} />
                <Text variant="small" color={colors.ink}>
                  {props.farm.rating.toFixed(1)} ({props.farm.ratingCount ?? 0} reviews)
                </Text>
              </View>
            ) : null}
          </View>
          {props.onFarmPress ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={`View ${props.farm.name}`} onPress={props.onFarmPress} style={styles.viewFarm}>
              <Text variant="label" color={colors.forest} style={styles.viewFarmText}>
                View Farmer
              </Text>
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.fulfilment}>
          <FulfilmentRow icon={Truck} label="Home delivery" available={props.delivery} note={props.deliveryNote} />
          <FulfilmentRow icon={Shop} label="Pickup at the farm" available={props.pickup} note={props.pickupNote} />
        </View>

        {props.description ? (
          <View style={styles.about}>
            <Text variant="heading">About this produce</Text>
            <Text variant="body" color={colors.inkSoft}>
              {props.description}
            </Text>
          </View>
        ) : null}

        <EscrowCard />
      </View>
    </View>
  );
}

function FulfilmentRow({ icon: Icon, label, available, note }: { icon: typeof Truck; label: string; available: boolean; note?: string }) {
  return (
    <View style={styles.fulfilmentRow}>
      <Icon size={18} color={available ? colors.forest : colors.inkMuted} />
      <View style={styles.flex}>
        <Text variant="label" color={available ? colors.ink : colors.inkMuted}>
          {label}
        </Text>
        {available && note ? <Text variant="small">{note}</Text> : null}
      </View>
      <Text variant="small" color={available ? colors.success : colors.inkMuted}>
        {available ? "Available" : "Not offered"}
      </Text>
    </View>
  );
}

const FARM_PHOTO = 56;

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.placeholder, alignItems: "center", justifyContent: "center" },
  photoBar: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: { borderRadius: radii.pill, ...shadow.raised },
  photoCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  body: {
    marginTop: -OVERLAP,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.white,
  },
  harvest: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: -spacing.sm,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { fontSize: 22, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: 2 },
  price: { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 44, letterSpacing: -0.5, flexShrink: 1 },
  per: { flexShrink: 0 },
  heart: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  units: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  unit: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.surfaceSoft,
  },
  unitOn: { backgroundColor: colors.tint, borderColor: colors.lime },
  unitText: { fontFamily: fonts.medium },
  unitPrice: { fontFamily: fonts.bold, color: colors.ink },
  farm: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg + 4,
    padding: spacing.md,
    ...shadow.raised,
  },
  farmPhoto: { width: FARM_PHOTO, height: FARM_PHOTO, borderRadius: FARM_PHOTO / 2, backgroundColor: colors.placeholder },
  verified: { position: "absolute", right: -3, bottom: -3, backgroundColor: colors.white, borderRadius: 11, padding: 2 },
  viewFarm: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  viewFarmText: { fontFamily: fonts.semibold },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  flex: { flex: 1 },
  fulfilment: { backgroundColor: colors.white, borderRadius: radii.lg + 4, borderWidth: borders.hairline, borderColor: colors.line },
  fulfilmentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  about: { gap: spacing.xs },
});
