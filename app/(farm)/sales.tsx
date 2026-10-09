// F-40 Orders (farmer) — Phase 3 shell; orders arrive in Phase 6.
import { ClipboardList } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export default function FarmOrders() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Orders
      </Text>
      <View style={styles.center}>
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          message="New orders show here. You'll have 24 hours to accept or decline each one."
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
