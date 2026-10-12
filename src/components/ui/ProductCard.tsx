import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import AddIcon from "../../../assets/icons/add-button.svg";
import { formatNaira } from "@/lib/money";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
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
};

/** Product card from the Home / Categories designs. */
export function ProductCard({ name, priceKobo, unit, imageUrl, width = 127, onPress, onAdd }: Props) {
  const price = formatNaira(priceKobo);
  return (
    <PressableScale
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${name}, ${price} per ${unit}`}
      disabled={onPress === undefined}
      onPress={onPress}
      style={[styles.card, { width }]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.image} />
      )}
      <View>
        <Text variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {name}
        </Text>
        {/* Price and unit share the row with the add button, so they can't run under it. */}
        <View style={styles.buy}>
          <View style={styles.copy}>
            <Text variant="price" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.3} style={styles.price}>
              {price}
            </Text>
            {/* Long units ("tray of eggs") wrap instead of being cut off */}
            <Text variant="small" numberOfLines={2} maxFontSizeMultiplier={1.3}>
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
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AddIcon width={sizes.addButton} height={sizes.addButton} />
          </Pressable>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.cardFill,
    borderWidth: borders.hairline,
    borderColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  image: { width: "100%", aspectRatio: 1, borderRadius: radii.sm, backgroundColor: colors.placeholder },
  buy: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  copy: { flex: 1 },
  price: { fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.7 },
});
