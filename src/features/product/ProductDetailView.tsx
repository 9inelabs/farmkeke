// The product page from the Figma "Product detail" frame. Used for the
// farmer's listing preview (F-25) now, and the shopper's product page (M-17)
// in Phase 5.
import { Image } from "expo-image";
import { BadgeCheck, ChevronRight, ImageIcon, Leaf, Star, Store, Truck } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Avatar, Chip, EscrowCard, Text } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";
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
};

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
                <Image source={{ uri: item }} style={{ width, height: width * 0.85 }} contentFit="cover" />
              </Pressable>
            ) : (
              <View style={[styles.placeholder, { width, height: width * 0.85 }]}>
                <Leaf size={40} color={colors.inkMuted} />
              </View>
            )
          }
        />
        <View style={styles.photoCount}>
          <ImageIcon size={14} color={colors.ink} />
          <Text variant="small" color={colors.ink}>
            {photoIndex + 1} of {photos.length} photos
          </Text>
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
        <Text variant="title">{props.name || "Untitled produce"}</Text>
        {unit ? (
          <View style={styles.priceRow}>
            <Text variant="priceLarge">{formatNaira(unit.priceKobo)}</Text>
            <Text variant="body" color={colors.lime}>
              per {unit.singular}
            </Text>
          </View>
        ) : null}
        {unit ? (
          <Text variant="small">
            {unit.stock > 0 ? `${unit.stock} ${unit.stock === 1 ? unit.singular : unit.plural} left` : "Sold out"}
            {unit.minOrder > 1 ? ` · minimum ${unit.minOrder} ${unit.plural}` : ""}
          </Text>
        ) : null}

        {props.units.length > 1 && (
          <View style={styles.units}>
            <Text variant="small">Other units</Text>
            <View style={styles.chips}>
              {props.units.map((u) => (
                <Chip
                  key={u.unitId}
                  label={`${u.singular} · ${formatNaira(u.priceKobo)}`}
                  selected={u.unitId === unit?.unitId}
                  onPress={props.onSelectUnit ? () => props.onSelectUnit?.(u.unitId) : undefined}
                />
              ))}
            </View>
          </View>
        )}

        <Pressable
          disabled={props.onFarmPress === undefined}
          accessibilityRole={props.onFarmPress ? "button" : undefined}
          accessibilityLabel={props.onFarmPress ? `${props.farm.name}. See the farm` : undefined}
          onPress={props.onFarmPress}
          style={styles.farm}
        >
          {props.farm.photoUrl ? (
            <Image source={{ uri: props.farm.photoUrl }} style={styles.farmPhoto} contentFit="cover" />
          ) : (
            <Avatar name={props.farm.name} size={48} />
          )}
          <View style={styles.flex}>
            <View style={styles.farmName}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {props.farm.name}
              </Text>
              <BadgeCheck size={16} color={colors.success} />
            </View>
            <Text variant="small">
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
          {props.onFarmPress ? <ChevronRight size={20} color={colors.inkMuted} /> : null}
        </Pressable>

        <View style={styles.fulfilment}>
          <FulfilmentRow icon={Truck} label="Home delivery" available={props.delivery} note={props.deliveryNote} />
          <FulfilmentRow icon={Store} label="Pickup at the farm" available={props.pickup} note={props.pickupNote} />
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

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.placeholder, alignItems: "center", justifyContent: "center" },
  photoCount: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  body: { padding: spacing.screen, gap: spacing.md, backgroundColor: colors.surfaceMuted },
  harvest: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  units: { gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  farm: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.control,
    padding: spacing.md,
  },
  farmPhoto: { width: 48, height: 48, borderRadius: 24 },
  farmName: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  flex: { flex: 1 },
  fulfilment: { backgroundColor: colors.white, borderRadius: radii.control, borderWidth: borders.hairline, borderColor: colors.line },
  fulfilmentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  about: { gap: spacing.xs },
});
