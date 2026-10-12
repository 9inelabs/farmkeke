import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, Text, Wordmark } from "@/components/ui";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { colors, spacing } from "@/theme/tokens";
import { closeAuth } from "./navigation";

type Props = {
  title: string;
  subtitle?: string;
  /** "close" for the first screen of the modal, "back" for later steps. */
  nav?: "close" | "back";
  backTitle?: string;
  children: ReactNode;
  footer: ReactNode;
};

/** Layout shared by the sign-in and account screens (M-50 to M-57). */
export function AuthScreen({ title, subtitle, nav = "close", backTitle, children, footer }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      {nav === "back" ? (
        <ScreenHeader title={backTitle ?? ""} />
      ) : (
        <View style={styles.closeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={closeAuth}
            style={styles.close}
          >
            <X size={18} color={colors.forest} />
            <Text variant="label" color={colors.forest}>
              Close
            </Text>
          </Pressable>
        </View>
      )}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Stagger>
            {nav === "close" && <Wordmark width={120} />}
            <View style={styles.heading}>
              <Text variant="displaySmall" accessibilityRole="header">
                {title}
              </Text>
              {subtitle !== undefined && (
                <Text variant="body" color={colors.inkSoft}>
                  {subtitle}
                </Text>
              )}
            </View>
            {children}
          </Stagger>
        </ScrollView>
        <Reveal index={4} style={styles.footer}>
          {footer}
        </Reveal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  fill: { flex: 1 },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  close: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, minHeight: 44 },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.sm },
  footer: { paddingHorizontal: spacing.screen, paddingVertical: spacing.md, gap: spacing.md },
});
