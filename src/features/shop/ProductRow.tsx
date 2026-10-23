// A titled sideways row of product cards ("More from this farm", "Similar items").
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ProductCard, Text } from "@/components/ui";
import { useShopUi } from "@/store/shopUi";
import { spacing } from "@/theme/tokens";
import type { GridItem } from "./ProductGrid";

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
            width={140}
            onPress={() => router.push(`/product/${p.id}`)}
            onAdd={p.inStock === false ? undefined : () => openAdd(p.id)}
          />
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
