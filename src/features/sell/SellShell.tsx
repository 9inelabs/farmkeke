// The frame of the farmer sign-up screens (premium redesign, Nov 2026): a
// round Back (or Close) button, "Step X of 5" and the step bar along the
// top, a big left-aligned headline, the content, and the main button pinned
// at the foot. "light" is the soft canvas of the form steps; "dark" is the
// deep green of the PIN, log-in and finish screens.
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Close } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop, Glass, StepBar } from "@/components/premium";
import { Text } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

/** Sign-up has five steps: phone, about you, photos, bank, review. */
export const SELL_STEPS = 5;

type Tone = "light" | "dark";

/** The step's headline: a small label above, the title (its `accent` in lime on dark), and a line under it. */
export function SellTitle({
  title,
  accent,
  note,
  overline,
  tone = "light",
  center = false,
}: {
  title: string;
  accent?: string;
  note?: string;
  overline?: string;
  tone?: Tone;
  center?: boolean;
}) {
  const dark = tone === "dark";
  return (
    <View style={[styles.titleWrap, center && styles.center]}>
      {overline ? <Text style={[styles.overline, dark && { color: colors.lime }]}>{overline}</Text> : null}
      <Text style={[styles.title, dark && styles.titleDark, center && styles.textCenter]} accessibilityRole="header">
        {title}
        {accent ? <Text style={[styles.title, dark ? styles.accentDark : styles.titleLight]}>{` ${accent}`}</Text> : null}
      </Text>
      {note ? <Text style={[styles.note, dark && styles.noteDark, center && styles.textCenter]}>{note}</Text> : null}
    </View>
  );
}

type Props = {
  children: ReactNode;
  /** The main button (and anything under it). */
  footer?: ReactNode;
  back?: "back" | "close";
  onBack?: () => void;
  tone?: Tone;
  /** Shows "Step X of 5" and the step bar. */
  step?: { current: number; progress?: number };
  /** Keep the footer at the bottom of the screen (default) or let it follow the content. */
  pinFooter?: boolean;
  /** Replaces the content padding, for screens that lay themselves out (the PIN pad). */
  bare?: boolean;
  /** Shown at the right of the top row when there is no step count (the log-in screen's wordmark). */
  right?: ReactNode;
};

export function SellShell({ children, footer, back = "back", onBack, tone = "light", step, pinFooter = true, bare = false, right }: Props) {
  const insets = useSafeAreaInsets();
  const dark = tone === "dark";
  const leave = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/home")));
  const BackGlyph = back === "close" ? Close : ChevronLeft;

  return (
    <View style={[styles.screen, dark && styles.screenDark]}>
      <StatusBar style={dark ? "light" : "dark"} />
      {dark ? <ForestBackdrop /> : null}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={back === "close" ? "Close" : "Back"} hitSlop={8} onPress={leave}>
            {dark ? (
              <Glass style={styles.round}>
                <BackGlyph size={20} color={colors.white} strokeWidth={2} />
              </Glass>
            ) : (
              <View style={[styles.round, styles.roundLight]}>
                <BackGlyph size={20} color={colors.forest} strokeWidth={2} />
              </View>
            )}
          </Pressable>
          {step ? (
            <Text style={[styles.stepText, dark && { color: colors.onForest }]}>
              Step {step.current} of {SELL_STEPS}
            </Text>
          ) : (right ?? null)}
        </View>
        {step ? (
          <View style={styles.bar}>
            <StepBar total={SELL_STEPS} current={step.current} progress={step.progress ?? 0.5} tone={tone} />
          </View>
        ) : null}
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[bare ? styles.bare : styles.content, styles.grow]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {bare ? children : <Stagger>{children}</Stagger>}
          {footer && !pinFooter ? <View style={styles.footerInline}>{footer}</View> : null}
        </ScrollView>
        {footer && pinFooter ? <View style={[styles.footerPinned, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 8 }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9F4" },
  screenDark: { backgroundColor: colors.forestDeep },
  flex: { flex: 1 },
  top: { paddingHorizontal: spacing.screen },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 48 },
  round: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roundLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  stepText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  bar: { marginTop: 12 },
  content: { paddingHorizontal: spacing.screen, paddingTop: 26, paddingBottom: spacing.xl, gap: spacing.lg },
  bare: { paddingHorizontal: spacing.screen, paddingTop: 16, paddingBottom: spacing.lg },
  grow: { flexGrow: 1 },
  footerInline: { marginTop: spacing.md, gap: spacing.sm },
  footerPinned: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, gap: spacing.sm },
  titleWrap: { gap: 8, marginBottom: 4 },
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase", color: colors.limeInk },
  title: { fontFamily: fonts.displayHeavy, fontSize: 27, lineHeight: 33, letterSpacing: -0.9, color: colors.forest },
  titleLight: { color: colors.forest },
  titleDark: { color: colors.white },
  accentDark: { color: colors.lime },
  note: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft },
  noteDark: { color: colors.onForest },
});
