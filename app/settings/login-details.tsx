// M-83 Login details: change email and/or password (current password required).
// Farmers' phone number shows here from Phase 3.
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { router } from "expo-router";
import { CheckCircle, Trash } from "@/components/icons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ListGroup, ListRow, Notice, PasswordRules, Screen, ScreenHeader, Skeleton, Text, TextField } from "@/components/ui";
import { useAccount } from "@/features/account/useAccount";
import { errorCode, errorMessage } from "@/lib/errors";
import { isEmail, passwordRules } from "@/lib/session";
import { radii, spacing } from "@/theme/tokens";

export default function LoginDetails() {
  const viewer = useAccount();
  const changeEmail = useAction(api.account.changeEmail);
  const changePassword = useAction(api.account.changePassword);

  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<{ email?: string; current?: string; next?: string }>({});
  const [banner, setBanner] = useState<{ tone: "brand" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (viewer?.email) setEmail(viewer.email);
  }, [viewer?.email]);

  const emailChanged = viewer !== undefined && email.trim().toLowerCase() !== (viewer.email ?? "");
  const passwordChanging = next.length > 0;

  const save = async () => {
    const problems: typeof errors = {};
    if (emailChanged && !isEmail(email)) problems.email = "Enter a full email address, like name@example.com.";
    if (passwordChanging && !passwordRules(next).every((r) => r.met)) problems.next = "Your new password needs all three below.";
    if (current.length === 0) problems.current = "Enter your current password to save changes.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    try {
      if (emailChanged) await changeEmail({ newEmail: email.trim(), currentPassword: current });
      if (passwordChanging) await changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setBanner({
        tone: "brand",
        text: passwordChanging
          ? "Saved. Other phones signed in to your account have been signed out."
          : "Saved. Use your new email next time you sign in.",
      });
    } catch (e) {
      const code = errorCode(e);
      if (code === "WRONG_PASSWORD") setErrors({ current: "That password isn't right." });
      else if (code === "EMAIL_TAKEN") setErrors({ email: "Another account already uses this email." });
      else if (code === "INVALID_EMAIL") setErrors({ email: errorMessage(e) });
      else if (code === "WEAK_PASSWORD") setErrors({ next: errorMessage(e) });
      else setBanner({ tone: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      header={<ScreenHeader title="Login details" />}
      footer={
        <Button
          label="Save changes"
          fullWidth
          loading={busy}
          disabled={!emailChanged && !passwordChanging}
          onPress={() => void save()}
        />
      }
    >
      {viewer === undefined ? (
        <Skeleton height={200} radius={radii.lg} />
      ) : (
        <View style={styles.body}>
          {banner !== null && (
            <Notice tone={banner.tone} icon={banner.tone === "brand" ? CheckCircle : undefined}>
              {banner.text}
            </Notice>
          )}
          <TextField
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            helper="Used to sign in and reset your password. Farmers can also sign in with the phone number on their farm profile."
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {viewer.phone && <TextField label="Phone number" value={viewer.phone} editable={false} />}

          <Text variant="overline" style={styles.overline}>
            Change password
          </Text>
          <View style={styles.group}>
            <TextField
              label="New password"
              password
              value={next}
              onChangeText={(t) => {
                setNext(t);
                setErrors((e) => ({ ...e, next: undefined }));
              }}
              error={errors.next}
              placeholder="Leave empty to keep your password"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {passwordChanging && <PasswordRules password={next} />}
          </View>

          <TextField
            label="Current password"
            password
            value={current}
            onChangeText={(t) => {
              setCurrent(t);
              setErrors((e) => ({ ...e, current: undefined }));
            }}
            error={errors.current}
            helper="Needed to save any change here."
            autoComplete="current-password"
            textContentType="password"
          />

          <ListGroup>
            <ListRow icon={Trash} title="Delete account" tone="danger" onPress={() => router.push("/settings/delete-account")} />
          </ListGroup>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.sm },
  overline: { marginTop: spacing.md },
  group: { gap: spacing.md },
});
