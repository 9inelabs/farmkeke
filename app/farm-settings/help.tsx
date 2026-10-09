// F-90 Help and guides (articles; video guides later).
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Screen, ScreenHeader, Text } from "@/components/ui";
import { FARMER_GUIDES } from "@/content/farmerHelp";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function FarmerHelp() {
  const [open, setOpen] = useState<string | null>(FARMER_GUIDES[0].title);
  return (
    <Screen header={<ScreenHeader title="Help and guides" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="caption">How to sell well on Farmkeke.</Text>
        <View style={styles.list}>
          {FARMER_GUIDES.map((g, i) => {
            const expanded = open === g.title;
            return (
              <View key={g.title} style={i > 0 && styles.divider}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : g.title)}
                  style={styles.row}
                >
                  <Text variant="label" style={styles.flex}>
                    {g.title}
                  </Text>
                  {expanded ? <ChevronUp size={18} color={colors.inkMuted} /> : <ChevronDown size={18} color={colors.inkMuted} />}
                </Pressable>
                {expanded && (
                  <Text variant="caption" style={styles.answer}>
                    {g.body}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  list: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime },
  divider: { borderTopWidth: borders.hairline, borderTopColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 52 },
  answer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
});
