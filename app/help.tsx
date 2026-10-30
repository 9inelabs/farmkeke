// M-90 Help and FAQ.
import { Basket, BoxRemove, Call, ChevronDown, ChevronUp, Help as HelpIcon, Lock, Mail, Search, Truck } from "@/components/icons";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, EmptyState, Screen, ScreenHeader, Text } from "@/components/ui";
import { FAQ, HELP_TOPICS, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL, type HelpTopic } from "@/content/help";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const TOPIC_ICONS = { ordering: Basket, delivery: Truck, payment: Lock, problem: BoxRemove } as const;

export default function Help() {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [open, setOpen] = useState<string | null>(FAQ[0].question);

  const questions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return FAQ.filter(
      (q) =>
        (topic === null || q.topic === topic) &&
        (term === "" || q.question.toLowerCase().includes(term) || q.answer.toLowerCase().includes(term)),
    );
  }, [search, topic]);

  return (
    <Screen header={<ScreenHeader title="Help and FAQ" />}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.search}>
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search help"
            placeholderTextColor={colors.inkMuted}
            selectionColor={colors.forest}
            accessibilityLabel="Search help"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.topics}>
          {HELP_TOPICS.map(({ key, title }) => {
            const Icon = TOPIC_ICONS[key];
            const selected = topic === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTopic(selected ? null : key)}
                style={[styles.topic, selected && styles.topicOn]}
              >
                <View style={styles.topicIcon}>
                  <Icon size={18} color={colors.forest} />
                </View>
                <Text variant="label">{title}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="overline">{topic ? HELP_TOPICS.find((t) => t.key === topic)?.title : "Popular questions"}</Text>
        {questions.length === 0 ? (
          <EmptyState icon={HelpIcon} title="No answers found" message="Try other words, or email our team." />
        ) : (
          <View style={styles.faq}>
            {questions.map((q, i) => {
              const expanded = open === q.question;
              return (
                <View key={q.question} style={i > 0 && styles.divider}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => setOpen(expanded ? null : q.question)}
                    style={styles.question}
                  >
                    <Text variant="label" style={styles.flex}>
                      {q.question}
                    </Text>
                    {expanded ? <ChevronUp size={18} color={colors.inkMuted} /> : <ChevronDown size={18} color={colors.inkMuted} />}
                  </Pressable>
                  {expanded && (
                    <Text variant="caption" style={styles.answer}>
                      {q.answer}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.contact}>
          <Text variant="heading">Still need help?</Text>
          <Text variant="caption">Our team usually replies within a few hours, Monday to Saturday, 8am to 8pm.</Text>
          <Button
            label={`Email ${SUPPORT_EMAIL}`}
            icon={Mail}
            variant="secondary"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <Button label={`Call ${SUPPORT_PHONE}`} icon={Call} variant="secondary" onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  search: {
    height: 50,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.inkSoft,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  topic: {
    width: "48.5%",
    minHeight: 84,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  topicOn: { borderColor: colors.lime, backgroundColor: colors.tint },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  faq: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime },
  divider: { borderTopWidth: borders.hairline, borderTopColor: colors.line },
  question: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 52 },
  answer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  contact: { gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.md },
});
