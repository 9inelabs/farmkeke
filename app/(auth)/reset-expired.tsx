// M-57 Reset link expired (old, already used, or wrong).
import { useAuthActions } from "@convex-dev/auth/react";
import { router, useLocalSearchParams } from "expo-router";
import { Clock } from "lucide-react-native";
import { useState } from "react";
import { Button, Notice, StatusScreen } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { isEmail } from "@/lib/session";

export default function ResetExpired() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendNew = async () => {
    if (!isEmail(email)) {
      router.replace("/forgot-password");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email });
      router.replace({ pathname: "/check-email", params: { email } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StatusScreen
      icon={Clock}
      tone="pending"
      title="This link has expired"
      message="Reset links work for 30 minutes and only once. Send yourself a fresh one."
      actions={
        <>
          <Button label="Send a new link" fullWidth loading={busy} onPress={() => void sendNew()} />
          <Button label="Back to sign in" variant="ghost" fullWidth onPress={() => router.replace("/sign-in")} />
        </>
      }
    >
      {error !== null && <Notice tone="error">{error}</Notice>}
    </StatusScreen>
  );
}
