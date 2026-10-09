// Layout for the application steps F-03 to F-08: header, "Step n of 6"
// progress bar, title and a pinned Continue button.
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { STEPS } from "./constants";

type Props = {
  step: number; // 1–6
  intro?: string;
  loading?: boolean;
  banner?: string | null;
  /** Shown when staff asked for changes to this step (F-09b). */
  adminNote?: string | null;
  children: ReactNode;
  footer: ReactNode;
};

export function ApplyStep({ step, intro, loading, banner, adminNote, children, footer }: Props) {
  const { title } = STEPS[step - 1];
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Sell on Farmkeke" />
      <View style={styles.progressWrap} accessible accessibilityLabel={`Step ${step} of ${STEPS.length}: ${title}`}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(step / STEPS.length) * 100}%` }]} />
        </View>
        <Text variant="small">
          Step {step} of {STEPS.length}
        </Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <Text variant="displaySmall" accessibilityRole="header">
              {title}
            </Text>
            {intro !== undefined && <Text variant="caption">{intro}</Text>}
          </View>
          {adminNote ? <Notice tone="pending">{`Farmkeke asked for changes: ${adminNote}`}</Notice> : null}
          {banner ? <Notice tone="error">{banner}</Notice> : null}
          {loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={56} radius={radii.control} />
              <Skeleton height={56} radius={radii.control} />
              <Skeleton height={56} radius={radii.control} />
            </View>
          ) : (
            children
          )}
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  progressWrap: { paddingHorizontal: spacing.screen, gap: spacing.xs },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.xs },
  skeletons: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.screen, paddingVertical: spacing.md },
});
