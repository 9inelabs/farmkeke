// M-11 Categories tab, from the "Categories" design: the category tiles in a
// row (the chosen one filled lime) and that category's products underneath,
// three to a row. "All" comes first and shows every product, newest first;
// it's where Home's Fresh Picks "See all" lands (?c=all). Opening a category
// from Home still goes to M-12.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Grid, Sprout } from "@/components/icons";
import { CategoryTile, EmptyState, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { useShopContext } from "@/features/shop/useShopContext";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const PAGE = 24;
const ALL = "all";

export default function Categories() {
  const { today } = useShopContext();
  const params = useLocalSearchParams<{ c?: string; at?: string }>();
  const categories = useQuery(api.catalog.listCategoriesWithCounts);
  const [chosen, setChosen] = useState<string>(ALL);
  const [limit, setLimit] = useState(PAGE);
  // Fresh Picks' "See all" opens this tab on All, even if a category was chosen before
  useEffect(() => {
    if (params.c === ALL) {
      setChosen(ALL);
      setLimit(PAGE);
    }
  }, [params.c, params.at]);
  const all = chosen === ALL;
  const current = all ? undefined : (categories?.find((c) => c.slug === chosen) ?? categories?.[0]);
  const everything = useQuery(api.storefront.collection, all ? { kind: "fresh", today, limit } : "skip");
  const data = useQuery(api.storefront.categoryListings, current ? { slug: current.slug, today, limit } : "skip");
  // Keep the last page on screen while the next one loads
  const [last, setLast] = useState<typeof data>(undefined);
  if (data !== undefined && data !== last) setLast(data);
  const [lastAll, setLastAll] = useState<typeof everything>(undefined);
  if (everything !== undefined && everything !== lastAll) setLastAll(everything);
  const shown = all
    ? (everything ?? lastAll)
    : data !== undefined
      ? data
      : last?.category.slug === current?.slug
        ? last
        : undefined;

  const header = (
    <View style={styles.head}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tilesRow} contentContainerStyle={styles.tiles}>
        {categories === undefined
          ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} width={sizes.categoryTile} height={sizes.categoryTile} radius={radii.lg} />)
          : [
              <CategoryTile
                key={ALL}
                name="All"
                illustration=""
                icon={Grid}
                selected={all}
                onPress={() => {
                  setChosen(ALL);
                  setLimit(PAGE);
                }}
              />,
              ...categories.map((c) => (
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
            )),
            ]}
      </ScrollView>
      {all ? (
        <View style={styles.titleRow}>
          <Text variant="heading" accessibilityRole="header" style={styles.title}>
            All products
          </Text>
          {shown ? (
            <Text variant="label" color={colors.inkSoft}>
              {`${shown.total} ${shown.total === 1 ? "item" : "items"}`}
            </Text>
          ) : null}
        </View>
      ) : null}
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
              message={all ? "Farms haven't listed anything yet. Check back soon." : "Farms near you haven't listed anything in this category yet. Try another one."}
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
