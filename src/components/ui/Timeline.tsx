import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "@/components/icons";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Text } from "./Text";

export type TimelineStep = { key: string; title: string; detail?: ReactNode; state: "done" | "current" | "todo" };

/** Vertical progress: done steps ticked in forest, the current one ringed in lime, the rest grey. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={s.key} style={styles.row} accessible accessibilityLabel={`${s.title}${s.state === "done" ? ", done" : s.state === "current" ? ", now" : ""}`}>
            <View style={styles.rail}>
              <View style={[styles.dot, s.state === "done" && styles.dotDone, s.state === "current" && styles.dotCurrent]}>
                {s.state === "done" ? <Check size={13} color={colors.white} strokeWidth={3} /> : null}
              </View>
              {!last && <View style={[styles.line, s.state === "done" && styles.lineDone]} />}
            </View>
            <View style={[styles.copy, !last && styles.copyGap]}>
              <Text variant="label" color={s.state === "todo" ? colors.inkMuted : colors.ink} style={s.state === "current" && styles.current}>
                {s.title}
              </Text>
              {typeof s.detail === "string" ? <Text variant="small">{s.detail}</Text> : s.detail}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 24;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  rail: { alignItems: "center", width: DOT },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.surfaceSoft, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.forest, borderColor: colors.forest },
  dotCurrent: { backgroundColor: colors.lime, borderColor: colors.tint, borderWidth: 4 },
  line: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  lineDone: { backgroundColor: colors.forest },
  copy: { flex: 1, gap: 2, paddingTop: 2 },
  copyGap: { paddingBottom: spacing.lg },
  current: { fontFamily: fonts.semibold },
});
