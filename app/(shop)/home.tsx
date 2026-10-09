// M-10 Home — Phase 2 shell. Listings, search, Fresh Picks and farms near
// you arrive in Phase 5; the header, escrow card and categories are live now.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Sprout } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CategoryTile, EmptyState, EscrowCard, LocationChip, Skeleton, Text } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { radii, spacing } from "@/theme/tokens";

export default function Home() {
  const area = usePrefs((s) => s.area);
  const categories = useQuery(api.catalog.listCategories);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LocationChip
            label={area ? `${area.name}, ${area.state}` : "Choose your area"}
            onPress={() => router.push({ pathname: "/choose-area", params: { from: "home" } })}
          />
        </View>

        <EscrowCard />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
          style={styles.bleed}
        >
          {categories === undefined
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} width={63} height={63} radius={radii.lg} />)
            : categories.map((c) => (
                <CategoryTile key={c._id} name={c.name} illustration={c.illustration} onPress={() => router.push("/categories")} />
              ))}
        </ScrollView>

        <Text variant="section" style={styles.section}>
          Fresh Picks
        </Text>
        <EmptyState
          icon={Sprout}
          title="Fresh produce is on its way"
          message="Farms near you are setting up their stalls. Their produce will show up here."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bleed: { marginHorizontal: -spacing.screen },
  categories: { paddingHorizontal: spacing.screen, gap: spacing.sm },
  section: { marginTop: spacing.sm },
});
