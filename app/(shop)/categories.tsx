// M-11 Categories tab, from the "Categories" design: the category tiles in a
// row (the chosen one filled lime) and that category's products underneath,
// three to a row. Opening a category from Home still goes to M-12.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sprout } from "@/components/icons";
import { CategoryTile, EmptyState, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { useShopContext } from "@/features/shop/useShopContext";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const PAGE = 24;

export default function Categories() {
  const { today } = useShopContext();
  const categories = useQuery(api.catalog.listCategoriesWithCounts);
  const [chosen, setChosen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const current = categories?.find((c) => c.slug === chosen) ?? categories?.[0];
  const data = useQuery(api.storefront.categoryListings, current ? { slug: current.slug, today, limit } : "skip");
  // Keep the last page on screen while the next one loads
  const [last, setLast] = useState<typeof data>(undefined);
  if (data !== undefined && data !== last) setLast(data);
  const shown = data !== undefined ? data : last?.category.slug === current?.slug ? last : undefined;

  const header = (
    <View style={styles.head}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tilesRow} contentContainerStyle={styles.tiles}>
        {categories === undefined
          ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} width={sizes.categoryTile} height={sizes.categoryTile} radius={radii.lg} />)
          : categories.map((c) => (
              <CategoryTile
                key={c._id}
                name={c.name}
                illustration={c.illustration}
                selected={c.slug === current?.slug}
                onPress={() => {
                  setChosen(c.slug);
                  setLimit(PAGE);
                }}
              />
            ))}
      </ScrollView>
      {current !== undefined && (
        <View style={styles.titleRow}>
          <Text variant="heading" accessibilityRole="header" style={styles.title}>
            {current.name}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Filter and sort ${current.name}`}
            hitSlop={10}
            onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: current.slug, name: current.name } })}
          >
            <Text variant="label" color={colors.limeInk}>
              {shown ? `${shown.total} ${shown.total === 1 ? "item" : "items"} · Filter` : "Filter"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader title="Categories" onBack={() => router.navigate("/home")} />
      <ProductGrid
        columns={3}
        items={categories?.length === 0 ? [] : shown?.items}
        header={header}
        onEndReached={() => shown?.hasMore && setLimit((l) => l + PAGE)}
        empty={
          <View style={styles.empty}>
            <EmptyState
              icon={Sprout}
              title="Nothing here yet"
              message="Farms near you haven't listed anything in this category yet. Try another one."
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  head: { gap: spacing.lg, paddingBottom: spacing.sm },
  tilesRow: { marginHorizontal: -spacing.screen },
  tiles: { gap: spacing.xxs, paddingHorizontal: spacing.screen - 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  title: { fontFamily: fonts.semibold, flexShrink: 1 },
  empty: { paddingTop: spacing.xxxl },
});
