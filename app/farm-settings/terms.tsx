// F-92 Farmer terms and policies.
// PLACEHOLDER: the text is to be supplied by Farmkeke's legal adviser.
import { FileText } from "lucide-react-native";
import { ScrollView, StyleSheet } from "react-native";
import { Notice, Screen, ScreenHeader, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

const SUMMARY = [
  "Only list produce you grow or raise yourself, and describe it honestly.",
  "Accept or decline every order within 24 hours.",
  "Have orders packed and ready by the rider's collection time.",
  "Farmkeke holds buyers' payments and releases them after delivery is confirmed, minus Farmkeke's commission.",
  "Farmkeke may pause selling on a farm while a problem is looked into.",
];

export default function FarmerTerms() {
  return (
    <Screen header={<ScreenHeader title="Farmer terms" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <Notice icon={FileText}>The full farmer terms are being prepared by Farmkeke's legal adviser and will appear here before launch.</Notice>
        <Text variant="overline">In short</Text>
        {SUMMARY.map((line) => (
          <Text key={line} variant="body">
            • {line}
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md, paddingBottom: spacing.xxl } });
