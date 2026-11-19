// Farmer sign-up, step 3: choose a 4-digit PIN (then confirm it) on
// Farmkeke's own keypad, on deep green. Saving it
// signs the farmer in, with the code from step 2, and moves on to the
// application. Logging in later is the phone number and this PIN.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Lock } from "@/components/icons";
import { PinPad } from "@/components/premium";
import { Text } from "@/components/ui";
import { useAfterFarmerSignIn } from "@/features/sell/afterSignIn";
import { pendingCode } from "@/features/sell/pendingCode";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { errorCode } from "@/lib/errors";
import { showToast } from "@/store/toast";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function PinStep() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { verify } = usePhoneAuth();
  const after = useAfterFarmerSignIn();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirming = first !== null;

  const next = async (value = pin) => {
    if (value.length !== 4 || busy) return;
    setError(null);
    if (!confirming) {
      setFirst(value);
      setPinValue("");
      return;
    }
    if (value !== first) {
      setError("Those PINs don't match. Choose your PIN again.");
      setFirst(null);
      setPinValue("");
      return;
    }
    const proved = pendingCode.get();
    if (proved === null) {
      // The page was reloaded since the code: prove the number again
      showToast({ message: "Confirm your number again", tone: "info" });
      router.replace({ pathname: "/sell/phone", params: mode === "reset" ? { mode: "reset" } : {} });
      return;
    }
    setBusy(true);
    try {
      await verify(proved.phone, proved.code, value);
      pendingCode.set(null);
      showToast({ message: mode === "reset" ? "New PIN saved" : "PIN saved" });
      await after();
    } catch (e) {
      const code = errorCode(e);
      if (code === "CODE_EXPIRED" || code === "TOO_MANY_ATTEMPTS" || code === "INVALID_CODE") {
        // The code ran out while choosing the PIN: back for a new one
        pendingCode.set(null);
        showToast({ message: "That code has expired. We'll send a new one.", tone: "info" });
        router.replace({ pathname: "/sell/phone", params: mode === "reset" ? { mode: "reset" } : {} });
        return;
      }
      setError(phoneAuthMessage(e));
      setFirst(null);
      setPinValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      tone="dark"
      bare
      step={mode === "reset" ? undefined : { current: 1, progress: confirming ? 1 : 0.85 }}
      onBack={confirming ? () => { setFirst(null); setPinValue(""); } : undefined}
    >
      <View style={styles.head}>
        <View style={styles.lock}>
          <Lock size={28} color={colors.forest} strokeWidth={1.8} />
        </View>
        <SellTitle
          tone="dark"
          center
          title={confirming ? "Confirm your PIN" : mode === "reset" ? "Choose a new PIN" : "Create your PIN"}
          note={confirming ? "Enter the same 4 digits again." : "4 digits. You'll log in with your phone number and this PIN."}
        />
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.flex} />
      <PinPad
        key={confirming ? "confirm" : "first"}
        value={pin}
        onChange={(v) => {
          setPinValue(v);
          setError(null);
        }}
        onFilled={(v) => void next(v)}
        error={error !== null}
        disabled={busy}
        label={confirming ? "Confirm PIN" : "PIN"}
      />
      <Text style={styles.tip}>{busy ? "Saving your PIN…" : "Avoid easy PINs like 1234. Never share it, even with Farmkeke."}</Text>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 24 },
  head: { alignItems: "center", gap: 18, paddingTop: 22 },
  lock: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", boxShadow: "0px 14px 34px 0px rgba(169, 214, 84, 0.35)" },
  error: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: "#FF9C9C", textAlign: "center" },
  tip: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.onForest, textAlign: "center", marginTop: 22, opacity: 0.85 },
});
