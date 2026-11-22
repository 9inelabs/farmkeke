import { Image } from "expo-image";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Leaf, Pin, Plus, Truck, type IconComponent } from "@/components/icons";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PressableScale } from "./PressableScale";
import { Skeleton } from "./Skeleton";
import { Text } from "./Text";

type Props = {
  name: string;
  priceKobo: number;
  /** e.g. "basket" → shown as "per basket" */
  unit: string;
  imageUrl?: string | null;
  /** Rows pass a width that suits the screen; the photo and text follow it. */
  width?: number;
  // Without a handler the card (or its add button) is drawn but doesn't respond.
  onPress?: () => void;
  onAdd?: () => void;
  /** Three-across grids: tighter padding and type so the price isn't cut off. */
  compact?: boolean;
  // The tag on the photo, like the reference's "Free Delivery": the first that applies of
  // sold out, harvested today or yesterday, home delivery, pickup only.
  soldOut?: boolean;
  freshness?: string | null;
  delivery?: boolean;
  pickup?: boolean;
};

type Tag = { label: string; icon?: IconComponent; tone: "green" | "lime" | "grey" };

function tagOf(p: Pick<Props, "soldOut" | "freshness" | "delivery" | "pickup" | "compact">): Tag | null {
  if (p.soldOut) return { label: "Sold out", tone: "grey" };
  if (p.freshness === "Harvested today" || p.freshness === "Harvested yesterday") return { label: p.compact ? "Fresh" : p.freshness, icon: Leaf, tone: "lime" };
  if (p.delivery) return { label: p.compact ? "Delivery" : "Home delivery", icon: Truck, tone: "green" };
  if (p.pickup) return { label: "Pickup only", icon: Pin, tone: "green" };
  return null;
}

/**
 * Product card (redesign, Nov 2026, after the owner's grocery reference): a
 * white card with a crisp outline, the photo on a soft panel, then the price,
 * the name and the unit, with a round green add button in the corner, and a
 * small tag on the photo (see tagOf).
 */
export function ProductCard({ name, priceKobo, unit, imageUrl, width = 127, onPress, onAdd, compact = false, soldOut, freshness, delivery, pickup }: Props) {
  const price = formatNaira(priceKobo);
  const tag = tagOf({ soldOut, freshness, delivery, pickup, compact });
  const add = compact ? 26 : 30;
  return (
    <PressableScale
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${name}, ${price} per ${unit}`}
      disabled={onPress === undefined}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact, { width }]}
    >
      <View style={styles.photo}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={[styles.image, soldOut && styles.imageSoldOut]} contentFit="cover" transition={150} /> : null}
        {tag ? (
          <View style={[styles.tag, compact && styles.tagCompact, tag.tone === "lime" && styles.tagLime, tag.tone === "grey" && styles.tagGrey]}>
            {tag.icon ? <tag.icon size={compact ? 10 : 11} color={tag.tone === "lime" ? colors.forestDeep : colors.white} variant="solid" /> : null}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.tagText, compact && styles.tagTextCompact, tag.tone === "lime" && styles.tagTextLime]}>
              {tag.label}
            </Text>
          </View>
        ) : null}
      </View>
      {/* Price, name and unit share the row with the add button, so they can't run under it. */}
      <View style={styles.buy}>
        <View style={styles.copy}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.3} style={[styles.price, compact && styles.priceCompact]}>
            {price}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.name, compact && styles.nameCompact]}>
            {name}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.unit}>
            per {unit}
          </Text>
        </View>
        <Pressable
          accessibilityRole={onAdd ? "button" : undefined}
          accessibilityLabel={`Add ${name} to cart`}
          accessible={onAdd !== undefined}
          disabled={onAdd === undefined}
          hitSlop={8}
          onPress={onAdd}
          style={({ pressed }) => [styles.add, { width: add, height: add, borderRadius: add / 2 }, pressed && styles.pressed]}
        >
          <Plus size={compact ? 15 : 17} color={colors.white} strokeWidth={2.4} />
        </Pressable>
      </View>
    </PressableScale>
  );
}

/**
 * ProductCard's loading shape: the same white outlined card, photo panel,
 * price, name and unit lines and round add button, at the same size, so a
 * row or grid doesn't move when the products arrive.
 */
export function ProductCardSkeleton({ width = 127, compact = false }: { width?: number; compact?: boolean }) {
  // The card's text grows with the phone's font size up to 1.3x, so its lines do here too.
  const scale = Math.min(Math.max(useWindowDimensions().fontScale, 1), 1.3);
  const add = compact ? 26 : 30;
  const line = (lineHeight: number, barWidth: `${number}%`, bar: number) => (
    <View style={[styles.skeletonLine, { height: lineHeight * scale }]}>
      <Skeleton width={barWidth} height={Math.round(bar * scale)} radius={4} />
    </View>
  );
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.card, compact && styles.cardCompact, { width }]}>
      <Skeleton height="auto" radius={radii.md} style={styles.skeletonPhoto} />
      <View style={styles.buy}>
        <View style={styles.copy}>
          {line(compact ? 17 : 19, "62%", 11)}
          {line(16, "86%", 9)}
          {line(14, "44%", 8)}
        </View>
        <Skeleton width={add} height={add} radius={add / 2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: "#ECEFE7",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardCompact: { padding: 6, gap: 6 },
  photo: { width: "100%", aspectRatio: 1.1, borderRadius: radii.md, backgroundColor: colors.tint, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageSoldOut: { opacity: 0.5 },
  tag: {
    position: "absolute",
    top: 6,
    left: 6,
    maxWidth: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  tagCompact: { top: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2 },
  tagLime: { backgroundColor: colors.lime },
  tagGrey: { backgroundColor: "rgba(26, 26, 26, 0.72)" },
  tagText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, color: colors.white },
  tagTextCompact: { fontSize: 9, lineHeight: 11 },
  tagTextLime: { color: colors.forestDeep },
  buy: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs, paddingHorizontal: 2 },
  copy: { flex: 1, minWidth: 0 },
  price: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 19, color: colors.ink, letterSpacing: -0.2 },
  priceCompact: { fontSize: 13.5, lineHeight: 17 },
  name: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  nameCompact: { fontSize: 12 },
  unit: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  add: { backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
  skeletonPhoto: { width: "100%", aspectRatio: 1.1 },
  skeletonLine: { justifyContent: "center" },
});
