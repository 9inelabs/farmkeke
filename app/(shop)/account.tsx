// M-80 Account (signed in: the "Settings & Support" design) and M-81 Account
// (guest: sign in, help, and Sell on Farmkeke), with M-94 Sign out.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Book, Document, Grid, Headphone, Heart, Help, Info, Key, Logout, Messages, Pin, Refresh, Trash, User } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Avatar, BottomSheet, Button, ListGroup, ListRow, Skeleton, Text, Wordmark } from "@/components/ui";
import { SellingEntry } from "@/features/farmer/SellingEntry";
import { APP_VERSION } from "@/features/system/AppGate";
import { useSignOut } from "@/lib/session";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function Account() {
  const viewer = useQuery(api.users.viewer);
  const addresses = useQuery(api.addresses.list);
  const signOut = useSignOut();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const signedIn = viewer !== undefined && viewer !== null && !viewer.isGuest;

  if (viewer === undefined) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.content}>
          <Skeleton height={34} width={220} />
          <Skeleton height={230} radius={radii.lg + 6} />
          <Skeleton height={120} radius={radii.lg + 6} />
        </View>
      </SafeAreaView>
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

/** M-80, the Settings & Support design. Also drawn by /dev/account. */
export function SignedInAccount({ viewer, addresses, onSignOut }: { viewer: { name: string | null; email: string | null; phone: string | null }; addresses: number | undefined; onSignOut: () => void }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Stagger>
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text variant="screenTitle" accessibilityRole="header">
                Settings & Support
              </Text>
              <Text variant="small" color={colors.inkSoft} numberOfLines={1}>
                {[viewer.name, viewer.email ?? viewer.phone].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push("/settings/edit-profile")}>
              <Avatar name={viewer.name} size={44} />
            </Pressable>
          </View>

          <ListGroup title="Settings Hub">
            <ListRow icon={User} title="Account" onPress={() => router.push("/settings/edit-profile")} />
            <ListRow icon={Key} title="Login details" onPress={() => router.push("/settings/login-details")} />
            <ListRow
              icon={Pin}
              title="Saved addresses"
              trailing={addresses !== undefined ? <Text variant="small">{addresses}</Text> : null}
              onPress={() => router.push("/settings/addresses")}
            />
            <ListRow icon={Heart} title="Saved items" onPress={() => router.push("/saved")} />
            <ListRow icon={Bell} title="Notifications" onPress={() => router.push("/settings/notifications")} />
          </ListGroup>

          <ListGroup title="Account Management" badge="New">
            <SellingEntry />
            <ListRow icon={Trash} title="Delete Account" onPress={() => router.push("/settings/delete-account")} />
          </ListGroup>

          <ListGroup title="Support & FAQs">
            <ListRow icon={Help} title="Search FAQ" onPress={() => router.push("/help")} />
            <ListRow icon={Headphone} title="Contact Support" onPress={() => router.push("/support")} />
            <ListRow icon={Messages} title="Messages" onPress={() => router.push("/messages")} />
            <ListRow icon={Book} title="How Farmkeke works" onPress={() => router.push("/how-it-works")} />
          </ListGroup>

          <ListGroup title="App">
            <ListRow icon={Refresh} title="App Updates" trailing={<Text variant="small">v{APP_VERSION}</Text>} onPress={() => router.push("/about")} />
            <ListRow icon={Document} title="Terms and policies" onPress={() => router.push("/legal")} />
            {__DEV__ ? <ListRow icon={Grid} title="Component gallery" onPress={() => router.push("/dev/gallery")} /> : null}
            <ListRow icon={Logout} title="Sign out" tone="danger" onPress={onSignOut} />
          </ListGroup>
        </Stagger>
      </ScrollView>
    </SafeAreaView>
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

/** M-81, as designed: sign-in card, help rows, and Sell on Farmkeke. */
function GuestAccount() {
  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, styles.canvas]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Stagger>
          <View style={styles.guestHead}>
            <Text variant="backTitle" accessibilityRole="header">
              Account
            </Text>
            <Text variant="small" color={colors.inkSoft}>
              You're shopping as a guest.
            </Text>
          </View>

          <View style={styles.signCard}>
            <Text style={styles.signTitle}>Sign in for a faster checkout</Text>
            <Text variant="small" color={colors.inkSoft}>
              Save addresses and see every order in one place. You can still shop without an account
            </Text>
            <View style={styles.signButtons}>
              <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} style={({ pressed }) => [styles.signBtn, styles.signIn, pressed && styles.pressed]}>
                <Text style={styles.signText}>Sign in</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push("/create-account")} style={({ pressed }) => [styles.signBtn, styles.create, pressed && styles.pressed]}>
                <Text style={styles.signText}>Create Account</Text>
              </Pressable>
            </View>
          </View>

          <ListGroup tone="white">
            <ListRow icon={Messages} title="Messages" subtitle="Your chats with farmers about orders" onPress={() => router.push("/messages")} />
            <ListRow icon={Headphone} title="Contact Support" subtitle="Message the farmkeke team" onPress={() => router.push("/support")} />
            <ListRow icon={Help} title="Help and FAQ" subtitle="About orders, delivery and payment" onPress={() => router.push("/help")} />
            <ListRow icon={Book} title="How Farmkeke works" subtitle="Ordering, pickup and how your money is held" onPress={() => router.push("/how-it-works")} />
            <ListRow icon={Document} title="Terms and policies" subtitle="Terms, privacy, refunds and disputes" onPress={() => router.push("/legal")} />
            <ListRow icon={Info} title="About Farmkeke" subtitle={`App version ${APP_VERSION}`} onPress={() => router.push("/about")} />
          </ListGroup>

          <View style={styles.sell}>
            <View style={styles.sellRow}>
              <Text style={styles.sellOn}>Sell on</Text>
              <Wordmark width={84} />
            </View>
            <Button label="Apply as a farmer today" variant="black" size="large" pill fullWidth onPress={() => router.push("/sell")} />
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/sell/login")} style={styles.center}>
              <Text variant="small" color={colors.inkSoft}>
                Already a farmer? <Text variant="small" color={colors.limeInk} style={styles.underline}>Log in</Text>
              </Text>
            </Pressable>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/farm-settings/terms")} style={styles.center}>
              <Text variant="small">Terms & Conditions apply</Text>
            </Pressable>
          </View>
        </Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  canvas: { backgroundColor: colors.canvas },
  flex: { flex: 1, gap: 2 },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  guestHead: { gap: 2 },
  signCard: { backgroundColor: colors.white, borderRadius: radii.lg + 6, padding: spacing.md, paddingTop: spacing.lg, gap: 4 },
  signTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.ink, paddingHorizontal: 2 },
  signButtons: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, padding: 4, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  signBtn: { flex: 1, height: 50, borderRadius: radii.md + 2, alignItems: "center", justifyContent: "center" },
  signIn: { backgroundColor: colors.lime },
  create: { backgroundColor: colors.tint },
  signText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  pressed: { opacity: 0.85 },
  sell: { gap: spacing.md },
  sellRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sellOn: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  center: { alignSelf: "center" },
  underline: { textDecorationLine: "underline", fontFamily: fonts.semibold },
});
