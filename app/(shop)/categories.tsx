// M-11 All categories — Phase 2 shell. Tapping into a category (M-12)
// arrives with listings in Phase 5.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CategoryTile, Skeleton, Text } from "@/components/ui";
import { Stagger } from "@/components/motion/reveal";
import { radii, spacing } from "@/theme/tokens";

export default function Categories() {
  const categories = useQuery(api.catalog.listCategories);
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Stagger>
        <Text variant="title" accessibilityRole="header">
          Categories
        </Text>
        <View style={styles.grid}>
          {categories === undefined
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} width={63} height={63} radius={radii.lg} />)
            : categories.map((c) => (
                <CategoryTile key={c._id} name={c.name} illustration={c.illustration} onPress={() => {}} />
              ))}
        </View>
        </Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.xl },
});
