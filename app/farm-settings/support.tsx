// F-91 Contact support (farmer). In-app support chat arrives in Phase 8.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Mail } from "@/components/icons";
import { Linking, ScrollView, StyleSheet } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader, Text } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/content/help";
import { spacing } from "@/theme/tokens";

export default function FarmerSupport() {
  const farm = useQuery(api.farms.mine);
  const subject = encodeURIComponent(`Farm support${farm ? `: ${farm.name}` : ""}`);
  return (
    <Screen header={<ScreenHeader title="Contact support" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="displaySmall" accessibilityRole="header">
          How can we help?
        </Text>
        <Text variant="caption">Questions about your application, listings, orders or payouts.</Text>
        <ListGroup>
          <ListRow
            icon={Mail}
            title="Email us"
            subtitle={`${SUPPORT_EMAIL} · replies within a day`}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`)}
          />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md, paddingTop: spacing.sm } });
