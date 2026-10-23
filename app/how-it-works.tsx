// M-92 How Farmkeke works.
import { router } from "expo-router";
import { Bike, Cart, CheckCircle, Lock, Sprout, type IconComponent } from "@/components/icons";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Screen, ScreenHeader, Text } from "@/components/ui";
import { HOW_IT_WORKS } from "@/content/help";
import { colors, spacing } from "@/theme/tokens";

const ICONS: IconComponent[] = [Cart, Lock, Sprout, Bike, CheckCircle];

export default function HowItWorks() {
  return (
    <Screen
      header={<ScreenHeader title="How Farmkeke works" />}
      footer={<Button label="Start shopping" fullWidth onPress={() => router.navigate("/home")} />}
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="displaySmall" accessibilityRole="header">
          Fresh from the farm, safely paid
        </Text>
        <Text variant="caption">Here's what happens from the moment you order.</Text>
        <View style={styles.steps}>
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = ICONS[i];
            const last = i === HOW_IT_WORKS.length - 1;
            return (
              <View key={step.title} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${step.title}. ${step.body}`}>
                <View style={styles.rail}>
                  <View style={styles.icon}>
                    <Icon size={18} color={colors.forest} />
                  </View>
                  {!last && <View style={styles.line} />}
                </View>
                <View style={styles.copy}>
                  <Text variant="small">Step {i + 1}</Text>
                  <Text variant="bodyMedium">{step.title}</Text>
                  <Text variant="caption">{step.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm, paddingBottom: spacing.xxl },
  steps: { marginTop: spacing.xl },
  step: { flexDirection: "row", gap: spacing.md },
  rail: { alignItems: "center", width: 36 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { flex: 1, width: 2, backgroundColor: colors.tint, marginVertical: 4 },
  copy: { flex: 1, gap: 2, paddingBottom: spacing.xl },
});
