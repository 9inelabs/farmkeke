// The bottom navigation, in each platform's own manner (redesign, Nov 2026).
// iPhone (and the browser preview), after the owner's reference: a white bar
// whose green line springs across to the chosen tab. Android: a Material 3
// navigation bar where the chosen tab's pill grows in behind its icon. Both
// shrink a tab slightly under the finger, and iPhone adds a light tap.
// Motion follows the phone's reduce-motion setting.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Cart, Clipboard, Dashboard, Grid, Home, Orders, Shop, Sprout, User, Wallet, type IconComponent } from "@/components/icons";
import { Text } from "@/components/ui";
import { keyFeedback } from "@/lib/haptics";
import { androidUi } from "@/theme/platform";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type TabMeta = { label: string; icon: IconComponent };

const ICONS: Record<string, TabMeta> = {
  home: { label: "Home", icon: Home },
  categories: { label: "Categories", icon: Grid },
  cart: { label: "Cart", icon: Cart },
  orders: { label: "Orders", icon: Orders },
  account: { label: "Account", icon: User },
  dashboard: { label: "Dashboard", icon: Dashboard },
  sales: { label: "Orders", icon: Clipboard },
  listings: { label: "Listings", icon: Sprout },
  earnings: { label: "Earnings", icon: Wallet },
  farm: { label: "Farm", icon: Shop },
};

const SPRING = { damping: 19, stiffness: 230, mass: 0.7, reduceMotion: ReduceMotion.System } as const;

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  navigation: { emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  badges?: Partial<Record<string, number>>;
};

type TabProps = { meta: TabMeta; focused: boolean; badge: number | undefined; onPress: () => void };

export function TabBar({ state, navigation, badges = {} }: Props) {
  const routes = state.routes.filter((r) => ICONS[r.name] !== undefined);
  const active = routes.findIndex((r) => r.key === state.routes[state.index]?.key);
  const press = (route: Route, focused: boolean) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      keyFeedback();
      navigation.navigate(route.name);
    }
  };
  const tabs = routes.map((route, i) => ({ key: route.key, meta: ICONS[route.name]!, focused: i === active, badge: badges[route.name], onPress: () => press(route, i === active) }));
  return androidUi ? <MaterialBar tabs={tabs} /> : <Dock tabs={tabs} active={active} />;
}

type Tabs = (TabProps & { key: string })[];

/* ---------- iPhone: the reference bar ---------- */

// The green line over the chosen tab
const LINE = 26;

function Dock({ tabs, active }: { tabs: Tabs; active: number }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const tabWidth = tabs.length > 0 ? width / tabs.length : 0;
  const x = useSharedValue(0);
  const shown = useSharedValue(0);

  useEffect(() => {
    if (tabWidth === 0 || active < 0) return;
    const to = active * tabWidth + (tabWidth - LINE) / 2;
    // The first placement jumps; later ones spring across.
    if (shown.value === 0) {
      x.value = to;
      shown.value = 1;
    } else x.value = withSpring(to, SPRING);
  }, [active, tabWidth, x, shown]);

  const line = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom - 4, spacing.sm) }]} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.line, line]} />
      {tabs.map(({ key, ...t }) => (
        <DockTab key={key} {...t} />
      ))}
    </View>
  );
}

function DockTab({ meta, focused, badge, onPress }: TabProps) {
  const scale = useSharedValue(1);
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tint = focused ? colors.success : "rgba(26, 26, 26, 0.45)";
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${meta.label}, ${badge} items` : meta.label}
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.88, { duration: 90 }))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
      style={styles.dockTab}
    >
      <Animated.View style={[styles.dockInner, lift]}>
        <View>
          <meta.icon size={23} color={tint} variant={focused ? "solid" : "line"} />
          <Badge count={badge} ring="dock" />
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.dockLabel, { color: tint }, focused && styles.dockLabelOn]}>
          {meta.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- Android: Material 3 navigation bar ---------- */

function MaterialBar({ tabs }: { tabs: Tabs }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 }]} accessibilityRole="tablist">
      {tabs.map(({ key, ...t }) => (
        <MaterialTab key={key} {...t} />
      ))}
    </View>
  );
}

function MaterialTab({ meta, focused, badge, onPress }: TabProps) {
  const on = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, { duration: 220, reduceMotion: ReduceMotion.System });
  }, [focused, on]);
  const pill = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scaleX: 0.45 + 0.55 * on.value }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const tint = focused ? colors.forest : "rgba(26, 26, 26, 0.6)";
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${meta.label}, ${badge} items` : meta.label}
      onPress={onPress}
      onPressIn={() => (press.value = withTiming(0.88, { duration: 90 }))}
      onPressOut={() => (press.value = withSpring(1, SPRING))}
      android_ripple={{ color: "rgba(30, 59, 22, 0.10)", borderless: true, radius: 34 }}
      style={styles.tab}
    >
      <View style={styles.pillBox}>
        <Animated.View pointerEvents="none" style={[styles.pill, pill]} />
        <Animated.View style={icon}>
          <meta.icon size={22} color={tint} variant={focused ? "solid" : "line"} />
        </Animated.View>
        <Badge count={badge} ring="bar" />
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.label, { color: tint }, focused && styles.labelOn]}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function Badge({ count, ring }: { count: number | undefined; ring: "dock" | "bar" }) {
  if (count === undefined || count <= 0) return null;
  return (
    <View pointerEvents="none" style={[styles.badge, ring === "bar" && styles.badgeOnBar]}>
      <Text maxFontSizeMultiplier={1} style={styles.badgeText}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // iPhone bar
  dock: { flexDirection: "row", backgroundColor: colors.white, paddingTop: spacing.sm + 2, borderTopWidth: 1, borderTopColor: "#EEEEEE" },
  line: { position: "absolute", top: -1, left: 0, width: LINE, height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: colors.success },
  dockTab: { flex: 1, minHeight: 46 },
  dockInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  dockLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  dockLabelOn: { fontFamily: fonts.semibold },
  // Android bar
  bar: {
    flexDirection: "row",
    backgroundColor: "#F7FAF2",
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 59, 22, 0.08)",
    paddingTop: spacing.sm + 2,
  },
  tab: { flex: 1, alignItems: "center", gap: 4, minHeight: 52 },
  pillBox: { width: 60, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: "#DCEFB7" },
  label: { alignSelf: "stretch", textAlign: "center", fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  labelOn: { fontFamily: fonts.bold },
  // Count bubble on the icon's top right
  badge: {
    position: "absolute",
    top: -5,
    left: "50%",
    marginLeft: 5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOnBar: { borderColor: "#F7FAF2" },
  badgeText: { fontFamily: fonts.bold, fontSize: 9.5, lineHeight: 11, color: colors.forestDeep },
});
