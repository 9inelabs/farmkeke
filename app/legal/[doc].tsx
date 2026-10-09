// M-93 One legal document, shown as a readable page in the app.
// PLACEHOLDER: the text is to be supplied by Farmkeke's legal adviser.
import { Redirect, useLocalSearchParams } from "expo-router";
import { FileText } from "lucide-react-native";
import { ScrollView, StyleSheet } from "react-native";
import { Notice, Screen, ScreenHeader, Text } from "@/components/ui";
import { LEGAL_DOCS, type LegalDoc } from "@/content/help";
import { spacing } from "@/theme/tokens";

export default function LegalDocument() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const entry = LEGAL_DOCS[doc as LegalDoc];
  if (entry === undefined) return <Redirect href="/legal" />;

  return (
    <Screen header={<ScreenHeader title={entry.title} />}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="small">Last updated: to be confirmed</Text>
        <Notice icon={FileText}>
          The full text is being prepared by Farmkeke's legal adviser and will appear here before launch.
        </Notice>
        <Text variant="body">{entry.summary}.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.lg, paddingTop: spacing.sm } });
