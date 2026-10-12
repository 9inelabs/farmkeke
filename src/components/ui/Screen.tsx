import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  /** Pinned below the content, e.g. the primary button. */
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  background?: string;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Set false when the content reveals itself (e.g. StatusScreen), so it isn't animated twice. */
  revealContent?: boolean;
};

/** Safe-area screen with the standard 20pt side margin. */
export function Screen({
  children,
  footer,
  header,
  scroll = false,
  background = colors.white,
  edges = ["top", "bottom"],
  contentStyle,
  revealContent = true,
}: Props) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {revealContent ? <Stagger>{children}</Stagger> : children}
    </ScrollView>
  ) : revealContent ? (
    // Usually one list or scroll view that must fill the screen, so it reveals as a whole.
    <Reveal style={[styles.content, styles.fill, contentStyle]}>{children}</Reveal>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: background }]}>
      {header}
      {content}
      {footer !== undefined && (
        <Reveal index={4} style={styles.footer}>
          {footer}
        </Reveal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
});
