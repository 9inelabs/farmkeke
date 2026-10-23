// M-51 Create account, including the already-registered state.
import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { User } from "@/components/icons";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInput } from "react-native";
import { Button, Notice, PasswordRules, Text, TextField } from "@/components/ui";
import { AuthScreen, AuthSwitchLink } from "@/features/auth/AuthScreen";
import { errorCode, errorMessage } from "@/lib/errors";
import { isEmail, passwordRules } from "@/lib/session";
import { usePrefs } from "@/store/prefs";
import { colors, spacing } from "@/theme/tokens";

export default function CreateAccount() {
  const { signIn } = useAuthActions();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (name.trim().length === 0) next.name = "Enter your full name.";
    if (!isEmail(email)) next.email = "Enter a full email address, like name@example.com.";
    if (!passwordRules(password).every((r) => r.met)) next.password = "Your password needs all three below.";
    setErrors(next);
    setBanner(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await signIn("password", { flow: "signUp", name: name.trim(), email: email.trim(), password });
      setAccountSignedIn(true);
      router.replace({ pathname: "/account-created", params: { name: name.trim() } });
    } catch (error) {
      const code = errorCode(error);
      if (code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        setErrors({ email: "This email already has an account." });
      } else if (code === "INVALID_EMAIL") setErrors({ email: errorMessage(error) });
      else if (code === "WEAK_PASSWORD") setErrors({ password: errorMessage(error) });
      else setBanner(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      title="Setup Your Account"
      subtitle="Save addresses, see every order in one place, and check out faster."
      tab="create-account"
      footer={
        <>
          <Button label="Continue" variant="black" size="large" fullWidth loading={busy} onPress={() => void submit()} />
          <AuthSwitchLink label="Already have an account? Sign In" onPress={() => router.replace("/sign-in")} />
        </>
      }
    >
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <View style={styles.fields}>
        <TextField
          label="Full Name"
          placeholder="John Okafor"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setEmailTaken(false);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          helper="We send receipts and password resets here."
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        {emailTaken && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/sign-in")}
            style={styles.taken}
          >
            <User size={16} color={colors.forest} />
            <Text variant="label" color={colors.forest} style={styles.takenText}>
              Is this you?
            </Text>
            <Text variant="label" color={colors.forest}>
              Sign in instead
            </Text>
          </Pressable>
        )}
        <View style={styles.passwordGroup}>
          <TextField
            ref={passwordRef}
            label="Password"
            password
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          <PasswordRules password={password} />
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  passwordGroup: { gap: spacing.md },
  taken: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.tint,
    borderRadius: 12,
    padding: spacing.md,
  },
  takenText: { flex: 1 },
});
