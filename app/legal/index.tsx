// M-93 Legal: terms, privacy, refund and dispute policy.
import { router } from "expo-router";
import { FileText, RefreshCcw, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader } from "@/components/ui";
import { LEGAL_DOCS } from "@/content/help";
import { spacing } from "@/theme/tokens";

export default function Legal() {
  return (
    <Screen header={<ScreenHeader title="Terms and policies" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <ListGroup>
          <ListRow icon={FileText} title={LEGAL_DOCS.terms.title} subtitle={LEGAL_DOCS.terms.summary} onPress={() => router.push("/legal/terms")} />
          <ListRow icon={ShieldCheck} title={LEGAL_DOCS.privacy.title} subtitle={LEGAL_DOCS.privacy.summary} onPress={() => router.push("/legal/privacy")} />
          <ListRow icon={RefreshCcw} title={LEGAL_DOCS.refunds.title} subtitle={LEGAL_DOCS.refunds.summary} onPress={() => router.push("/legal/refunds")} />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { paddingTop: spacing.sm } });
