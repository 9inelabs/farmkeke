import { Image, type ImageSource } from "expo-image";
import { Sprout } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

// Illustrations bundled with the app, keyed by the category's `illustration`
// field in Convex. Keys without art yet fall back to a placeholder.
const ART: Record<string, ImageSource> = {
  vegetables: require("../../../assets/categories/vegetables.png"),
  fruits: require("../../../assets/categories/fruits.png"),
  "grains-tubers": require("../../../assets/categories/grains-tubers.png"),
  "poultry-eggs": require("../../../assets/categories/poultry-eggs.png"),
  "meat-fish": require("../../../assets/categories/meat-fish.png"),
  dairy: require("../../../assets/categories/dairy.png"),
};

type Props = {
  name: string;
  illustration: string;
  selected?: boolean;
  onPress: () => void;
};

/** Illustrated category tile (Home row, Categories, Search). */
export function CategoryTile({ name, illustration, selected = false, onPress }: Props) {
  const art = ART[illustration];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.wrap}
    >
      <View style={[styles.tile, selected && styles.tileSelected]}>
        {art !== undefined ? (
          <Image source={art} style={styles.art} contentFit="contain" />
        ) : (
          <Sprout size={28} color={colors.forest} strokeWidth={1.75} />
        )}
      </View>
      <Text variant="small" color={colors.ink} align="center" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.label}>
        {name}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { width: sizes.categoryTile + 8, alignItems: "center", gap: spacing.xs + 1 },
  tile: {
    width: sizes.categoryTile,
    height: sizes.categoryTile,
    borderRadius: radii.lg,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  tileSelected: { backgroundColor: colors.lime },
  art: { width: 40, height: 40 },
  label: { alignSelf: "stretch", fontFamily: fonts.medium },
});
