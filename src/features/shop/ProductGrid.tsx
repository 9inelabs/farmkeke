// Grid of product cards for categories, search, farm pages and saved items:
// two columns, or three on the Categories tab. Cards fill the screen's width;
// "+" opens the add-to-cart sheet.
import { router } from "expo-router";
import type { ReactElement } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ProductCard, Skeleton } from "@/components/ui";
import { useShopUi } from "@/store/shopUi";
import { radii, spacing } from "@/theme/tokens";
import { useScreenWidth } from "@/theme/useScreenSize";

export type GridItem = {
  id: string;
  name: string;
  priceKobo: number;
  unit: string;
  imageUrl: string | null;
  inStock?: boolean;
  freshness?: string | null;
  delivery?: boolean;
  pickup?: boolean;
};

const GAP = spacing.md;
const GAP_3 = spacing.sm;

export function useCardWidth(columns: 2 | 3 = 2) {
  const width = useScreenWidth();
  const gap = columns === 3 ? GAP_3 : GAP;
  return Math.floor((width - spacing.screen * 2 - gap * (columns - 1)) / columns);
}

type Props = {
  items: GridItem[] | undefined;
  header?: ReactElement | null;
  empty?: ReactElement | null;
  footer?: ReactElement | null;
  onEndReached?: () => void;
  columns?: 2 | 3;
};

export function ProductGrid({ items, header, empty, footer, onEndReached, columns = 2 }: Props) {
  const card = useCardWidth(columns);
  const gap = columns === 3 ? GAP_3 : GAP;
  const openAdd = useShopUi((s) => s.openAdd);

  return (
    <FlatList
      data={items ?? []}
      keyExtractor={(i) => i.id}
      key={columns}
      numColumns={columns}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={[styles.content, { gap }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        items === undefined ? (
          <View style={[styles.loading, { gap }]}>
            {Array.from({ length: columns * 2 }, (_, i) => (
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
            compact={columns === 3}
            onPress={() => router.push(`/product/${item.id}`)}
            onAdd={item.inStock === false ? undefined : () => openAdd(item.id)}
            soldOut={item.inStock === false}
            freshness={item.freshness}
            delivery={item.delivery}
            pickup={item.pickup}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  loading: { flexDirection: "row", flexWrap: "wrap" },
});
