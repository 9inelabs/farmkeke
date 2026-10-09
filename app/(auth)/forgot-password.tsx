// M-53 Forgot password.
import { useAuthActions } from "@convex-dev/auth/react";
import { router, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Button, Notice, TextField } from "@/components/ui";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { errorMessage } from "@/lib/errors";
import { isEmail } from "@/lib/session";

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuthActions();
  // A phone number typed on Sign in isn't an email; start empty in that case.
  const [email, setEmail] = useState(params.email && isEmail(params.email) ? params.email : "");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBanner(null);
    if (!isEmail(email)) {
      setError("Enter the email on your account.");
      return;
    }
    setBusy(true);
    try {
      await signIn("password", { flow: "reset", email: email.trim() });
      router.replace({ pathname: "/check-email", params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      nav="back"
      backTitle="Forgot password"
      title="Reset your password"
      subtitle="Enter the email on your account. We'll send a link to make a new password."
      footer={<Button label="Send reset link" icon={Mail} fullWidth loading={busy} onPress={() => void submit()} />}
    >
      {banner !== null && <Notice tone="error">{banner}</Notice>}
      <TextField
        label="Email"
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
    </AuthScreen>
  );
}
