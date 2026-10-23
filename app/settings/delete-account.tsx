// M-95 Delete account (required by both app stores).
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { router } from "expo-router";
import { CloseCircle, Document, Lock, Trash, type IconComponent } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Notice, Screen, ScreenHeader, Text, TextField } from "@/components/ui";
import { errorCode, errorMessage } from "@/lib/errors";
import { useSignOut } from "@/lib/session";
import { usePrefs } from "@/store/prefs";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const CONSEQUENCES: { icon: IconComponent; text: string }[] = [
  { icon: CloseCircle, text: "Your name, addresses and saved items are deleted." },
  { icon: Document, text: "Order records are kept only as long as the law requires, and no longer linked to you." },
  { icon: Lock, text: "Orders still on their way are finished first; we'll delete the account once they're complete." },
];

// No useAccount() guard here: it would redirect away mid-deletion. The
// server action checks the session and password itself.
export default function DeleteAccount() {
  const deleteAccount = useAction(api.account.deleteAccount);
  const signOut = useSignOut();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (password.length === 0) {
      setError("Enter your password to confirm.");
      return;
    }
    setBusy(true);
    setBanner(null);
    // The server ends this session as part of deleting; don't treat that as
    // an unexpected sign-out (M-S6).
    setAccountSignedIn(false);
    try {
      await deleteAccount({ password });
      await signOut();
      router.replace("/settings/account-deleted");
    } catch (e) {
      setAccountSignedIn(true);
      if (errorCode(e) === "WRONG_PASSWORD") setError("That password isn't right.");
      else setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Delete account" />}
      footer={
        <>
          <Button label="Delete my account" variant="danger" fullWidth loading={busy} onPress={() => void confirm()} />
          <Button label="Keep my account" variant="ghost" fullWidth onPress={() => router.back()} />
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}>
          <Trash size={26} color={colors.error} />
        </View>
        <Text variant="displaySmall" accessibilityRole="header">
          Delete your account?
        </Text>
        <Text variant="caption">This can't be undone. Here's what happens:</Text>
        <View style={styles.list}>
          {CONSEQUENCES.map(({ icon: Icon, text }, i) => (
            <View key={text} style={[styles.item, i > 0 && styles.itemDivider]}>
              <Icon size={18} color={i === 0 ? colors.error : colors.inkSoft} />
              <Text variant="caption" color={colors.ink} style={styles.flex}>
                {text}
              </Text>
            </View>
          ))}
        </View>
        {banner !== null && <Notice tone="error">{banner}</Notice>}
        <TextField
          label="Enter your password to confirm"
          password
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          error={error}
          autoComplete="current-password"
          textContentType="password"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.line },
  item: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  itemDivider: { borderTopWidth: borders.hairline, borderTopColor: colors.line },
  flex: { flex: 1 },
});
