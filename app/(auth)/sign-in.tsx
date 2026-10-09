// M-50 Sign in, including the wrong-details and too-many-tries states.
import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Button, Notice, StatusScreen, Text, TextField } from "@/components/ui";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { closeAuth } from "@/features/auth/navigation";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { usePrefs } from "@/store/prefs";
import { colors, spacing } from "@/theme/tokens";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const passwordRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ identifier?: string; password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const id = identifier.trim();
    const errors: typeof fieldError = {};
    if (id.length === 0) errors.identifier = "Enter your email. Farmers can use their phone number.";
    if (password.length === 0) errors.password = "Enter your password.";
    setFieldError(errors);
    setBanner(null);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await signIn("password", { flow: "signIn", identifier: id, password });
      setAccountSignedIn(true);
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
              onPress={() => router.replace({ pathname: "/forgot-password", params: { email: identifier.trim() } })}
            />
            <Button label="Keep shopping as a guest" variant="ghost" fullWidth onPress={closeAuth} />
          </>
        }
      />
    );
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to see your orders and saved addresses."
      footer={
        <>
          <Button label="Sign in" fullWidth loading={busy} onPress={() => void submit()} />
          <Text variant="caption" align="center">
            New to Farmkeke?{" "}
            <Text
              variant="label"
              color={colors.forest}
              accessibilityRole="link"
              onPress={() => router.replace("/create-account")}
            >
              Create account
            </Text>
          </Text>
        </>
      }
    >
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <View style={styles.fields}>
        <TextField
          label="Email"
          value={identifier}
          onChangeText={(t) => {
            setIdentifier(t);
            setFieldError((e) => ({ ...e, identifier: undefined }));
          }}
          error={fieldError.identifier}
          helper="Farmers can use their phone number instead."
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
          color={colors.forest}
          align="right"
          accessibilityRole="link"
          onPress={() => router.push({ pathname: "/forgot-password", params: { email: identifier.trim() } })}
          style={styles.forgot}
        >
          Forgot password?
        </Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  forgot: { paddingVertical: spacing.xs },
});
