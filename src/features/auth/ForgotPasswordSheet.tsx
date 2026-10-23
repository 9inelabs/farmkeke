// M-53 Forgot password, as a sheet over Sign in (the "Forgot Password" design).
import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Close, Mail } from "@/components/icons";
import { BottomSheet, Button, Notice, Text, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { isEmail } from "@/lib/session";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** What was typed on Sign in; used when it's an email. */
  initialEmail: string;
};

export function ForgotPasswordSheet({ visible, onClose, initialEmail }: Props) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Each time it opens, start from what was typed on Sign in (a phone number isn't an email).
  useEffect(() => {
    if (!visible) return;
    setEmail(isEmail(initialEmail) ? initialEmail.trim() : "");
    setError(null);
    setBanner(null);
  }, [visible, initialEmail]);

  const submit = async () => {
    setBanner(null);
    if (!isEmail(email)) {
      setError("Enter the email on your account.");
      return;
    }
    setBusy(true);
    try {
      await signIn("password", { flow: "reset", email: email.trim() });
      onClose();
      router.push({ pathname: "/check-email", params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} handle={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={styles.close}>
        <Close size={20} color={colors.ink} strokeWidth={2} />
        <Text variant="bodyMedium">Close</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text variant="displaySmall" align="center" accessibilityRole="header" style={styles.title}>
          Reset Your Password
        </Text>
        <Text variant="caption" align="center">
          Enter the email on your account. We'll send a link to make a new password.
        </Text>
      </View>
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <TextField
        label="Email Address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
        }}
        error={error}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />
      <Button label="Send reset link" icon={Mail} variant="black" size="large" fullWidth loading={busy} onPress={() => void submit()} style={styles.button} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  close: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: spacing.xxs, minHeight: 44, marginTop: spacing.sm },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32 },
  button: { marginTop: spacing.sm, marginBottom: spacing.md },
});
