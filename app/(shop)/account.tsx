// M-80 Account (signed in) and M-81 Account (guest), with M-94 Sign out.
// Premium redesign (Nov 2026): a deep green header (your profile and quick
// links, or the sign-in buttons for guests), the settings and help groups
// in white cards, and Sell on Farmkeke as a dark card.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Bell,
  Book,
  Document,
  Edit,
  Grid,
  Headphone,
  Heart,
  Help,
  Info,
  Key,
  Logout,
  Messages,
  Orders,
  Pin,
  Refresh,
  Trash,
  User,
  type IconComponent,
} from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop, Glass } from "@/components/premium";
import { BottomSheet, Button, ListGroup, ListRow, Skeleton, Text, Wordmark } from "@/components/ui";
import { initials } from "@/components/ui/Avatar";
import { SellingEntry } from "@/features/farmer/SellingEntry";
import { APP_VERSION } from "@/features/system/AppGate";
import { useSignOut } from "@/lib/session";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useLightStatusBar } from "@/theme/useLightStatusBar";

export default function Account() {
  useLightStatusBar();
  const viewer = useQuery(api.users.viewer);
  const addresses = useQuery(api.addresses.list);
  const signOut = useSignOut();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const signedIn = viewer !== undefined && viewer !== null && !viewer.isGuest;

  if (viewer === undefined) {
    return (
      <View style={styles.screen}>
        <Header>
          <View style={styles.loadingHead}>
            <View style={styles.loadingBar} />
            <View style={[styles.loadingBar, styles.loadingBarShort]} />
          </View>
        </Header>
        <View style={styles.content}>
          <Skeleton height={230} radius={radii.lg + 2} />
          <Skeleton height={120} radius={radii.lg + 2} />
        </View>
      </View>
    );
  }
  if (!signedIn) return <GuestAccount />;
  return (
    <>
      <SignedInAccount viewer={viewer} addresses={addresses?.length} onSignOut={() => setConfirmSignOut(true)} />
      <SignOutSheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} onConfirm={() => void signOut()} />
    </>
  );
}

/** The deep green top of both versions. */
function Header({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <ForestBackdrop />
      {children}
    </View>
  );
}

/** A frosted shortcut in the header: an icon, a label and an optional figure. */
function QuickTile({ icon: Icon, label, value, onPress }: { icon: IconComponent; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <View style={styles.tileIcon}>
        <Icon size={17} color={colors.lime} />
      </View>
      <Text numberOfLines={1} style={styles.tileLabel}>
        {label}
      </Text>
      {value !== undefined ? <Text style={styles.tileValue}>{value}</Text> : null}
    </Pressable>
  );
}

