// Preview only: the same Farmkeke screens drawn the iPhone way and the
// Android way, side by side, to decide on platform-specific touches before
// building them. /dev/platforms?s=home | settings | dialog &os=ios | android
// (one phone per page: the web preview is one phone wide)
import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Bell, ChevronLeft, Grid, Home, Lock, Orders, Cart, User, type IconComponent } from "@/components/icons";
import { ListGroup, ListRow, Text } from "@/components/ui";
import { HomeView, type HomeProduct } from "@/features/home/HomeView";
import { TabBar } from "@/features/shell/TabBar";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type OS = "ios" | "android";
const noop = () => {};

const PRODUCTS: HomeProduct[] = [
  { id: "1", name: "Fresh tomatoes", priceKobo: 4_500_00, unit: "basket", imageUrl: null },
  { id: "2", name: "Yam tubers", priceKobo: 5_500_00, unit: "tuber", imageUrl: null },
  { id: "3", name: "Oshombo Pepper", priceKobo: 6_000_00, unit: "basket", imageUrl: null },
];
const CATEGORIES = [
  { id: "1", name: "Vegetables", illustration: "vegetables" },
  { id: "2", name: "Fruits", illustration: "fruits" },
  { id: "3", name: "Grains & Tubers", illustration: "grains-tubers" },
  { id: "4", name: "Poultry & Eggs", illustration: "poultry-eggs" },
  { id: "5", name: "Meat & Fish", illustration: "meat-fish" },
];
const FARMS = [
  { id: "1", name: "Okafor Farms", area: "New Owerri", photoUrl: null },
  { id: "2", name: "Adigun F.", area: "Orji", photoUrl: null },
  { id: "3", name: "Bello Harvest", area: "Mbaise", photoUrl: null },
  { id: "4", name: "Ada Greens", area: "Mbano", photoUrl: null },
];
const ROUTES = ["home", "categories", "cart", "orders", "account"].map((name) => ({ key: name, name }));

// ---------------------------------------------------------------------------
// Phone chrome

function StatusBar({ os }: { os: OS }) {
  const ios = os === "ios";
  return (
    <View style={[styles.status, ios ? styles.statusIos : styles.statusAndroid]}>
      <Text style={[styles.clock, ios ? styles.clockIos : styles.clockAndroid]}>9:41</Text>
      {ios ? <View style={styles.island} /> : <View style={styles.punch} />}
      <Svg width={ios ? 70 : 58} height={14} viewBox="0 0 70 14">
        {/* signal */}
        {[0, 1, 2, 3].map((i) => (
          <Rect key={i} x={i * 5} y={10 - i * 3} width={3.4} height={4 + i * 3} rx={1} fill={colors.ink} />
        ))}
        {/* wifi */}
        <Path d="M30 5.5a10 10 0 0 1 13 0M32.3 8a6.5 6.5 0 0 1 8.4 0M34.6 10.5a3 3 0 0 1 3.8 0" stroke={colors.ink} strokeWidth={1.8} strokeLinecap="round" fill="none" />
        <Rect x={36} y={12} width={1} height={1} fill={colors.ink} />
        {/* battery */}
        <Rect x={48} y={2} width={ios ? 20 : 11} height={ios ? 10 : 12} rx={ios ? 3 : 2} stroke={colors.ink} strokeWidth={1} fill="none" />
        <Rect x={49.5} y={3.5} width={ios ? 13 : 8} height={ios ? 7 : 9} rx={ios ? 1.5 : 1} fill={colors.ink} />
      </Svg>
    </View>
  );
}

function HomeIndicator({ os }: { os: OS }) {
  return (
    <View style={[styles.homeBar, os === "android" && styles.homeBarAndroid]}>
      <View style={[styles.homePill, os === "android" && styles.homePillAndroid]} />
    </View>
  );
}

function Phone({ os, children, overlay }: { os: OS; children: ReactNode; overlay?: ReactNode }) {
  return (
    <View nativeID="phone" style={[styles.screen, os === "ios" ? styles.screenIos : styles.screenAndroid]}>
      <StatusBar os={os} />
      <View style={styles.flex}>{children}</View>
      <HomeIndicator os={os} />
      {overlay}
    </View>
  );
}

