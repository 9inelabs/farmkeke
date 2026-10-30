// M-13 Search: recent searches, categories and popular produce before typing.
// M-14 Results: matching farms and products, with filter and sort (M-16).
// M-15 No results: say so, suggest categories, and offer to clear.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Clock, SearchOff, Verified } from "@/components/icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, CategoryTile, EmptyState, ScreenHeader, SearchPill, Skeleton, Text } from "@/components/ui";
import { activeCount, areaKey, FilterSheet, filterArgs, type FarmArea, type Filters } from "@/features/shop/FilterSheet";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { ProductRow } from "@/features/shop/ProductRow";
import { ResultsBar } from "@/features/shop/ResultsBar";
import { useShopContext } from "@/features/shop/useShopContext";
import { useSearches } from "@/store/searches";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const PAGE = 24;

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { today } = useShopContext();
  const [text, setText] = useState(params.q ?? "");
  const [query, setQuery] = useState(params.q ?? "");
  const [filters, setFilters] = useState<Filters>({});
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const recent = useSearches((s) => s.recent);
  const remember = useSearches((s) => s.remember);
  const clearRecent = useSearches((s) => s.clear);

  // Search as you type, a moment after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(text.trim());
      setLimit(PAGE);
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  const searching = query.length > 0;
  const results = useQuery(api.storefront.search, searching ? { text: query, today, limit, ...filterArgs(filters) } : "skip");
  const [last, setLast] = useState<typeof results>(undefined);
  if (results !== undefined && results !== last) setLast(results);
  const shown = searching ? (results ?? last) : undefined;

  // Farm locations to filter by: where the farms in these results are, kept
  // while the search stays the same so a chosen location's siblings stay offered
  const [areas, setAreas] = useState<{ query: string; list: FarmArea[] }>({ query: "", list: [] });
  if (shown !== undefined) {
    const known = areas.query === query ? areas.list : [];
    const fresh = shown.farms.map((f) => ({ lga: f.lga, state: f.state })).filter((a) => a.lga && !known.some((k) => areaKey(k) === areaKey(a)));
    if (areas.query !== query || fresh.length > 0) setAreas({ query, list: [...known, ...fresh] });
  }

  const popular = useQuery(api.storefront.popular, searching ? "skip" : { today, limit: 10 });
  const categories = useQuery(api.catalog.listCategories);

  const run = (t: string) => {
    setText(t);
    setQuery(t.trim());
    remember(t);
  };

  const header = (
    <View>
      <ScreenHeader title="Search" />
      <View style={styles.searchBar}>
        <SearchPill
          mode="input"
          value={text}
          onChangeText={setText}
          onSubmit={() => run(text)}
          onClear={() => (setText(""), setQuery(""))}
          autoFocus={!params.q}
        />
      </View>
    </View>
  );

  // M-13: before typing
  if (!searching) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        {header}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.start}>
          {recent.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text variant="overline">Recent searches</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" hitSlop={8} onPress={clearRecent}>
                  <Text variant="bodyMedium" color={colors.limeInk}>
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View style={styles.recentCard}>
                {recent.map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${r} again`}
                    onPress={() => run(r)}
                    style={({ pressed }) => [styles.recent, pressed && styles.recentPressed]}
                  >
                    <Clock size={20} color={colors.inkSoft} />
                    <Text variant="body" color={colors.inkSoft} style={styles.flex} numberOfLines={1}>
                      {r}
                    </Text>
                    <ChevronRight size={18} color={colors.inkSoft} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.block}>
            <Text variant="bodyMedium" color={colors.inkMuted}>
              Browse Categories
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tileRow} contentContainerStyle={styles.tileScroll}>
              {categories?.map((c) => (
                <CategoryTile
                  key={c._id}
                  name={c.name}
                  illustration={c.illustration}
                  onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug, name: c.name } })}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.popular}>
            {popular === undefined ? (
              <Skeleton height={200} radius={radii.lg} />
            ) : (
              <ProductRow title="Popular right now" items={popular} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const n = activeCount(filters);
  const resultsHeader = (
    <View style={styles.resultsHead}>
      {shown ? (
        <ResultsBar
          summary={`${shown.total} ${shown.total === 1 ? "product" : "products"} for “${query}”`}
          active={n}
          onFilter={() => setShowFilters(true)}
        />
      ) : (
        <Skeleton height={20} width={200} />
      )}
      {shown && shown.farms.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmRow} contentContainerStyle={styles.farms}>
          {shown.farms.map((f) => (
            <Pressable key={f.id} accessibilityRole="button" onPress={() => router.push(`/farm/${f.id}`)} style={styles.farm}>
              {f.photoUrl ? <Image source={{ uri: f.photoUrl }} style={styles.farmPhoto} /> : <Avatar name={f.name} size={36} />}
              <View style={styles.farmCopy}>
                <View style={styles.farmName}>
                  <Text variant="label" numberOfLines={1} style={styles.shrink}>
                    {f.name}
                  </Text>
                  {f.verified ? <Verified size={13} color={colors.success} /> : null}
                </View>
                <Text variant="small" numberOfLines={1}>
                  {f.lga}
                  {f.matchCount > 0 ? ` · ${f.matchCount} matching` : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      {header}
      <ProductGrid
        items={shown?.items}
        header={resultsHeader}
        onEndReached={() => shown?.hasMore && setLimit((l) => l + PAGE)}
        empty={
          shown && shown.farms.length === 0 ? (
            <View style={styles.none}>
              <EmptyState
                icon={SearchOff}
                title={`No results for “${query}”`}
                message={n > 0 ? "Try fewer filters, or check the spelling." : "Check the spelling, or try a simpler word like “yam” or “tomatoes”."}
                actionLabel={n > 0 ? "Clear filters" : "Clear search"}
                onAction={() => (n > 0 ? setFilters({}) : (setText(""), setQuery("")))}
              />
              <View style={styles.tiles}>
                {categories?.slice(0, 4).map((c) => (
                  <CategoryTile
                    key={c._id}
                    name={c.name}
                    illustration={c.illustration}
                    onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug, name: c.name } })}
                  />
                ))}
              </View>
            </View>
          ) : null
        }
      />
      <FilterSheet
        visible={showFilters}
        value={filters}
        areas={areas.query === query ? areas.list : []}
        onClose={() => setShowFilters(false)}
        onApply={(f) => {
          setFilters(f);
          setLimit(PAGE);
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  searchBar: { paddingHorizontal: spacing.screen, paddingBottom: spacing.md },
  start: { paddingTop: spacing.xs, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  block: { paddingHorizontal: spacing.screen, gap: spacing.md },
  blockHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recentCard: { backgroundColor: colors.surfaceSoft, borderRadius: radii.lg + 4, paddingVertical: spacing.xs, overflow: "hidden" },
  recent: { flexDirection: "row", alignItems: "center", gap: spacing.lg, minHeight: 54, paddingHorizontal: spacing.lg },
  recentPressed: { backgroundColor: colors.tint },
  tileRow: { marginHorizontal: -spacing.screen },
  tileScroll: { gap: spacing.xxs, paddingHorizontal: spacing.screen - 4 },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.lg, paddingTop: spacing.sm },
  popular: { marginTop: spacing.sm },
  resultsHead: { gap: spacing.md, paddingBottom: spacing.sm },
  farmRow: { marginHorizontal: -spacing.screen },
  farms: { gap: spacing.sm, paddingHorizontal: spacing.screen },
  farm: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    maxWidth: 240,
  },
  farmPhoto: { width: 36, height: 36, borderRadius: 18 },
  farmCopy: { flexShrink: 1 },
  farmName: { flexDirection: "row", alignItems: "center", gap: 4 },
  none: { paddingTop: spacing.xxl, gap: spacing.xxl },
});
