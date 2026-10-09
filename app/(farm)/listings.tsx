// F-20 Listings — Phase 3 shell; adding and managing listings is Phase 4.
import { Sprout } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export default function Listings() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Listings
      </Text>
      <View style={styles.center}>
        <EmptyState
          icon={Sprout}
          title="No listings yet"
          message="The produce you sell will show here, with its price, stock and status."
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
