// M-86 Saved items: produce saved for later. Signed-in accounts only.
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, ScreenHeader, StatusScreen } from "@/components/ui";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { colors, spacing } from "@/theme/tokens";

export default function Saved() {
  const viewer = useQuery(api.users.viewer);
  const items = useQuery(api.favorites.list);
  const markSeen = useMutation(api.favorites.markSeen);
  const signedIn = viewer != null && !viewer.isGuest;

  // "Back in stock" tags reset after this visit
  useEffect(() => {
    if (signedIn && items && items.some((i) => i.backInStock)) void markSeen({});
  }, [signedIn, items, markSeen]);

  if (viewer !== undefined && !signedIn) {
    return (
      <StatusScreen
        icon={Heart}
        title="Sign in to save items"
        message="Keep a list of produce you love, and we'll tell you when sold-out items are back."
        header={<ScreenHeader title="Saved items" />}
        actions={<Button label="Sign in" onPress={() => router.push("/sign-in")} />}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader title="Saved items" />
      <ProductGrid
        items={items?.map((i) => ({
          id: i.id,
          name: i.name,
          priceKobo: i.priceKobo,
          unit: i.unit,
          imageUrl: i.imageUrl,
          inStock: i.available,
          freshness: i.backInStock ? "Back in stock" : null,
        }))}
        empty={
          <View style={styles.empty}>
            <EmptyState
              icon={Heart}
              title="Nothing saved yet"
              message="Tap the heart on a product to keep it here for later."
              actionLabel="Start shopping"
              onAction={() => router.replace("/home")}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  empty: { paddingTop: spacing.xxxl },
});
