// M-50 Sign in, including the wrong-details and too-many-tries states.
import { useAuthActions } from "@convex-dev/auth/react";
import { router, useLocalSearchParams } from "expo-router";
import { Lock } from "@/components/icons";
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Button, Notice, StatusScreen, Text, TextField } from "@/components/ui";
import { AuthScreen, AuthSwitchLink } from "@/features/auth/AuthScreen";
import { ForgotPasswordSheet } from "@/features/auth/ForgotPasswordSheet";
import { useGuestClaim } from "@/features/auth/useGuestClaim";
import { closeAuth } from "@/features/auth/navigation";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { usePrefs } from "@/store/prefs";
import { colors, spacing } from "@/theme/tokens";

export default function SignIn() {
  // /forgot-password lands here with the reset sheet open.
  const params = useLocalSearchParams<{ reset?: string; email?: string }>();
  const { signIn } = useAuthActions();
  const claimGuestOrders = useGuestClaim();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const passwordRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState(params.email ?? "");
  const [resetOpen, setResetOpen] = useState(params.reset === "1");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ identifier?: string; password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const id = identifier.trim();
    const errors: typeof fieldError = {};
    if (id.length === 0) errors.identifier = "Enter your email.";
    if (password.length === 0) errors.password = "Enter your password.";
    setFieldError(errors);
    setBanner(null);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await signIn("password", { flow: "signIn", identifier: id, password });
      setAccountSignedIn(true);
      await claimGuestOrders();
      closeAuth();
    } catch (error) {
      const code = errorCode(error);
      if (code === "TOO_MANY_ATTEMPTS") setPaused(true);
      else if (code === "INVALID_CREDENTIALS") {
        setBanner("That email and password don't match. Check them and try again.");
        setAttemptsLeft(errorData<{ attemptsLeft: number }>(error).attemptsLeft ?? null);
      } else setBanner(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (paused) {
    return (
      <StatusScreen
        icon={Lock}
        tone="pending"
        title="Too many tries"
        message="To keep your account safe, signing in is paused for about 15 minutes. You can reset your password now instead."
        actions={
          <>
            <Button
              label="Reset my password"
              fullWidth
              onPress={() => {
                setPaused(false);
                setResetOpen(true);
              }}
            />
            <Button label="Keep shopping as a guest" variant="ghost" fullWidth onPress={closeAuth} />
          </>
        }
      />
    );
  }

  return (
    <AuthScreen
      title="Welcome Back"
      subtitle="Sign in to see your orders and saved addresses"
      tab="sign-in"
      footer={
        <>
          <Button label="Continue" variant="black" size="large" fullWidth loading={busy} onPress={() => void submit()} />
          <AuthSwitchLink label="No account yet? Create one" onPress={() => router.replace("/create-account")} />
        </>
      }
    >
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <View style={styles.fields}>
        <TextField
          label="Email Address"
          value={identifier}
          onChangeText={(t) => {
            setIdentifier(t);
            setFieldError((e) => ({ ...e, identifier: undefined }));
          }}
          error={fieldError.identifier}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          password
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setFieldError((e) => ({ ...e, password: undefined }));
          }}
          error={
            fieldError.password ??
            (banner !== null && attemptsLeft !== null && attemptsLeft <= 3
              ? `${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left before a short wait.`
              : null)
          }
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <Text
          variant="label"
          color={colors.limeInk}
          align="right"
          accessibilityRole="link"
          onPress={() => setResetOpen(true)}
          style={styles.forgot}
        >
          Forgot Password?
        </Text>
      </View>
      <ForgotPasswordSheet visible={resetOpen} onClose={() => setResetOpen(false)} initialEmail={identifier} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  forgot: { paddingVertical: spacing.xxs, marginTop: -spacing.xs, marginRight: 40 },
});
