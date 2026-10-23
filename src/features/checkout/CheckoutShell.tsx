// The frame every checkout step shares: back, "Step 2 of 4" with a lime
// progress bar, the step's title, its content, and the main button pinned at
// the bottom. An empty cart (paid on another screen, or emptied) goes back to
// the cart.
import { router } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Text } from "@/components/ui";
import { useCart } from "@/store/cart";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export const STEPS = ["Contact", "Delivery or pickup", "Details", "Review"] as const;

type Props = {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
};

export function CheckoutShell({ step, title, subtitle, children, footer }: Props) {
  const empty = useCart((s) => s.lines.length === 0);
  useEffect(() => {
    if (empty) router.replace("/cart");
  }, [empty]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/cart"))}
          style={styles.back}
        >
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
          <Text variant="bodyMedium">{step === 1 ? "Cart" : STEPS[step - 2]}</Text>
        </Pressable>
        <Text variant="label" color={colors.inkSoft}>
          Step {step} of {STEPS.length}
        </Text>
      </View>
      <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step }}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.segment, i < step && styles.segmentOn]} />
        ))}
      </View>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Stagger>
            <View style={styles.heading}>
              <Text variant="title" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="body" color={colors.inkSoft}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </Stagger>
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** White rounded card on the canvas, used for blocks within a step. */
export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fill: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen - 4,
    paddingRight: spacing.screen,
    paddingTop: spacing.sm,
  },
  back: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
  bar: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.screen, paddingTop: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  segmentOn: { backgroundColor: colors.lime },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  heading: { gap: spacing.xs },
  title: { fontFamily: fonts.bold, letterSpacing: -0.3 },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm, backgroundColor: colors.canvas },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.md },
});
