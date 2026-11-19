import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { Plus } from "@/components/icons";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PressableScale } from "./PressableScale";
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
};

/**
 * Product card (redesign, Nov 2026, after the owner's grocery reference): a
 * white card with a crisp outline, the photo on a soft panel, then the price,
 * the name and the unit, with a round green add button in the corner.
 */
export function ProductCard({ name, priceKobo, unit, imageUrl, width = 127, onPress, onAdd, compact = false }: Props) {
  const price = formatNaira(priceKobo);
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
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={150} /> : null}
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
  buy: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs, paddingHorizontal: 2 },
  copy: { flex: 1, minWidth: 0 },
  price: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 19, color: colors.ink, letterSpacing: -0.2 },
  priceCompact: { fontSize: 13.5, lineHeight: 17 },
  name: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  nameCompact: { fontSize: 12 },
  unit: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  add: { backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
});
