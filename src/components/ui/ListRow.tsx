import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type RowProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  /** Shown instead of the chevron. */
  trailing?: ReactNode;
};

/** Settings row: tinted icon square, title, optional subtitle, chevron. */
export function ListRow({ icon: Icon, title, subtitle, onPress, tone = "default", trailing }: RowProps) {
  const danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: danger ? colors.errorSoft : colors.tint }]}>
        <Icon size={18} color={danger ? colors.error : colors.forest} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <Text variant="bodyMedium" color={danger ? colors.error : colors.ink}>
          {title}
        </Text>
        {subtitle !== undefined && <Text variant="small">{subtitle}</Text>}
      </View>
      {trailing ?? (!danger && <ChevronRight size={18} color={colors.inkMuted} />)}
    </Pressable>
  );
}

/** Rounded group of rows with hairline dividers, and an optional overline title. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupWrap}>
      {title !== undefined && <Text variant="overline">{title}</Text>}
      <View style={styles.group}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 && <View style={styles.divider} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  icon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  groupWrap: { gap: spacing.sm },
  group: {
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  divider: { height: borders.hairline, backgroundColor: colors.line, marginLeft: 60 },
});
