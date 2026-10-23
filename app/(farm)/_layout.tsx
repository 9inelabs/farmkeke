// Farmer mode tabs: Dashboard, Orders, Listings, Earnings, Farm.
// Only approved farmers get here; suspended farms see F-15 instead.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect, Tabs } from "expo-router";
import { Ban, Basket, Mail } from "@/components/icons";
import { useEffect } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { Button, OfflineBanner, StatusScreen } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/content/help";
import { useSwitchMode } from "@/features/farmer/useSwitchMode";
import { TabBar } from "@/features/shell/TabBar";
import { usePrefs } from "@/store/prefs";
import { tabTransition } from "@/theme/navigation";
import { colors } from "@/theme/tokens";

export default function FarmTabs() {
  const farm = useQuery(api.farms.mine);
  const counts = useQuery(api.orders.farmer.counts, farm ? {} : "skip");
  const setMode = usePrefs((s) => s.setMode);
  const switchMode = useSwitchMode();

  useEffect(() => {
    if (farm === null) setMode("shop");
  }, [farm, setMode]);

  if (farm === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }
  if (farm === null) return <Redirect href="/home" />;

  if (farm.status === "suspended") {
    // F-15 Farmer mode suspended
    return (
      <StatusScreen
        icon={Ban}
        tone="error"
        title="Selling is paused"
        message={farm.suspendedReason ?? "Farmkeke has paused selling on your farm."}
        actions={
          <>
            <Button label="Contact support" icon={Mail} fullWidth onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Farm paused: ${farm.name}`)}`)} />
            <Button label="Switch to shopping" icon={Basket} variant="ghost" fullWidth onPress={() => switchMode("shop")} />
          </>
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas }, ...tabTransition }}
        tabBar={(props) => (
          <>
            <OfflineBanner />
            <TabBar state={props.state} navigation={props.navigation} badges={{ sales: counts?.new }} />
          </>
        )}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="sales" />
        <Tabs.Screen name="listings" />
        <Tabs.Screen name="earnings" />
        <Tabs.Screen name="farm" />
      </Tabs>
    </View>
  );
}
