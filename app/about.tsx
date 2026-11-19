// M-97 About.
import * as Application from "expo-application";
import { Camera, External, Mail } from "@/components/icons";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader, Text, Wordmark } from "@/components/ui";
import { INFO_EMAIL, WEBSITE } from "@/content/help";
import { LICENCE_URL, PHOTO_CREDITS, UNSPLASH_URL } from "@/content/photoCredits";
import { APP_VERSION } from "@/features/system/AppGate";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

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
          <ListRow icon={External} title="Visit farmkeke.com" subtitle="Shop on the web" onPress={() => void Linking.openURL(WEBSITE)} />
          <ListRow icon={Mail} title="Email us" subtitle={INFO_EMAIL} onPress={() => void Linking.openURL(`mailto:${INFO_EMAIL}`)} />
        </ListGroup>
        <View style={styles.credits}>
          <View style={styles.creditsHead}>
            <Camera size={18} color={colors.forest} />
            <Text variant="heading">Photo credits</Text>
          </View>
          {PHOTO_CREDITS.map((c) => (
            <Text key={c.url} variant="small" color={colors.inkSoft} accessibilityRole="link" onPress={() => void Linking.openURL(c.url)}>
              <Text variant="small" color={colors.ink} style={styles.creditTitle}>
                {c.title}
              </Text>
              {` by ${c.author}, via Wikimedia Commons, `}
              <Text variant="small" color={colors.forest} style={styles.creditLink} onPress={() => void Linking.openURL(LICENCE_URL)}>
                {c.licence}
              </Text>
            </Text>
          ))}
          <Text variant="small" color={colors.inkSoft}>
            Produce photos from{" "}
            <Text variant="small" color={colors.forest} style={styles.creditLink} onPress={() => void Linking.openURL(UNSPLASH_URL)}>
              Unsplash
            </Text>
            .
          </Text>
        </View>
        <Text variant="small" align="center">
          Made in Owerri, Nigeria{"\n"}Farmkeke is a brand of Farmhaul Technologies Ltd (RC 9920885)
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingTop: spacing.xl },
  hero: { alignItems: "center", gap: spacing.sm },
  credits: { backgroundColor: colors.surfaceSoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, marginHorizontal: spacing.screen },
  creditsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 2 },
  creditTitle: { fontFamily: fonts.medium },
  creditLink: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  version: {
    marginTop: spacing.xs,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
});
