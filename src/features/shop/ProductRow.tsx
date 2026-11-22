// A titled sideways row of product cards ("More from this farm", "Similar items").
import { ScrollView, StyleSheet, View } from "react-native";
import { ProductCard, Text } from "@/components/ui";
import { ProductCardSkeleton } from "@/components/ui/ProductCard";
import { useShopUi } from "@/store/shopUi";
import { spacing } from "@/theme/tokens";
import type { GridItem } from "./ProductGrid";
import { openProduct } from "./openProduct";

const CARD_WIDTH = 140;

export function ProductRow({ title, items }: { title: string; items: GridItem[] }) {
  const openAdd = useShopUi((s) => s.openAdd);
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="section" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            priceKobo={p.priceKobo}
            unit={p.unit}
            imageUrl={p.imageUrl}
            width={CARD_WIDTH}
            onPress={() => openProduct(p.id, p.imageUrl)}
            onAdd={p.inStock === false ? undefined : () => openAdd(p.id)}
            soldOut={p.inStock === false}
            freshness={p.freshness}
            delivery={p.delivery}
            pickup={p.pickup}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** ProductRow while its products load: the title and card-shaped placeholders at the same size. */
export function ProductRowSkeleton({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <Text variant="section" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2].map((i) => (
          <ProductCardSkeleton key={i} width={CARD_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { paddingHorizontal: spacing.screen },
  row: { paddingHorizontal: spacing.screen, gap: spacing.md },
});
