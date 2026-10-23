// M-11 All categories: every category with how many products it has. Tapping
// one opens its products (M-12).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CategoryTile, SearchPill, Skeleton, Text } from "@/components/ui";
import { Stagger } from "@/components/motion/reveal";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Categories() {
  const categories = useQuery(api.catalog.listCategoriesWithCounts);
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Stagger>
          <Text variant="title" accessibilityRole="header">
            Categories
          </Text>
          <SearchPill mode="button" onPress={() => router.push("/search")} />
          <View style={styles.grid}>
            {categories === undefined
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} width={71} height={90} radius={radii.lg} />)
              : categories.map((c) => (
                  <View key={c._id} style={styles.cell}>
                    <CategoryTile
                      name={c.name}
                      illustration={c.illustration}
                      onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug, name: c.name } })}
                    />
                    <Text variant="small" align="center">
                      {c.productCount === 1 ? "1 product" : `${c.productCount} products`}
                    </Text>
                  </View>
                ))}
          </View>
        </Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.screen, gap: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.xl },
  cell: { alignItems: "center", gap: 2 },
});
