import { useNetInfo } from "@react-native-community/netinfo";
import { Offline } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Text } from "./Text";

/** True only when the phone reports it has no connection (unknown counts as online). */
export function useIsOffline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected === false || isInternetReachable === false;
}

/** M-S1: banner over screens that still show saved content. */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Offline size={16} color={colors.white} />
      <Text variant="label" color={colors.white}>
        You're offline. Showing saved items.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink,
  },
});
