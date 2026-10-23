// M-12 Category products: one category's listings, with type chips and the
// filter and sort sheet (M-16). Loads more as you scroll.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Sprout } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, EmptyState, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { activeCount, FilterSheet, filterArgs, type Filters } from "@/features/shop/FilterSheet";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { ResultsBar } from "@/features/shop/ResultsBar";
import { useShopContext } from "@/features/shop/useShopContext";
import { colors, spacing } from "@/theme/tokens";

const PAGE = 24;

export default function CategoryPage() {
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const { today } = useShopContext();
  const [filters, setFilters] = useState<Filters>({});
  const [subtype, setSubtype] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const data = useQuery(api.storefront.categoryListings, {
    slug,
    today,
    limit,
    ...filterArgs(filters),
    ...(subtype ? { subtypes: [subtype] } : {}),
  });
  // Keep the last results on screen while a new page or filter loads
  const [last, setLast] = useState<typeof data>(undefined);
  if (data !== undefined && data !== last) setLast(data);
  const shown = data ?? last;

  if (shown === null) {
    return (
      <StatusScreen
        icon={Sprout}
        title="Category not found"
        message="It may have been renamed. See all categories instead."
        actions={<Button label="All categories" onPress={() => router.replace("/categories")} />}
      />
    );
  }

  const n = filters ? activeCount(filters) : 0;
  const header = (
    <View style={styles.head}>
      {shown && shown.category.subtypes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
          <Chip label="All" selected={subtype === null} onPress={() => (setSubtype(null), setLimit(PAGE))} />
          {shown.category.subtypes
            .filter((s) => s.count > 0)
            .map((s) => (
              <Chip key={s.slug} label={`${s.name} (${s.count})`} selected={subtype === s.slug} onPress={() => (setSubtype(s.slug), setLimit(PAGE))} />
            ))}
        </ScrollView>
      ) : null}
      {shown ? (
        <ResultsBar
          summary={`${shown.total} ${shown.total === 1 ? "product" : "products"} from ${shown.farmCount} ${shown.farmCount === 1 ? "farm" : "farms"}`}
          active={n}
          onFilter={() => setShowFilters(true)}
        />
      ) : (
        <Skeleton height={20} width={200} />
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader title={shown?.category.name ?? name ?? "Category"} />
      <ProductGrid
        items={shown?.items}
        header={header}
        onEndReached={() => shown?.hasMore && setLimit((l) => l + PAGE)}
        empty={
          <View style={styles.empty}>
            <EmptyState
              icon={Sprout}
              title={n > 0 || subtype ? "Nothing matches" : "Nothing here yet"}
              message={n > 0 || subtype ? "Try fewer filters." : "Farms near you haven't listed anything in this category yet."}
              actionLabel={n > 0 || subtype ? "Clear filters" : "Keep shopping"}
              onAction={() => (n > 0 || subtype ? (setFilters({}), setSubtype(null)) : router.replace("/home"))}
            />
          </View>
        }
      />
      <FilterSheet
        visible={showFilters}
        value={filters}
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
  head: { gap: spacing.md, paddingBottom: spacing.sm },
  chipRow: { marginHorizontal: -spacing.screen },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.screen },
  empty: { paddingTop: spacing.xxxl },
});
