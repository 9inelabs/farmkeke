import { Image, type ImageSource } from "expo-image";
import { ClipboardList, LayoutDashboard, Sprout, Store, Wallet, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type TabMeta = { label: string; icon: ImageSource; size: [number, number] } | { label: string; lucide: LucideIcon };

// Shopping tabs use the designer's icons (assets/icons/tab-*@2x/@3x.png),
// tinted per state. Farmer tabs have no designed icons yet, so they use line
// icons at the same weight.
const ICONS: Record<string, TabMeta> = {
  home: { label: "Home", icon: require("../../../assets/icons/tab-home.png"), size: [18, 19] },
  categories: { label: "Categories", icon: require("../../../assets/icons/tab-categories.png"), size: [21, 21] },
  cart: { label: "Cart", icon: require("../../../assets/icons/tab-cart.png"), size: [20, 20] },
  orders: { label: "Orders", icon: require("../../../assets/icons/tab-orders.png"), size: [18, 18] },
  account: { label: "Account", icon: require("../../../assets/icons/tab-account.png"), size: [16, 21] },
  dashboard: { label: "Dashboard", lucide: LayoutDashboard },
  sales: { label: "Orders", lucide: ClipboardList },
  listings: { label: "Listings", lucide: Sprout },
  earnings: { label: "Earnings", lucide: Wallet },
  farm: { label: "Farm", lucide: Store },
};

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  navigation: { emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  badges?: Partial<Record<string, number>>;
};

/** Figma bottom navigation: Home, Categories, Cart, Orders, Account. */
export function TabBar({ state, navigation, badges = {} }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const meta = ICONS[route.name];
        if (meta === undefined) return null;
        const focused = state.index === index;
        const tint = focused ? colors.forest : colors.inkMuted;
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
          >
            <View>
              {"lucide" in meta ? (
                <meta.lucide size={21} color={tint} strokeWidth={focused ? 2.25 : 1.75} />
              ) : (
                <Image
                  source={meta.icon}
                  tintColor={tint}
                  style={{ width: meta.size[0], height: meta.size[1] }}
                  contentFit="contain"
                />
              )}
              {badge !== undefined && badge > 0 && (
                <View style={styles.badge}>
                  <Text variant="small" color={colors.forest} style={styles.badgeText}>
                    {badge > 9 ? "9+" : badge}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="small" color={tint} style={focused ? styles.labelOn : undefined}>
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
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: "center", gap: 6, minHeight: 44 },
  labelOn: { fontFamily: fonts.medium },
  badge: {
    position: "absolute",
    top: -7,
    right: -10,
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
