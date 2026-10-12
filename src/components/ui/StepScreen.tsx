// Multi-step form layout: header, "Step n of N" progress bar, title, intro,
// optional notices and a pinned footer. Used by the farmer application
// (F-03 to F-08) and the listing steps (F-21 to F-25).
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { colors, radii, spacing } from "@/theme/tokens";
import { Notice } from "./Notice";
import { ScreenHeader } from "./ScreenHeader";
import { Skeleton } from "./Skeleton";
import { Text } from "./Text";

type Props = {
  headerTitle: string;
  title: string;
  /** Omit to hide the progress bar (e.g. when editing one section). */
  step?: number;
  totalSteps?: number;
  intro?: string;
  loading?: boolean;
  banner?: string | null;
  /** Staff's note when they asked for changes to this step. */
  staffNote?: string | null;
  children: ReactNode;
  footer: ReactNode;
};

export function StepScreen({ headerTitle, title, step, totalSteps, intro, loading, banner, staffNote, children, footer }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={headerTitle} />
      {step !== undefined && totalSteps !== undefined && (
        <View style={styles.progressWrap} accessible accessibilityLabel={`Step ${step} of ${totalSteps}: ${title}`}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text variant="small">
            Step {step} of {totalSteps}
          </Text>
        </View>
      )}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Stagger>
            <View style={styles.heading}>
              <Text variant="displaySmall" accessibilityRole="header">
                {title}
              </Text>
              {intro !== undefined && <Text variant="caption">{intro}</Text>}
            </View>
            {staffNote ? <Notice tone="pending">{`Farmkeke asked for changes: ${staffNote}`}</Notice> : null}
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
  flex: { flex: 1 },
  progressWrap: { paddingHorizontal: spacing.screen, gap: spacing.xs },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.xs },
  skeletons: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.screen, paddingVertical: spacing.md },
});
