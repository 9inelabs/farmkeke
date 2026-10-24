// Farmer sign-up, step 3: choose a 4-digit PIN (then confirm it). Logging in
// later is the phone number and this PIN, with no text message.
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Lock } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { useAfterFarmerSignIn } from "@/features/sell/afterSignIn";
import { CodeBoxes, type CodeBoxesHandle } from "@/features/sell/CodeBoxes";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { showToast } from "@/store/toast";
import { colors, spacing } from "@/theme/tokens";

export default function PinStep() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { setPin } = usePhoneAuth();
  const after = useAfterFarmerSignIn();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<CodeBoxesHandle>(null);
  const confirming = first !== null;

  const next = async (value = pin) => {
    if (value.length !== 4 || busy) return;
    setError(null);
    if (!confirming) {
      setFirst(value);
      setPinValue("");
      setTimeout(() => boxes.current?.focus(), 50);
      return;
    }
    if (value !== first) {
      setError("Those PINs don't match. Choose your PIN again.");
      setFirst(null);
      setPinValue("");
      return;
    }
    setBusy(true);
    try {
      await setPin(value);
      showToast({ message: mode === "reset" ? "New PIN saved" : "PIN saved" });
      await after();
    } catch (e) {
      setError(phoneAuthMessage(e));
      setFirst(null);
      setPinValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      scene="pin"
      curve="left"
      sticker="right"
      onBack={confirming ? () => { setFirst(null); setPinValue(""); } : undefined}
      footer={<Button label={confirming ? "Save PIN" : "Continue"} variant="black" size="large" fullWidth loading={busy} disabled={pin.length !== 4} onPress={() => void next()} />}
    >
      <SellTitle
        title={confirming ? "Confirm your" : mode === "reset" ? "Choose a new" : "Create your"}
        accent="PIN"
        note={confirming ? "Enter the same 4 digits again" : "You'll log in with your phone number and this PIN"}
      />
      <CodeBoxes ref={boxes} key={confirming ? "confirm" : "first"} length={4} secure value={pin} onChange={(v) => { setPinValue(v); setError(null); }} onFilled={(v) => void next(v)} error={error !== null} autoFocus label={confirming ? "Confirm PIN" : "PIN"} />
      {error ? (
        <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.note}>
        <Lock size={14} color={colors.inkMuted} />
        <Text variant="small" color={colors.inkMuted}>
          Avoid easy PINs like 1234. Never share it, even with Farmkeke.
        </Text>
      </View>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
