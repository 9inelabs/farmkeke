import { Cart, Clipboard, Dashboard, Grid, Home, Orders, Shop, Sprout, User, Wallet, type IconComponent } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { androidUi } from "@/theme/platform";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type TabMeta = { label: string; icon: IconComponent };

// Line icons from the Home design; the chosen tab turns solid.
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

// Icons sit in a box of one height so every label lines up.
const ICON_BOX = 26;
// Inactive icons and labels, as in the Home design (Material asks for more contrast)
const INACTIVE = androidUi ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.3)";

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  navigation: { emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  badges?: Partial<Record<string, number>>;
};

/**
 * Bottom navigation from the Home design: white, with a soft shadow along
 * the top edge. The five tabs share the width equally, and the bar grows by
 * the phone's bottom inset (home indicator or system buttons). On Android it
 * follows Material: a tinted bar, and the chosen tab's icon in a soft pill.
 */
export function TabBar({ state, navigation, badges = {} }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, androidUi && styles.barAndroid, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 2 }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const meta = ICONS[route.name];
        if (meta === undefined) return null;
        const focused = state.index === index;
        const tint = focused ? colors.forest : INACTIVE;
        const badge = badges[route.name];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${meta.label}, ${badge} items` : meta.label}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
            android_ripple={androidUi ? { color: "rgba(30, 59, 22, 0.08)", borderless: true, radius: 36 } : undefined}
          >
            <View style={[styles.icon, androidUi && styles.pill, androidUi && focused && styles.pillOn]}>
              <meta.icon size={24} color={tint} variant={focused ? "solid" : "line"} />
              {badge !== undefined && badge > 0 && (
                <View style={styles.badge}>
                  <Text variant="small" color={colors.ink} maxFontSizeMultiplier={1} style={styles.badgeText}>
                    {badge > 9 ? "9+" : badge}
                  </Text>
                </View>
              )}
            </View>
            {/* Capped so a large-text setting can't push labels into each other. */}
            <Text variant="small" color={tint} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.15} style={[styles.label, androidUi && styles.labelAndroid, androidUi && focused && styles.labelOn]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingTop: spacing.sm + 2,
    boxShadow: "0px -3px 19px 0px rgba(0, 0, 0, 0.09)",
  },
  barAndroid: { backgroundColor: "#F4F7EE", boxShadow: "none", paddingTop: spacing.md },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xxs, minHeight: 44 },
  pill: { width: 56, height: 30, borderRadius: 15 },
  pillOn: { backgroundColor: "#DCEFB7" },
  labelAndroid: { fontSize: 12, lineHeight: 16 },
  labelOn: { fontFamily: fonts.semibold },
  icon: { height: ICON_BOX, alignItems: "center", justifyContent: "center" },
  label: { alignSelf: "stretch", textAlign: "center", fontFamily: fonts.medium },
  badge: {
    position: "absolute",
    top: -6,
    left: "50%",
    marginLeft: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontFamily: fonts.semibold },
});
