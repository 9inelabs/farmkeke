import { ArrowLeftRight, Bell, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { Text } from "./Text";

/** Home header: current delivery area with a change affordance. */
export function LocationChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delivery area: ${label}. Change area`}
      onPress={onPress}
      style={styles.location}
    >
      <MapPin size={18} color={colors.forest} fill={colors.forest} stroke={colors.tint} strokeWidth={2} />
      <Text variant="label" color={colors.forest} numberOfLines={1} style={styles.shrink}>
        {label}
      </Text>
      <ArrowLeftRight size={14} color={colors.forest} />
    </Pressable>
  );
}

/** Home header: notifications entry with an unread count. */
export function AlertsPill({ unread, onPress }: { unread: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
      onPress={onPress}
      style={styles.alerts}
    >
      <Bell size={16} color={colors.lime} fill={colors.lime} />
      <Text variant="label" color={colors.lime}>
        Alerts
      </Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text variant="small" color={colors.white} style={styles.badgeText}>
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  location: {
    height: 40,
    maxWidth: 220,
    borderRadius: radii.md,
    backgroundColor: colors.tint,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  shrink: { flexShrink: 1 },
  alerts: {
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    borderWidth: borders.hairline,
    borderColor: colors.tint,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, lineHeight: 13 },
});
