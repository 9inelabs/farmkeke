import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Stagger } from "@/components/motion/reveal";
import { colors, spacing } from "@/theme/tokens";
import { Screen } from "./Screen";
import { Text } from "./Text";

type Tone = "brand" | "success" | "error" | "pending";

const tones: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: colors.tint, fg: colors.forest },
  success: { bg: colors.successSoft, fg: colors.success },
  error: { bg: colors.errorSoft, fg: colors.error },
  pending: { bg: colors.pendingSoft, fg: colors.pendingInk },
};

type Props = {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  message: string;
  /** Extra content under the message (a pill, a notice). */
  children?: ReactNode;
  /** Buttons pinned at the bottom. */
  actions: ReactNode;
  header?: ReactNode;
};

/** Full-screen outcome: success, error, waiting (account created, link expired, maintenance…). */
export function StatusScreen({ icon: Icon, tone = "brand", title, message, children, actions, header }: Props) {
  const t = tones[tone];
  return (
    <Screen header={header} footer={actions} revealContent={false}>
      <View style={styles.center}>
        <Stagger itemStyle={styles.item}>
          <View style={[styles.circle, { backgroundColor: t.bg }]}>
            <Icon size={34} color={t.fg} strokeWidth={1.75} />
          </View>
          <Text variant="displaySmall" align="center" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" color={colors.inkSoft} align="center" style={styles.message}>
            {message}
          </Text>
          {children}
        </Stagger>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  // Each revealed item spans the width and centres its content, so children
  // that stretch (notices) or centre (pills, text) both keep their layout.
  item: { alignSelf: "stretch", alignItems: "center" },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  message: { maxWidth: 320 },
});
