// M-60 / M-61 Orders — Phase 2 shell (no orders until Phase 6).
import { router } from "expo-router";
import { Package } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export default function Orders() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Orders
      </Text>
      <View style={styles.center}>
        <EmptyState
          icon={Package}
          title="No orders yet"
          message="When you order, you can follow it here, from the farm to your door."
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
