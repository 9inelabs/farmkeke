// M-54 Check your email.
import { useAuthActions } from "@convex-dev/auth/react";
import { router, useLocalSearchParams } from "expo-router";
import { Mail, MailSent, Refresh } from "@/components/icons";
import { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Notice, ScreenHeader, StatusScreen, Text } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";

const RESEND_AFTER_S = 60;

export default function CheckEmail() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuthActions();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_S);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "brand" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async () => {
    setSending(true);
    setNotice(null);
    try {
      await signIn("password", { flow: "reset", email });
      setNotice({ tone: "brand", text: "We sent a new link. Use the newest email." });
      setSecondsLeft(RESEND_AFTER_S);
    } catch (e) {
      setNotice({ tone: "error", text: errorMessage(e) });
    } finally {
      setSending(false);
    }
  };

  const openEmailApp = () => {
    // iOS opens Mail; elsewhere a mailto: opens the default email app.
    const url = Platform.OS === "ios" ? "message://" : "mailto:";
    void Linking.openURL(url).catch(() => {});
  };

  const timer = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <StatusScreen
      header={<ScreenHeader title="Forgot password" />}
      icon={MailSent}
      title="Check your email"
      message={`We sent a reset link to ${email}. It works for 30 minutes.`}
      actions={
        <>
          <Button label="Open email app" icon={Mail} fullWidth onPress={openEmailApp} />
          <Button label="Back to sign in" variant="ghost" fullWidth onPress={() => router.replace("/sign-in")} />
        </>
      }
    >
      <Text variant="caption" align="center">
        Can't find it? Check your spam folder.
      </Text>
      <View style={styles.resend}>
        {secondsLeft > 0 ? (
          <View style={styles.wait} accessibilityLiveRegion="none">
            <Refresh size={14} color={colors.inkMuted} />
            <Text variant="label" color={colors.inkMuted}>
              Resend link in {timer}
            </Text>
          </View>
        ) : (
          <Button label="Resend link" icon={Refresh} variant="secondary" size="small" loading={sending} onPress={() => void resend()} />
        )}
      </View>
      {notice !== null && <Notice tone={notice.tone}>{notice.text}</Notice>}
    </StatusScreen>
  );
}

const styles = StyleSheet.create({
  resend: { marginTop: spacing.md, alignItems: "center" },
  wait: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
