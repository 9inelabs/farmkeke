import { useNetInfo } from "@react-native-community/netinfo";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { Offline } from "@/components/icons";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Text } from "./Text";

// How long a first connection may take before we say the backend can't be reached
const FIRST_CONNECT_MS = 10_000;

/**
 * True when the phone is online but the app can't reach Farmkeke's backend:
 * the connection keeps failing (wrong server address, server down, a network
 * that blocks it). Without this, screens wait on skeletons forever.
 */
export function useBackendUnreachable(): boolean {
  const convex = useConvex();
  const [down, setDown] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const check = () => {
      const c = convex.connectionState();
      const failing = !c.isWebSocketConnected && (c.connectionRetries >= 3 || (!c.hasEverConnected && Date.now() - started > FIRST_CONNECT_MS));
      setDown(failing);
    };
    const unsubscribe = convex.subscribeToConnectionState(check);
    const timer = setInterval(check, 2000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [convex]);
  return down;
}

/** No connection on the phone (unknown counts as online). */
function usePhoneOffline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected === false || isInternetReachable === false;
}

/** True when content can't load: the phone has no connection, or Farmkeke can't be reached. */
export function useIsOffline(): boolean {
  const phone = usePhoneOffline();
  const backend = useBackendUnreachable();
  return phone || backend;
}

/** M-S1: banner over screens that still show saved content. */
export function OfflineBanner() {
  const phone = usePhoneOffline();
  const backend = useBackendUnreachable();
  if (!phone && !backend) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Offline size={16} color={colors.white} />
      <Text variant="label" color={colors.white} style={styles.text}>
        {phone ? "You're offline. Showing saved items." : "We can't reach Farmkeke right now. Retrying…"}
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
  text: { flex: 1 },
});
