import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
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
  width?: number;
  onPress: () => void;
  onAdd?: () => void;
};

/** Product card from the Home / Categories frames. */
export function ProductCard({ name, priceKobo, unit, imageUrl, width = 127, onPress, onAdd }: Props) {
  const price = formatNaira(priceKobo);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price} per ${unit}`}
      onPress={onPress}
      style={[styles.card, { width }]}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.copy}>
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="price">{price}</Text>
          <Text variant="small">per {unit}</Text>
        </View>
        {onAdd !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${name} to cart`}
            hitSlop={8}
            onPress={onAdd}
            style={styles.add}
          >
            <Plus size={18} color={colors.forest} strokeWidth={2.5} />
          </Pressable>
        )}
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
    padding: 7,
    gap: spacing.md,
  },
  imageWrap: { borderRadius: radii.sm, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 1, borderRadius: radii.sm },
  imagePlaceholder: { backgroundColor: colors.placeholder },
  footer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs, paddingHorizontal: 3 },
  copy: { flex: 1 },
  add: {
    width: sizes.addButton,
    height: sizes.addButton,
    borderRadius: sizes.addButton / 2,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
