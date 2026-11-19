import { ChevronRight, type IconComponent } from "@/components/icons";
import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { androidUi, ripple } from "@/theme/platform";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Text } from "./Text";

type RowProps = {
  icon: IconComponent;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  /** Shown before the chevron (an avatar, a count). */
  trailing?: ReactNode;
};

/** Settings row: the icon in a soft green square, title, optional subtitle, chevron. */
export function ListRow({ icon: Icon, title, subtitle, onPress, tone = "default", trailing }: RowProps) {
  const danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      android_ripple={ripple}
      style={({ pressed }) => [styles.row, pressed && !androidUi && styles.pressed]}
    >
      <View style={[styles.icon, danger && styles.iconDanger]}>
        <Icon size={17} color={danger ? colors.error : colors.forest} />
      </View>
      <View style={styles.copy}>
        <Text variant="body" color={danger ? colors.error : colors.ink} numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text variant="small" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing}
      {!danger && <ChevronRight size={15} color={colors.inkMuted} />}
    </Pressable>
  );
}

/**
 * A rounded card of rows under a small grey label. Grey on white screens
 * (the Settings & Support design); `tone="white"` on grey screens.
 */
export function ListGroup({ title, children, tone = "grey", badge }: { title?: string; children: ReactNode; tone?: "grey" | "white"; badge?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupWrap}>
      {title !== undefined && (
        <View style={styles.label}>
          <Text variant="small" color={colors.inkMuted} style={styles.labelText}>
            {title}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text variant="small" color={colors.white} style={styles.badgeText}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      )}
      <View style={[styles.group, tone === "white" && styles.groupWhite]}>
        {rows.map((row, i) => (
          // A crisp line between rows, starting after the icon
          <View key={i} style={i > 0 && styles.divider}>
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md + 2, minHeight: 54, paddingVertical: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  iconDanger: { backgroundColor: colors.errorSoft },
  divider: { borderTopWidth: borders.hairline, borderTopColor: "#F0F1EE", marginLeft: spacing.md + 2 + 34 + spacing.md },
  pressed: { backgroundColor: "rgba(0,0,0,0.035)" },
  copy: { flex: 1, gap: 1 },
  title: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  groupWrap: { gap: spacing.sm },
  label: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: 2 },
  labelText: { fontFamily: fonts.medium },
  badge: { backgroundColor: colors.danger, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 1 },
  badgeText: { fontSize: 10, lineHeight: 14, fontFamily: fonts.semibold },
  group: { borderRadius: radii.lg + 2, backgroundColor: colors.surfaceSoft, overflow: "hidden", paddingVertical: 2 },
  groupWhite: { backgroundColor: colors.white },
});
