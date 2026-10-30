// F-91 Contact support (farmer): in-app conversations with Farmkeke support
// (the shared support screens, side "farm"), or email.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Call, Headphone, Mail } from "@/components/icons";
import { Linking, ScrollView, StyleSheet } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader, Text } from "@/components/ui";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/content/help";
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
            icon={Headphone}
            title="Message Farmkeke support"
            subtitle="Chat in the app, about an order or anything else"
            onPress={() => router.push({ pathname: "/support", params: { side: "farm" } })}
          />
          <ListRow
            icon={Mail}
            title="Email us"
            subtitle={`${SUPPORT_EMAIL} · usually replies within a few hours`}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`)}
          />
          <ListRow
            icon={Call}
            title="Call or WhatsApp"
            subtitle={`${SUPPORT_PHONE} · Mon to Sat, 8am to 8pm`}
            onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`)}
          />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md, paddingTop: spacing.sm } });
