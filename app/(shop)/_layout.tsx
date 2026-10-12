import { Tabs } from "expo-router";
import { View } from "react-native";
import { OfflineBanner } from "@/components/ui";
import { TabBar } from "@/features/shell/TabBar";
import { tabTransition } from "@/theme/navigation";
import { colors } from "@/theme/tokens";

export default function ShopTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.white }, ...tabTransition }}
        tabBar={(props) => (
          <>
            <OfflineBanner />
            <TabBar state={props.state} navigation={props.navigation} />
          </>
        )}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="categories" />
        <Tabs.Screen name="cart" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="account" />
      </Tabs>
    </View>
  );
}
