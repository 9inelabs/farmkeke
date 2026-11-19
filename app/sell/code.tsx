// Farmer sign-up, step 2: the 6-digit code texted to the phone. Once it
// checks out, the PIN step signs the farmer in with it and sets the PIN.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Call, Clock, Messages } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { CodeBoxes } from "@/features/sell/CodeBoxes";
import { pendingCode } from "@/features/sell/pendingCode";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { maskedPhone, phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { showToast } from "@/store/toast";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const RESEND_AFTER = 30;

export default function CodeStep() {
  const { phone = "", mode } = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const { send, check } = usePhoneAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await check(phone, value);
      pendingCode.set({ phone, code: value });
      router.replace({ pathname: "/sell/pin", params: { mode: mode === "reset" ? "reset" : "signup" } });
    } catch (e) {
      setError(phoneAuthMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const [calling, setCalling] = useState(false);
  const [called, setCalled] = useState(false);
  const resend = async (by: "sms" | "voice" = "sms") => {
    setError(null);
    if (by === "voice") setCalling(true);
    try {
      await send(phone, by);
      setWait(RESEND_AFTER);
      setCode("");
      setCalled(by === "voice");
      showToast({ message: by === "voice" ? "Calling you now. Answer to hear your code." : "New code sent" });
    } catch (e) {
      setError(phoneAuthMessage(e));
    } finally {
      setCalling(false);
    }
  };

  return (
    <SellShell
      step={mode === "reset" ? undefined : { current: 1, progress: 0.65 }}
      footer={<Button label="Verify" variant="dark" size="hero" fullWidth loading={busy} disabled={code.length !== 6} onPress={() => void submit()} />}
    >
      <View style={styles.badge}>
        <Messages size={28} color={colors.lime} strokeWidth={1.8} />
      </View>
      <SellTitle title="Enter the code" note={called ? `We're calling ${maskedPhone(phone)} to read it out.` : `Sent by text to ${maskedPhone(phone)}.`} />
      <CodeBoxes length={6} value={code} onChange={(v) => { setCode(v); setError(null); }} onFilled={(v) => void submit(v)} error={error !== null} autoFocus label="Verification code" />
      <View style={styles.resend}>
        <Text style={styles.change} accessibilityRole="link" onPress={() => router.back()}>
          Wrong number? Change it
        </Text>
        {error ? (
          <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={styles.row}>
          <Clock size={16} color={colors.inkSoft} strokeWidth={1.8} />
          {wait > 0 ? (
            <Text variant="small" color={colors.inkSoft}>
              Resend code in <Text variant="small" color={colors.forest} style={styles.bold}>0:{String(wait).padStart(2, "0")}</Text>
            </Text>
          ) : (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void resend()}>
              <Text variant="small" color={colors.forest} style={styles.link}>
                Resend code
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      {wait <= 0 ? (
        <View style={styles.callCard}>
          <View style={styles.callIcon}>
            <Call size={20} color={colors.forest} strokeWidth={1.8} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.callTitle}>Didn't get the text?</Text>
            <Text variant="small" color={colors.inkSoft}>
              We'll call your phone and read the code out. It replaces the texted code.
            </Text>
          </View>
        </View>
      ) : null}
      {wait <= 0 ? <Button label="Call me with the code" icon={Call} variant="outline" size="hero" fullWidth loading={calling} onPress={() => void resend("voice")} /> : null}
    </SellShell>
  );
}

const styles = StyleSheet.create({
  resend: { alignItems: "flex-start", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center", boxShadow: "0px 14px 30px 0px rgba(30, 59, 22, 0.25)" },
  change: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.forest },
  bold: { fontFamily: fonts.semibold },
  link: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  flex: { flex: 1, gap: 2 },
  callCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.tint, marginTop: spacing.sm },
  callIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  callTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.forest },
});
