// M-80 Account (signed in) and M-81 Account (guest), with M-94 Sign out.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import {
  BookOpen,
  CircleHelp,
  FileText,
  Info,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  Pencil,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, BottomSheet, Button, ListGroup, ListRow, Skeleton, Text } from "@/components/ui";
import { SellingEntry } from "@/features/farmer/SellingEntry";
import { APP_VERSION } from "@/features/system/AppGate";
import { useSignOut } from "@/lib/session";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Account() {
  const viewer = useQuery(api.users.viewer);
  const addresses = useQuery(api.addresses.list);
  const signOut = useSignOut();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const signedIn = viewer !== undefined && viewer !== null && !viewer.isGuest;

  const help = (
    <ListGroup title="Help and information">
      <ListRow icon={CircleHelp} title="Help and FAQ" subtitle="Answers about orders, delivery and payment" onPress={() => router.push("/help")} />
      <ListRow icon={BookOpen} title="How Farmkeke works" subtitle="Ordering, pickup and how your money is held" onPress={() => router.push("/how-it-works")} />
      <ListRow icon={FileText} title="Terms and policies" subtitle="Terms, privacy, refunds and disputes" onPress={() => router.push("/legal")} />
      <ListRow icon={Info} title="About Farmkeke" subtitle={`App version ${APP_VERSION}`} onPress={() => router.push("/about")} />
      {__DEV__ && (
        <ListRow icon={LayoutGrid} title="Component gallery" subtitle="Development builds only" onPress={() => router.push("/dev/gallery")} />
      )}
    </ListGroup>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {viewer === undefined ? (
          <View style={styles.loading}>
            <Skeleton height={56} radius={radii.lg} />
            <Skeleton height={180} radius={radii.lg} />
          </View>
        ) : signedIn ? (
          <>
            <View style={styles.profile}>
              <Avatar name={viewer.name} size={52} />
              <View style={styles.profileCopy}>
                <Text variant="heading" numberOfLines={1}>
                  {viewer.name ?? "Your account"}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  {[viewer.email, viewer.phone].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                hitSlop={8}
                onPress={() => router.push("/settings/edit-profile")}
                style={styles.edit}
              >
                <Pencil size={14} color={colors.forest} />
                <Text variant="label" color={colors.forest}>
                  Edit
                </Text>
              </Pressable>
            </View>

            <ListGroup title="Shopping">
              <ListRow
                icon={MapPin}
                title="Saved addresses"
                subtitle={
                  addresses === undefined
                    ? " "
                    : addresses.length === 1
                      ? "1 address"
                      : `${addresses.length} addresses`
                }
                onPress={() => router.push("/settings/addresses")}
              />
            </ListGroup>

            <ListGroup title="Account">
              <ListRow icon={KeyRound} title="Login details" subtitle="Email and password" onPress={() => router.push("/settings/login-details")} />
            </ListGroup>

            <SellingEntry signedIn />

            {help}

            <ListGroup>
              <ListRow icon={LogOut} title="Sign out" tone="danger" onPress={() => setConfirmSignOut(true)} />
            </ListGroup>
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <Text variant="title" accessibilityRole="header">
                Account
              </Text>
              <Text variant="caption">You're shopping as a guest.</Text>
            </View>
            <View style={styles.guestCard}>
              <Text variant="section" color={colors.white}>
                Sign in for a faster checkout
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                Save addresses and see every order in one place. You can still shop without an account.
              </Text>
              <View style={styles.guestActions}>
                <Button label="Sign in" size="small" onPress={() => router.push("/sign-in")} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/create-account")}
                  style={styles.outlineLight}
                >
                  <Text variant="button" color={colors.white}>
                    Create account
                  </Text>
                </Pressable>
              </View>
            </View>
            {help}
            <SellingEntry signedIn={false} />
          </>
        )}
      </ScrollView>

      <BottomSheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)}>
        <Text variant="heading">Sign out of Farmkeke?</Text>
        <Text variant="caption">Your orders and saved addresses stay in your account. You can still shop as a guest.</Text>
        <Button
          label="Sign out"
          icon={LogOut}
          variant="danger"
          fullWidth
          onPress={() => {
            setConfirmSignOut(false);
            void signOut();
          }}
        />
        <Button label="Stay signed in" variant="ghost" fullWidth onPress={() => setConfirmSignOut(false)} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.xl, paddingBottom: spacing.xxxl },
  loading: { gap: spacing.lg },
  heading: { gap: spacing.xxs },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileCopy: { flex: 1, gap: 2 },
  edit: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, minHeight: 44 },
  guestCard: {
    backgroundColor: colors.forest,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  guestActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  outlineLight: {
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
});
