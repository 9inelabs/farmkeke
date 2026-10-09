// M-S4 Update required and M-S5 Maintenance. Wraps the whole app and reads
// the status staff set with admin/platform:setAppStatus.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import Constants from "expo-constants";
import { Download, Lock, RefreshCw, Wrench } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Notice, StatusScreen, Text, Wordmark } from "@/components/ui";
import { formatTime } from "@/lib/hours";
import { isOlder } from "@/lib/version";
import { spacing } from "@/theme/tokens";

export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";


export function AppGate({ children }: { children: ReactNode }) {
  const config = useQuery(api.appConfig.get);
  // Never block the app while the status loads or when offline.
  if (config === undefined) return children;
  if (config.maintenanceActive) {
    return <Maintenance message={config.maintenanceMessage} until={config.maintenanceUntil} />;
  }
  if (isOlder(APP_VERSION, config.minAppVersion)) {
    const storeUrl = Platform.OS === "ios" ? config.iosStoreUrl : config.androidStoreUrl;
    return <UpdateRequired latest={config.latestAppVersion} storeUrl={storeUrl} />;
  }
  return children;
}

function UpdateRequired({ latest, storeUrl }: { latest: string; storeUrl?: string }) {
  return (
    <StatusScreen
      icon={Download}
      title="Update Farmkeke to keep shopping"
      message="This version is too old to place orders safely. The update takes about a minute, and your cart is kept."
      actions={
        <Button
          label="Update now"
          icon={Download}
          fullWidth
          disabled={storeUrl === undefined}
          onPress={() => storeUrl && void Linking.openURL(storeUrl)}
        />
      }
    >
      <Text variant="small" align="center">
        You have {APP_VERSION} · Latest is {latest}
      </Text>
    </StatusScreen>
  );
}

function Maintenance({ message, until }: { message?: string; until?: number }) {
  const [checking, setChecking] = useState(false);
  const back = until
    ? `until about ${formatTime(new Date(until).toTimeString().slice(0, 5))}${isToday(until) ? " today" : ""}`
    : "for a short while";
  return (
    <StatusScreen
      icon={Wrench}
      tone="pending"
      title="We're tidying up the market"
      message={message ?? `Farmkeke is down for planned maintenance ${back}.`}
      actions={
        <Button
          label="Check again"
          icon={RefreshCw}
          variant="outline"
          fullWidth
          loading={checking}
          // The status is live; this just reassures while it refreshes.
          onPress={() => {
            setChecking(true);
            setTimeout(() => setChecking(false), 1200);
          }}
        />
      }
    >
      <View style={styles.notice}>
        <Notice icon={Lock}>Your orders and any money we're holding are safe.</Notice>
      </View>
      <View style={styles.mark}>
        <Wordmark width={96} />
      </View>
    </StatusScreen>
  );
}

const isToday = (ms: number) => new Date(ms).toDateString() === new Date().toDateString();

const styles = StyleSheet.create({
  notice: { alignSelf: "stretch", marginTop: spacing.md },
  mark: { marginTop: spacing.xxl, opacity: 0.8 },
});
