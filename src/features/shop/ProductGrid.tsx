// Two-column grid of product cards for categories, search, farm pages and
// saved items. Cards fill the screen's width; "+" opens the add-to-cart sheet.
import { router } from "expo-router";
import type { ReactElement } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ProductCard, Skeleton, Text } from "@/components/ui";
import { useShopUi } from "@/store/shopUi";
import { colors, radii, spacing } from "@/theme/tokens";
import { useScreenWidth } from "@/theme/useScreenSize";

export type GridItem = {
  id: string;
  name: string;
  priceKobo: number;
  unit: string;
  imageUrl: string | null;
  inStock?: boolean;
  freshness?: string | null;
};

const GAP = spacing.md;

export function useCardWidth() {
  const width = useScreenWidth();
  return Math.floor((width - spacing.screen * 2 - GAP) / 2);
}

type Props = {
  items: GridItem[] | undefined;
  header?: ReactElement | null;
  empty?: ReactElement | null;
  footer?: ReactElement | null;
  onEndReached?: () => void;
};

export function ProductGrid({ items, header, empty, footer, onEndReached }: Props) {
  const card = useCardWidth();
  const openAdd = useShopUi((s) => s.openAdd);

  return (
    <FlatList
      data={items ?? []}
      keyExtractor={(i) => i.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        items === undefined ? (
          <View style={[styles.row, styles.loading]}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={card} height={card + 64} radius={radii.lg} />
            ))}
          </View>
        ) : (
          empty ?? null
        )
      }
      renderItem={({ item }) => (
        <View style={{ width: card }}>
          <ProductCard
            name={item.name}
            priceKobo={item.priceKobo}
            unit={item.unit}
            imageUrl={item.imageUrl}
            width={card}
            onPress={() => router.push(`/product/${item.id}`)}
            onAdd={item.inStock === false ? undefined : () => openAdd(item.id)}
          />
          {item.inStock === false ? (
            <View style={styles.tag}>
              <Text variant="small" color={colors.ink}>
                Sold out
              </Text>
            </View>
          ) : item.freshness ? (
            <View style={styles.tag}>
              <Text variant="small" color={colors.forest} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {item.freshness}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: GAP },
  row: { gap: GAP },
  loading: { flexWrap: "wrap" },
  tag: {
    position: "absolute",
    top: spacing.md + 2,
    left: spacing.sm + 4,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: "88%",
  },
});
