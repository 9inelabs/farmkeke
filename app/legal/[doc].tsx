// M-93 One legal document, shown as a readable page in the app. The wording
// is the website's (src/content/legal/), so both always match.
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Screen, ScreenHeader, Text } from "@/components/ui";
import { WEBSITE } from "@/content/help";
import { LEGAL, isLegalDoc, type LegalBlock } from "@/content/legal";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

// Text uses two marks only: **bold** and [label](href), as on the website
const MARK = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function openLink(href: string) {
  const doc = /^\/legal\/([a-z-]+)$/.exec(href)?.[1];
  if (isLegalDoc(doc)) router.push(`/legal/${doc}`);
  else void Linking.openURL(href.startsWith("/") ? `${WEBSITE}${href}` : href);
}

function Inline({ text }: { text: string }) {
  return text.split(MARK).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link)
      return (
        <Text key={i} accessibilityRole="link" style={styles.link} onPress={() => openLink(link[2])}>
          {link[1]}
        </Text>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ block }: { block: LegalBlock }) {
  if ("p" in block)
    return (
      <Text variant="body" color={colors.inkSoft} style={styles.para}>
        <Inline text={block.p} />
      </Text>
    );
  return (
    <View style={styles.list}>
      {block.ul.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text variant="body" color={colors.inkSoft} style={styles.para}>
            •
          </Text>
          <Text variant="body" color={colors.inkSoft} style={[styles.para, styles.itemText]}>
            <Inline text={item} />
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function LegalDocument() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  if (!isLegalDoc(doc)) return <Redirect href="/legal" />;
  const entry = LEGAL[doc];

  return (
    <Screen header={<ScreenHeader title={entry.title} />}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="small">Last updated {entry.updated}</Text>
        <View style={styles.short}>
          <Text variant="body" color={colors.forest} style={styles.para}>
            <Inline text={entry.short} />
          </Text>
        </View>
        {entry.sections.map((s, i) => (
          <View key={s.id} style={styles.section}>
            <Text variant="section">
              {i + 1}. {s.title}
            </Text>
            {s.blocks.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </View>
        ))}
        <Text variant="small">Also at {WEBSITE.replace("https://", "")}/legal/{doc}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  short: { backgroundColor: colors.tint, borderRadius: radii.md, padding: spacing.md },
  section: { gap: spacing.sm },
  para: { lineHeight: 21 },
  bold: { fontFamily: fonts.semibold },
  link: { fontFamily: fonts.semibold, color: colors.forest, textDecorationLine: "underline" },
  list: { gap: spacing.xs },
  item: { flexDirection: "row", gap: spacing.sm },
  itemText: { flex: 1 },
});