/** A settings row with a switch on the right (no arrow). */
function ToggleRow({ os, title, subtitle, on }: { os: OS; title: string; subtitle: string; on: boolean }) {
  return (
    <View style={styles.toggleRow}>
      <Bell size={20} color={colors.inkSoft} />
      <View style={styles.flex}>
        <Text variant="body">{title}</Text>
        <Text variant="small" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Toggle os={os} on={on} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// The Android (Material) versions of the shared pieces

const ArrowBack = ({ size = 24, color = colors.ink }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 12H5M11 5l-7 7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const TABS: { name: string; label: string; icon: IconComponent }[] = [
  { name: "home", label: "Home", icon: Home },
  { name: "categories", label: "Categories", icon: Grid },
  { name: "cart", label: "Cart", icon: Cart },
  { name: "orders", label: "Orders", icon: Orders },
  { name: "account", label: "Account", icon: User },
];

/** Material 3 navigation bar: the chosen tab's icon sits in a soft pill. */
function AndroidTabBar({ active = "home", cart = 3 }: { active?: string; cart?: number }) {
  return (
    <View style={styles.mBar}>
      {TABS.map((t) => {
        const on = t.name === active;
        return (
          <View key={t.name} style={styles.mTab}>
            <View style={[styles.mPill, on && styles.mPillOn]}>
              <t.icon size={22} color={on ? colors.forest : "rgba(0,0,0,0.55)"} variant={on ? "solid" : "line"} />
              {t.name === "cart" && cart > 0 ? (
                <View style={styles.mBadge}>
                  <Text style={styles.mBadgeText}>{cart}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.mLabel, on && styles.mLabelOn]}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Header({ os, title }: { os: OS; title: string }) {
  if (os === "ios") {
    return (
      <View style={styles.header}>
        <ChevronLeft size={20} color={colors.ink} strokeWidth={2.2} />
        <Text variant="backTitle">{title}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.header, styles.headerAndroid]}>
      <ArrowBack />
      <Text style={styles.titleAndroid}>{title}</Text>
    </View>
  );
}

/** iOS switch: a round thumb on a pill. */
function IosSwitch({ on }: { on: boolean }) {
  return (
    <View style={[styles.iSwitch, on && styles.iSwitchOn]}>
      <View style={[styles.iThumb, on && styles.iThumbOn]} />
    </View>
  );
}

/** Material 3 switch: outlined when off; filled with a tick in the thumb when on. */
function AndroidSwitch({ on }: { on: boolean }) {
  return (
    <View style={[styles.aSwitch, on ? styles.aSwitchOn : styles.aSwitchOff]}>
      <View style={[styles.aThumb, on ? styles.aThumbOn : styles.aThumbOff]}>
        {on ? (
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.forest} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const Toggle = ({ os, on }: { os: OS; on: boolean }) => (os === "ios" ? <IosSwitch on={on} /> : <AndroidSwitch on={on} />);

// ---------------------------------------------------------------------------
// The screens

function HomeScreen({ os }: { os: OS }) {
  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        <HomeView
          greeting="Good Morning, Franklyn"
          unreadAlerts={2}
          onAlerts={() => {}}
          areaLabel="New Owerri, Imo"
          categories={CATEGORIES}
          freshPicks={PRODUCTS}
          pickedToday={PRODUCTS}
          banner={{ tag: "Harvest of the week", title: "New-Season yam from Okigwe", subtitle: "From ₦3,200 per tuber • Bello Harvest", buttonLabel: "Shop Yam", imageUrl: null }}
          farms={FARMS}
          onChangeArea={() => {}}
          onSeeAllFresh={() => {}}
          onSeeAllPicked={() => {}}
        />
      </View>
      {os === "ios" ? (
        <View style={styles.iosTabs}>
          <TabBar state={{ index: 0, routes: ROUTES }} navigation={{ emit: () => ({ defaultPrevented: true }), navigate: () => {} }} badges={{ cart: 3 }} />
          {/* A real iPhone adds this space for the home indicator */}
          <View style={styles.iosInset} />
        </View>
      ) : (
        <AndroidTabBar />
      )}
    </View>
  );
}

function SettingsScreen({ os, pressed }: { os: OS; pressed?: boolean }) {
  return (
    <View style={[styles.flex, styles.page]}>
      <Header os={os} title="Notifications" />
      <View style={styles.body}>
        <ListGroup title="Alerts" tone="white">
          <ToggleRow os={os} title="Order updates" subtitle="Accepted, on its way, ready" on />
          <ToggleRow os={os} title="Messages from farms" subtitle="Replies about your order" on />
          <ToggleRow os={os} title="Offers and news" subtitle="Seasonal picks" on={false} />
        </ListGroup>
        <ListGroup title="Account" tone="white">
          <View>
            <ListRow onPress={noop} icon={Lock} title="Password" subtitle="Changed 2 months ago" />
            {pressed ? (
              os === "android" ? (
                // A ripple spreading from the finger
                <View pointerEvents="none" style={styles.rippleClip}>
                  <View style={styles.ripple} />
                </View>
              ) : (
                <View pointerEvents="none" style={styles.iosPressed} />
              )
            ) : null}
          </View>
          <ListRow onPress={noop} icon={User} title="Personal details" subtitle="Name, phone and email" />
        </ListGroup>
        {pressed ? (
          <Text variant="small" align="center" color={colors.inkMuted}>
            {os === "android" ? "Pressing a row: a ripple spreads from your finger" : "Pressing a row: it dims while held"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Dialog({ os }: { os: OS }) {
  if (os === "ios") {
    return (
      <View style={styles.scrim}>
        <View style={styles.iAlert}>
          <View style={styles.iAlertBody}>
            <Text style={styles.iAlertTitle}>Remove from cart?</Text>
            <Text style={styles.iAlertText}>Fresh tomatoes (1 basket) will be taken out of your cart.</Text>
          </View>
          <View style={styles.iAlertButtons}>
            <View style={styles.iAlertButton}>
              <Text style={styles.iAlertCancel}>Cancel</Text>
            </View>
            <View style={[styles.iAlertButton, styles.iAlertDivider]}>
              <Text style={styles.iAlertDestructive}>Remove</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.scrim}>
      <View style={styles.mDialog}>
        <Text style={styles.mDialogTitle}>Remove from cart?</Text>
        <Text style={styles.mDialogText}>Fresh tomatoes (1 basket) will be taken out of your cart.</Text>
        <View style={styles.mDialogButtons}>
          <Text style={styles.mDialogButton}>Cancel</Text>
          <Text style={[styles.mDialogButton, styles.mDialogDestructive]}>Remove</Text>
        </View>
      </View>
    </View>
  );
}

export default function PlatformsPreview() {
  const { s = "home", os = "ios" } = useLocalSearchParams<{ s?: string; os?: OS }>();
  const render = (os: OS) =>
    s === "settings" ? (
      <Phone os={os}>
        <SettingsScreen os={os} pressed />
      </Phone>
    ) : s === "dialog" ? (
      <Phone os={os} overlay={<Dialog os={os} />}>
        <SettingsScreen os={os} />
      </Phone>
    ) : (
      <Phone os={os}>
        <HomeScreen os={os} />
      </Phone>
    );
  return <View style={styles.stage}>{render(os === "android" ? "android" : "ios")}</View>;
}

const W = 390;
const H = 844;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { flex: 1, alignItems: "center", paddingTop: 20, backgroundColor: "#E4E7DF" },
  iosTabs: { backgroundColor: colors.white },
  iosInset: { height: 22, backgroundColor: colors.white },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 60, paddingVertical: spacing.sm },
  screen: { width: W, height: H, backgroundColor: colors.white, overflow: "hidden" },
  screenIos: { borderRadius: 48 },
  screenAndroid: { borderRadius: 30 },
  page: { backgroundColor: colors.canvas },

  status: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white },
  statusIos: { height: 54, paddingHorizontal: 34, paddingTop: 6 },
  statusAndroid: { height: 36, paddingHorizontal: 22 },
  clock: { color: colors.ink },
  clockIos: { fontFamily: fonts.semibold, fontSize: 16 },
  clockAndroid: { fontFamily: fonts.medium, fontSize: 14 },
  island: { position: "absolute", left: (W - 124) / 2, top: 11, width: 124, height: 35, borderRadius: 18, backgroundColor: "#000" },
  punch: { position: "absolute", left: W / 2 - 7, top: 11, width: 14, height: 14, borderRadius: 7, backgroundColor: "#000" },
  homeBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 22, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  homeBarAndroid: { height: 16, paddingBottom: 6 },
  homePill: { width: 134, height: 5, borderRadius: 3, backgroundColor: "#111" },
  homePillAndroid: { width: 100, height: 4, backgroundColor: "#555" },

  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.screen, paddingVertical: spacing.md, minHeight: 56, backgroundColor: colors.canvas },
  headerAndroid: { gap: 20, paddingHorizontal: 16, minHeight: 64 },
  titleAndroid: { fontFamily: fonts.semibold, fontSize: 21, color: colors.ink },
  body: { paddingHorizontal: spacing.screen, gap: spacing.lg, paddingTop: spacing.sm },

  mBar: { flexDirection: "row", height: 92, paddingTop: 12, paddingBottom: 28, backgroundColor: "#F6F8F1", marginBottom: 0 },
  mTab: { flex: 1, alignItems: "center", gap: 4 },
  mPill: { width: 60, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  mPillOn: { backgroundColor: "#DCEFB7" },
  mLabel: { fontFamily: fonts.medium, fontSize: 12, color: "rgba(0,0,0,0.6)" },
  mLabelOn: { fontFamily: fonts.semibold, color: colors.forest },
  mBadge: { position: "absolute", top: 2, left: 34, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  mBadgeText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.ink },

  iSwitch: { width: 51, height: 31, borderRadius: 16, backgroundColor: "#E5E5EA", padding: 2 },
  iSwitchOn: { backgroundColor: colors.lime },
  iThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.white, boxShadow: "0px 2px 4px rgba(0,0,0,0.2)" },
  iThumbOn: { transform: [{ translateX: 20 }] },
  aSwitch: { width: 52, height: 32, borderRadius: 16, justifyContent: "center", paddingHorizontal: 4, borderWidth: 2 },
  aSwitchOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  aSwitchOff: { backgroundColor: "#EEF0EA", borderColor: "#74796E" },
  aThumb: { borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aThumbOn: { width: 24, height: 24, backgroundColor: colors.lime, transform: [{ translateX: 18 }] },
  aThumbOff: { width: 16, height: 16, backgroundColor: "#74796E", marginLeft: 2 },

  rippleClip: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", borderRadius: 14 },
  ripple: { position: "absolute", width: 300, height: 300, borderRadius: 150, left: 30, top: -120, backgroundColor: "rgba(30,59,22,0.10)" },
  iosPressed: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 14 },

  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.38)", alignItems: "center", justifyContent: "center" },
  iAlert: { width: 270, borderRadius: 14, backgroundColor: "rgba(246,246,246,0.97)", overflow: "hidden" },
  iAlertBody: { paddingHorizontal: 16, paddingTop: 19, paddingBottom: 16, gap: 4, alignItems: "center" },
  iAlertTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, textAlign: "center" },
  iAlertText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink, textAlign: "center" },
  iAlertButtons: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.36)" },
  iAlertButton: { flex: 1, height: 44, alignItems: "center", justifyContent: "center" },
  iAlertDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(60,60,67,0.36)" },
  iAlertCancel: { fontFamily: fonts.regular, fontSize: 17, color: colors.forest },
  iAlertDestructive: { fontFamily: fonts.semibold, fontSize: 17, color: colors.error },
  mDialog: { width: 312, borderRadius: 28, backgroundColor: "#F3F6EC", padding: 24, gap: 16 },
  mDialogTitle: { fontFamily: fonts.regular, fontSize: 24, lineHeight: 32, color: colors.ink },
  mDialogText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: "#44483F" },
  mDialogButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 24, paddingTop: 8 },
  mDialogButton: { fontFamily: fonts.semibold, fontSize: 14, color: colors.forest },
  mDialogDestructive: { color: colors.error },
});
