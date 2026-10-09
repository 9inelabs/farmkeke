// M-55 Create new password. Opened from the reset email:
//   farmkeke://reset-password?email=…&code=…
import { useAuthActions } from "@convex-dev/auth/react";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Button, Notice, PasswordRules, TextField } from "@/components/ui";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { errorCode, errorMessage } from "@/lib/errors";
import { passwordRules } from "@/lib/session";
import { usePrefs } from "@/store/prefs";
import { spacing } from "@/theme/tokens";

export default function ResetPassword() {
  const { email = "", code = "" } = useLocalSearchParams<{ email?: string; code?: string }>();
  const { signIn } = useAuthActions();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const againRef = useRef<TextInput>(null);

  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const expired = () => router.replace({ pathname: "/reset-expired", params: { email } });

  const submit = async () => {
    const next: typeof errors = {};
    if (!passwordRules(password).every((r) => r.met)) next.password = "Your password needs all three below.";
    if (again !== password) next.again = "The passwords don't match.";
    setErrors(next);
    setBanner(null);
    if (Object.keys(next).length > 0) return;
    if (!email || !code) return expired();

    setBusy(true);
    try {
      await signIn("password", { flow: "reset-verification", email, code, newPassword: password });
      setAccountSignedIn(true);
      router.replace("/password-changed");
    } catch (error) {
      if (errorCode(error) === "INVALID_CODE") expired();
      else setBanner(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      title="Make a new password"
      subtitle={email ? `For ${email}` : undefined}
      footer={<Button label="Save password" fullWidth loading={busy} onPress={() => void submit()} />}
    >
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <View style={styles.fields}>
        <View style={styles.group}>
          <TextField
            label="New password"
            password
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => againRef.current?.focus()}
          />
          <PasswordRules password={password} />
        </View>
        <TextField
          ref={againRef}
          label="Type it again"
          password
          value={again}
          onChangeText={(t) => {
            setAgain(t);
            setErrors((e) => ({ ...e, again: undefined }));
          }}
          error={errors.again}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  group: { gap: spacing.md },
});
