// M-30 / M-31 Cart — Phase 2 shell (always empty until ordering, Phase 6).
import { router } from "expo-router";
import { ShoppingCart } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export default function Cart() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Your cart
      </Text>
      <View style={styles.center}>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          message="Fresh produce from farms near you is a few taps away."
          actionLabel="Start shopping"
          onAction={() => router.navigate("/home")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingHorizontal: spacing.screen, paddingTop: spacing.screen },
  center: { flex: 1, justifyContent: "center" },
});
