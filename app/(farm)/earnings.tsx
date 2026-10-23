// F-60 Earnings — Phase 3 shell; money moves once orders exist (Phase 6).
import { Wallet } from "@/components/icons";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, Text } from "@/components/ui";
import { Stagger } from "@/components/motion/reveal";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";

const TOTALS = [
  { label: "Held", hint: "Paid by buyers, waiting for delivery" },
  { label: "Released", hint: "Buyers confirmed delivery" },
  { label: "Paid out", hint: "Sent to your bank account" },
];

export default function Earnings() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Stagger>
        <Text variant="screenTitle" accessibilityRole="header">
          Earnings
        </Text>
        <View style={styles.totals}>
          {TOTALS.map((t) => (
            <View key={t.label} style={styles.total}>
              <Text variant="small">{t.label}</Text>
              <Text variant="price">{formatNaira(0)}</Text>
              <Text variant="small">{t.hint}</Text>
            </View>
          ))}
        </View>
        <EmptyState icon={Wallet} title="No money movements yet" message="Every payment held, released and paid out will be listed here." />
        </Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.xl },
  totals: { gap: spacing.sm },
  total: { backgroundColor: colors.tint, borderRadius: radii.lg, padding: spacing.lg, gap: 2 },
});
