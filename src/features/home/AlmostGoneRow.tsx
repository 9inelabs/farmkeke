// Home's "Almost Gone" row: products with 3 or fewer left, drawn unlike the
// other rows so it reads as urgent. A warm panel with a timer badge, and
// wide cards that say how many are left with a draining bar.
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import AddIcon from "../../../assets/icons/add-button.svg";
import { Timer } from "@/components/icons";
import { Text } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { ripple } from "@/theme/platform";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export type AlmostGoneProduct = { id: string; name: string; priceKobo: number; unit: string; imageUrl: string | null; left: number };

// Urgency colours: a warm panel, red for what's running out
const PANEL = "#FFF2EB";
const PANEL_LINE = "#FBD9C9";
const URGENT = "#D23A1F";
const MAX_LEFT = 3;
const CARD_WIDTH = 236;

export function AlmostGoneRow({
  products,
  onProduct,
  onAdd,
}: {
  products: AlmostGoneProduct[];
  onProduct?: (p: AlmostGoneProduct) => void;
  onAdd?: (p: AlmostGoneProduct) => void;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Timer size={15} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text variant="section" accessibilityRole="header">
            Almost Gone
          </Text>
          <Text variant="small" color={URGENT} style={styles.medium}>
            Selling out fast. Grab them before they're gone
          </Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {products.map((p) => {
          const price = formatNaira(p.priceKobo);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${price} per ${p.unit}. Only ${p.left} left`}
              disabled={onProduct === undefined}
              onPress={() => onProduct?.(p)}
              android_ripple={ripple}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              {p.imageUrl ? (
                <Image source={{ uri: p.imageUrl }} style={styles.photo} contentFit="cover" transition={150} />
              ) : (
                <View style={styles.photo} />
              )}
              <View style={styles.copy}>
                <Text variant="label" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  <Text variant="small" color={colors.forest} style={styles.price}>
                    {price}
                  </Text>{" "}
                  / {p.unit}
                </Text>
                <View style={styles.leftRow}>
                  <View style={styles.dot} />
                  <Text variant="small" color={URGENT} style={styles.leftText}>
                    {p.left === 1 ? "Last one!" : `Only ${p.left} left`}
                  </Text>
                </View>
                {/* Drains as stock runs out */}
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(12, (Math.min(p.left, MAX_LEFT) / MAX_LEFT) * 100)}%` }]} />
                </View>
              </View>
              <Pressable
                accessibilityRole={onAdd ? "button" : undefined}
                accessibilityLabel={`Add ${p.name} to cart`}
                disabled={onAdd === undefined}
                hitSlop={8}
                onPress={() => onAdd?.(p)}
                style={styles.add}
              >
                <AddIcon width={sizes.addButton} height={sizes.addButton} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 1 },
  medium: { fontFamily: fonts.medium },
  panel: { backgroundColor: PANEL, borderRadius: radii.lg + 4, borderWidth: 1, borderColor: PANEL_LINE, paddingVertical: spacing.md + 2, gap: spacing.md, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, paddingHorizontal: spacing.md + 2 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: URGENT, alignItems: "center", justifyContent: "center" },
  cards: { gap: spacing.sm + 2, paddingHorizontal: spacing.md + 2 },
  card: {
    width: CARD_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    overflow: "hidden",
  },
  pressed: { opacity: 0.85 },
  photo: { width: 62, height: 62, borderRadius: radii.md, backgroundColor: colors.placeholder },
  copy: { flex: 1, gap: 3 },
  price: { fontFamily: fonts.bold },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: URGENT },
  leftText: { fontFamily: fonts.semibold },
  track: { height: 4, borderRadius: 2, backgroundColor: "#F6DDD3", overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: URGENT },
  add: { alignSelf: "flex-end" },
});
