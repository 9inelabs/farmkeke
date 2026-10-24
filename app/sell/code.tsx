// Farmer sign-up, step 2: the 6-digit code texted to the phone. Once it
// checks out, the PIN step signs the farmer in with it and sets the PIN.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

  const resend = async () => {
    setError(null);
    try {
      await send(phone);
      setWait(RESEND_AFTER);
      showToast({ message: "New code sent" });
    } catch (e) {
      setError(phoneAuthMessage(e));
    }
  };

  return (
    <SellShell
      scene="code"
      curve="right" sticker="left" footer={<Button label="Verify" variant="black" size="large" fullWidth loading={busy} disabled={code.length !== 6} onPress={() => void submit()} />}>
      <SellTitle title="Enter Verification" accent="Code" note={`A verification code has been sent to ${maskedPhone(phone)}`} />
      <CodeBoxes length={6} value={code} onChange={(v) => { setCode(v); setError(null); }} onFilled={(v) => void submit(v)} error={error !== null} autoFocus label="Verification code" />
      <View style={styles.resend}>
        {error ? (
          <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={styles.row}>
          <Text variant="small" color={colors.inkSoft}>
            Didn't get code?
          </Text>
          {wait > 0 ? (
            <Text variant="small" color={colors.inkMuted}>
              Resend in {wait}s
            </Text>
          ) : (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void resend()}>
              <Text variant="small" color={colors.limeInk} style={styles.link}>
                Resend
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  resend: { alignItems: "center", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
});