/** M-80. Also drawn by /dev/account. */
export function SignedInAccount({ viewer, addresses, onSignOut }: { viewer: { name: string | null; email: string | null; phone: string | null }; addresses: number | undefined; onSignOut: () => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Header>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(viewer.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
              {viewer.name ?? "Your account"}
            </Text>
            <Text numberOfLines={1} style={styles.contact}>
              {viewer.email ?? viewer.phone ?? ""}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" hitSlop={6} onPress={() => router.push("/settings/edit-profile")}>
            <Glass style={styles.edit}>
              <Edit size={16} color={colors.white} />
            </Glass>
          </Pressable>
        </View>
        <View style={styles.tiles}>
          <QuickTile icon={Orders} label="Orders" onPress={() => router.navigate("/orders")} />
          <QuickTile icon={Heart} label="Saved" onPress={() => router.push("/saved")} />
          <QuickTile icon={Pin} label="Addresses" value={addresses !== undefined ? String(addresses) : undefined} onPress={() => router.push("/settings/addresses")} />
        </View>
      </Header>

      <View style={styles.content}>
        <Stagger>
          <ListGroup title="Settings" tone="white">
            <ListRow icon={User} title="Profile" subtitle="Name, email and phone" onPress={() => router.push("/settings/edit-profile")} />
            <ListRow icon={Key} title="Login details" subtitle="Password and sign-in" onPress={() => router.push("/settings/login-details")} />
            <ListRow icon={Bell} title="Notifications" subtitle="What we tell you about" onPress={() => router.push("/settings/notifications")} />
          </ListGroup>

          <ListGroup title="Selling" tone="white">
            <SellingEntry />
          </ListGroup>

          <ListGroup title="Help and support" tone="white">
            <ListRow icon={Messages} title="Messages" subtitle="Your chats with farmers" onPress={() => router.push("/messages")} />
            <ListRow icon={Headphone} title="Contact support" subtitle="We reply within a few hours" onPress={() => router.push("/support")} />
            <ListRow icon={Help} title="Help and FAQ" onPress={() => router.push("/help")} />
            <ListRow icon={Book} title="How Farmkeke works" onPress={() => router.push("/how-it-works")} />
          </ListGroup>

          <ListGroup title="App" tone="white">
            <ListRow icon={Refresh} title="About and updates" trailing={<Text variant="small">v{APP_VERSION}</Text>} onPress={() => router.push("/about")} />
            <ListRow icon={Document} title="Terms and policies" onPress={() => router.push("/legal")} />
            {__DEV__ ? <ListRow icon={Grid} title="Component gallery" onPress={() => router.push("/dev/gallery")} /> : null}
          </ListGroup>

          <ListGroup tone="white">
            <ListRow icon={Logout} title="Sign out" tone="danger" onPress={onSignOut} />
            <ListRow icon={Trash} title="Delete account" tone="danger" onPress={() => router.push("/settings/delete-account")} />
          </ListGroup>
        </Stagger>
      </View>
    </ScrollView>
  );
}

function SignOutSheet({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="heading">Sign out of Farmkeke?</Text>
      <Text variant="caption">Your orders and saved addresses stay in your account. You can still shop as a guest.</Text>
      <Button
        label="Sign out"
        icon={Logout}
        variant="danger"
        fullWidth
        onPress={() => {
          onClose();
          onConfirm();
        }}
      />
      <Button label="Stay signed in" variant="ghost" fullWidth onPress={onClose} />
    </BottomSheet>
  );
}

/** M-81: sign in from the header, help rows, and Sell on Farmkeke. */
function GuestAccount() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Header>
        <View style={styles.guestCopy}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text accessibilityRole="header" style={styles.guestTitle}>
            You're shopping as a guest
          </Text>
          <Text style={styles.guestNote}>Sign in for a faster checkout, saved addresses and every order in one place.</Text>
        </View>
        <View style={styles.guestButtons}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} style={({ pressed }) => [styles.guestBtn, styles.signIn, pressed && styles.pressed]}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/create-account")} style={({ pressed }) => [styles.guestBtn, styles.create, pressed && styles.pressed]}>
            <Text style={styles.createText}>Create account</Text>
          </Pressable>
        </View>
      </Header>

      <View style={styles.content}>
        <Stagger>
          <ListGroup title="Help and support" tone="white">
            <ListRow icon={Messages} title="Messages" subtitle="Your chats with farmers about orders" onPress={() => router.push("/messages")} />
            <ListRow icon={Headphone} title="Contact support" subtitle="Message the Farmkeke team" onPress={() => router.push("/support")} />
            <ListRow icon={Help} title="Help and FAQ" subtitle="Orders, delivery and payment" onPress={() => router.push("/help")} />
            <ListRow icon={Book} title="How Farmkeke works" subtitle="Ordering, pickup and buyer protection" onPress={() => router.push("/how-it-works")} />
          </ListGroup>

          <ListGroup title="App" tone="white">
            <ListRow icon={Document} title="Terms and policies" subtitle="Terms, privacy, refunds and disputes" onPress={() => router.push("/legal")} />
            <ListRow icon={Info} title="About Farmkeke" subtitle={`App version ${APP_VERSION}`} onPress={() => router.push("/about")} />
          </ListGroup>

          <View style={styles.sell}>
            <ForestBackdrop grid={false} glow="left" />
            <View style={styles.sellRow}>
              <Text style={styles.sellOn}>Sell on</Text>
              <Wordmark width={92} tone="light" />
            </View>
            <Text style={styles.sellNote}>Reach households beyond your area. Our riders collect from your farm gate, and Paystack pays your share straight to your bank.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/sell")} style={({ pressed }) => [styles.sellBtn, pressed && styles.pressed]}>
              <Text style={styles.sellBtnText}>Apply as a farmer</Text>
              <ArrowRight size={16} color={colors.forestDeep} />
            </Pressable>
            <View style={styles.sellLinks}>
              <Text style={styles.sellLink} accessibilityRole="link" onPress={() => router.push("/sell/login")}>
                Already a farmer? <Text style={styles.sellLinkStrong}>Log in</Text>
              </Text>
              <Text style={styles.sellLink} accessibilityRole="link" onPress={() => router.push("/farm-settings/terms")}>
                Terms apply
              </Text>
            </View>
          </View>
        </Stagger>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxxl },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  // Header
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", gap: spacing.lg },
  loadingHead: { gap: spacing.sm, paddingVertical: spacing.sm },
  loadingBar: { width: 180, height: 20, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)" },
  loadingBarShort: { width: 120, height: 12 },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(169, 214, 84, 0.16)",
    borderWidth: borders.strong,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.lime },
  name: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, color: colors.white },
  contact: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.onForest },
  edit: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    borderRadius: 15,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: borders.hairline,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tilePressed: { backgroundColor: "rgba(255,255,255,0.16)" },
  tileIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(169, 214, 84, 0.14)", alignItems: "center", justifyContent: "center" },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.white },
  tileValue: { position: "absolute", top: spacing.md, right: spacing.md, fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 19, color: colors.white },
  guestCopy: { gap: 4 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase", color: colors.lime },
  guestTitle: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5, color: colors.white },
  guestNote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.onForest },
  guestButtons: { flexDirection: "row", gap: spacing.sm },
  guestBtn: { flex: 1, height: 46, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  signIn: { backgroundColor: colors.lime },
  signInText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.forestDeep },
  create: { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: borders.hairline, borderColor: "rgba(255,255,255,0.22)" },
  createText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.white },
  // Body
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, gap: spacing.xl },
  sell: { borderRadius: 20, overflow: "hidden", backgroundColor: colors.forestDeep, padding: spacing.lg + 2, gap: spacing.md },
  sellRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  sellOn: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, color: colors.white },
  sellNote: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.onForest },
  sellBtn: { height: 46, borderRadius: radii.pill, backgroundColor: colors.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  sellBtnText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.forestDeep },
  sellLinks: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sellLink: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.onForest },
  sellLinkStrong: { fontFamily: fonts.bold, color: colors.lime },
});
