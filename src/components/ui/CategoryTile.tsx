import { Image, type ImageSource } from "expo-image";
import { Sprout, type IconComponent } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PressableScale } from "./PressableScale";
import { Skeleton } from "./Skeleton";
import { Text } from "./Text";

// The label's line height (Text "small")
const LABEL_LINE = 15;

// Illustrations bundled with the app, keyed by the category's `illustration`
// field in Convex. Keys without art yet fall back to a placeholder.
const ART: Record<string, ImageSource> = {
  vegetables: require("../../../assets/categories/vegetables.png"),
  fruits: require("../../../assets/categories/fruits.png"),
  "grains-tubers": require("../../../assets/categories/grains-tubers.png"),
  "poultry-eggs": require("../../../assets/categories/poultry-eggs.png"),
  "meat-fish": require("../../../assets/categories/meat-fish.png"),
  "herbs-spices": require("../../../assets/categories/herbs-spices.png"),
  "legumes-nuts": require("../../../assets/categories/legumes-nuts.png"),
  dairy: require("../../../assets/categories/dairy.png"),
};

type Props = {
  name: string;
  illustration: string;
  selected?: boolean;
  onPress: () => void;
  /** An icon instead of an illustration (the "All" tile) */
  icon?: IconComponent;
};

/** Illustrated category tile (Home row, Categories, Search). */
export function CategoryTile({ name, illustration, selected = false, onPress, icon: Icon }: Props) {
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
        {Icon !== undefined ? (
          <Icon size={26} color={colors.forest} variant={selected ? "solid" : "line"} />
        ) : art !== undefined ? (
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

/**
 * CategoryTile's loading shape: the tinted tile and a label line, as tall as
 * a tile with a two-line label (a row's tallest), so the row doesn't move.
 */
export function CategoryTileSkeleton({ index = 0 }: { index?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.wrap, styles.loading]}>
      <Skeleton width={sizes.categoryTile} height={sizes.categoryTile} radius={radii.lg} style={styles.tileLoading} />
      <View style={styles.labelLoading}>
        <Skeleton width={index % 2 === 0 ? 46 : 36} height={9} radius={4} />
      </View>
    </View>
  );
}

/** How many tiles fill a row `rowWidth` wide that starts `inset` in, so loading rows run edge to edge. */
export function categoryTileSlots(rowWidth: number, inset: number, gap: number) {
  return Math.max(1, Math.ceil((rowWidth - inset) / (sizes.categoryTile + 8 + gap)));
}

const styles = StyleSheet.create({
  loading: { height: sizes.categoryTile + spacing.xs + 1 + 2 * LABEL_LINE },
  tileLoading: { backgroundColor: colors.tint },
  labelLoading: { height: LABEL_LINE, justifyContent: "center" },
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
  art: { width: 36, height: 36 },
  label: { alignSelf: "stretch", fontFamily: fonts.medium },
});
