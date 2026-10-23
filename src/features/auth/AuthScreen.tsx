import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Sprout } from "@/components/icons";
import { Button, Segmented, Text, Wordmark } from "@/components/ui";
import { Stagger } from "@/components/motion/reveal";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { closeAuth } from "./navigation";

type Tab = "sign-in" | "create-account";

type Props = {
  title: string;
  subtitle?: string;
  /** "close" for the first screen of the modal, "back" for later steps. */
  nav?: "close" | "back";
  /** Shows the Sign in / Create account switch. */
  tab?: Tab;
  children: ReactNode;
  footer: ReactNode;
};

const TABS = [
  { value: "sign-in", label: "Sign in" },
  { value: "create-account", label: "Create Account" },
] as const;

/**
 * Layout shared by the sign-in and account screens (M-50 to M-57), from the
 * "Sign In" and "Create Account" designs: Close at the top left, the
 * centred wordmark and tagline, a centred title, then the form and its
 * button straight under the fields.
 */
export function AuthScreen({ title, subtitle, nav = "close", tab, children, footer }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nav === "close" ? "Close" : "Back"}
          hitSlop={10}
          onPress={nav === "close" ? closeAuth : () => router.back()}
          style={styles.close}
        >
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
          <Text variant="bodyMedium">{nav === "close" ? "Close" : "Back"}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Stagger>
            <View style={styles.brand}>
              <Wordmark width={112} />
              <Text variant="small" color={colors.inkSoft} align="center">
                ...from the farm, directly to your home
              </Text>
            </View>
            <View style={styles.heading}>
              <Text variant="displaySmall" align="center" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle !== undefined && (
                <Text variant="caption" align="center">
                  {subtitle}
                </Text>
              )}
            </View>
            {tab !== undefined && <Segmented options={TABS} value={tab} onChange={(next) => next !== tab && router.replace(`/${next}`)} />}
            <View style={styles.form}>{children}</View>
            <View style={styles.footer}>{footer}</View>
            {tab !== undefined ? (
              <View style={styles.farmer}>
                <View style={styles.orRow}>
                  <View style={styles.rule} />
                  <Text variant="small">or</Text>
                  <View style={styles.rule} />
                </View>
                {/* Farmers log in with their phone and PIN (24 Oct 2026) */}
                <Button label="Log in as farmer" icon={Sprout} variant="outline" size="large" pill fullWidth onPress={() => router.push("/sell/login")} />
              </View>
            ) : null}
          </Stagger>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The underlined lime "No account yet? Create one" line under the button. */
export function AuthSwitchLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text variant="label" color={colors.limeInk} align="center" accessibilityRole="link" onPress={onPress} style={styles.link}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  fill: { flex: 1 },
  topRow: { flexDirection: "row", paddingHorizontal: spacing.screen - 4, paddingTop: spacing.sm },
  close: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xs, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  brand: { alignItems: "center", gap: spacing.xxs },
  heading: { gap: spacing.xs, marginTop: spacing.lg },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34 },
  form: { gap: spacing.lg, marginTop: spacing.sm },
  footer: { gap: spacing.lg, marginTop: spacing.md },
  link: { textDecorationLine: "underline", paddingVertical: spacing.xxs },
  farmer: { gap: spacing.lg },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
});
