// F-09 Application submitted, in the sign-up screens' style.
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Check } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const NEXT = ["Farmkeke reviews your profile, usually within 2 working days", "We text you the decision", "Set your collection hours and add your first listing"];

export default function ApplicationSubmitted() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  const home = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace("/home");
  };
  return (
    <SellShell
      back="close"
      onBack={home}
      curve="both"
      sticker="center"
      pinFooter
      footer={
        <>
          <Button label="See application status" variant="black" size="large" fullWidth onPress={() => router.replace("/sell/status")} />
          <Button label="Back to shopping" variant="ghost" fullWidth onPress={home} />
        </>
      }
    >
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.tick}>
        <Check size={40} color={colors.forest} strokeWidth={3} />
      </Animated.View>
      <SellTitle title="Application" accent="Sent" note="Thank you. We'll be in touch soon." />
      {reference ? (
        <View style={styles.reference}>
          <Text variant="small" color={colors.forest} style={styles.refText}>
            Reference {reference}
          </Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text variant="label" style={styles.cardTitle}>
          What happens next
        </Text>
        {NEXT.map((line, i) => (
          <View key={line} style={styles.step}>
            <View style={styles.num}>
              <Text variant="small" color={colors.forest} style={styles.refText}>
                {i + 1}
              </Text>
            </View>
            <Text variant="small" color={colors.inkSoft} style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tick: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  reference: { alignSelf: "center", backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  refText: { fontFamily: fonts.semibold },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 2, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontFamily: fonts.semibold },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
});
