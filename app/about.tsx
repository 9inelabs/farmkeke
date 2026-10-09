// M-97 About.
import * as Application from "expo-application";
import { ExternalLink, Mail } from "lucide-react-native";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader, Text, Wordmark } from "@/components/ui";
import { HELLO_EMAIL, WEBSITE } from "@/content/help";
import { APP_VERSION } from "@/features/system/AppGate";
import { colors, radii, spacing } from "@/theme/tokens";

export default function About() {
  const build = Application.nativeBuildVersion;
  return (
    <Screen header={<ScreenHeader title="About Farmkeke" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Wordmark width={180} />
          <Text variant="caption" align="center">
            From the farm directly to your home
          </Text>
          <View style={styles.version}>
            <Text variant="small" color={colors.forest}>
              Version {APP_VERSION}
              {build ? ` (build ${build})` : ""}
            </Text>
          </View>
        </View>
        <ListGroup>
          <ListRow icon={ExternalLink} title="Visit farmkeke.com" subtitle="Shop on the web" onPress={() => void Linking.openURL(WEBSITE)} />
          <ListRow icon={Mail} title="Email us" subtitle={HELLO_EMAIL} onPress={() => void Linking.openURL(`mailto:${HELLO_EMAIL}`)} />
        </ListGroup>
        <Text variant="small" align="center">
          Made in Owerri, Nigeria
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingTop: spacing.xl },
  hero: { alignItems: "center", gap: spacing.sm },
  version: {
    marginTop: spacing.xs,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
});
