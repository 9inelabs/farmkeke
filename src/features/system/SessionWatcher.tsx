// M-S6 Session expired. Watches for a real account being signed out without
// the person choosing to (password reset on another phone, block, expiry).
import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import { User } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet, Button, Text } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { colors, spacing } from "@/theme/tokens";

// How long "signed out" must last before it counts as a real sign-out.
const SIGNED_OUT_GRACE_MS = 3000;

export function SessionWatcher() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const status = useQuery(api.users.sessionStatus);
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const accountSignedIn = usePrefs((s) => s.accountSignedIn);
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const [expired, setExpired] = useState(false);

  // Remember that a real account is signed in on this phone. Only once per
  // account, so a deliberate clear (signing out, deleting) isn't undone.
  const markedUser = useRef<string | null>(null);
  useEffect(() => {
    if (viewer && !viewer.isGuest && markedUser.current !== viewer._id) {
      markedUser.current = viewer._id;
      setAccountSignedIn(true);
    }
  }, [viewer, setAccountSignedIn]);

  // The server ended this session: drop the stale token.
  useEffect(() => {
    if (status === "revoked") void signOut().catch(() => {});
  }, [status, signOut]);

  // Signed out without choosing to (useSignOut clears the flag first).
  // The auth state blinks to "signed out" for a moment while signing in, while
  // switching from a guest to an account, and while the token refreshes. So
  // only tell the person once they've stayed signed out for a few seconds.
  const latest = useRef({ isLoading, isAuthenticated });
  useEffect(() => {
    latest.current = { isLoading, isAuthenticated };
  }, [isLoading, isAuthenticated]);
  useEffect(() => {
    if (isLoading || isAuthenticated || !accountSignedIn) return;
    const timer = setTimeout(() => {
      const now = latest.current;
      if (!now.isLoading && !now.isAuthenticated) {
        setAccountSignedIn(false);
        setExpired(true);
      }
    }, SIGNED_OUT_GRACE_MS);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, accountSignedIn, setAccountSignedIn]);

  // Signed back in (or the blink passed) while the sheet was up: close it.
  useEffect(() => {
    if (isAuthenticated && viewer && !viewer.isGuest) setExpired(false);
  }, [isAuthenticated, viewer]);

  return (
    <BottomSheet visible={expired} onClose={() => setExpired(false)}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <User size={26} color={colors.forest} />
        </View>
        <Text variant="heading" align="center">
          You've been signed out
        </Text>
        <Text variant="caption" align="center">
          For your security, sign in again to see your orders and saved addresses.
        </Text>
      </View>
      <Button
        label="Sign in"
        fullWidth
        onPress={() => {
          setExpired(false);
          router.push("/sign-in");
        }}
      />
      <Button label="Continue as guest" variant="ghost" fullWidth onPress={() => setExpired(false)} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
});
