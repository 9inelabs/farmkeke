// Farmer sign-up, step 1: the phone number. A 6-digit code is texted to it.
// ?mode=reset is "Forgot PIN": the same code, then a new PIN.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ArrowRight, ShieldCheck } from "@/components/icons";
import { Button, Text, TextField } from "@/components/ui";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { displayPhone, validPhone } from "@/lib/phone";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function PhoneStep() {
  const params = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const reset = params.mode === "reset";
  const { send } = usePhoneAuth();
  const [phone, setPhone] = useState(params.phone ? displayPhone(params.phone).replace(/^0/, "") : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const local = validPhone(phone);
    if (local === null) return setError("Enter a Nigerian mobile number, like 0803 123 4567.");
    setBusy(true);
    setError(null);
    try {
      await send(`0${local}`);
      router.push({ pathname: "/sell/code", params: { phone: `0${local}`, mode: reset ? "reset" : "signup" } });
    } catch (e) {
      setError(phoneAuthMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      step={reset ? undefined : { current: 1, progress: 0.35 }}
      footer={<Button label="Send code" iconRight={ArrowRight} variant="dark" size="hero" fullWidth loading={busy} onPress={() => void submit()} />}
    >
      <SellTitle
        overline={reset ? "Forgot PIN" : "Verify your phone"}
        title={reset ? "Reset your PIN" : "What's your mobile number?"}
        note={reset ? "We'll text a code to your number, then you choose a new PIN." : "We'll text you a 6-digit code. You'll log in with this number."}
      />
      <TextField
        tone="premium"
        prefix="🇳🇬 +234"
        label="Mobile number"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          setError(null);
        }}
        placeholder="803 123 4567"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        error={error}
        autoFocus
      />
      <View style={styles.note}>
        <ShieldCheck size={20} color={colors.forest} strokeWidth={1.8} />
        <Text style={styles.noteText}>Your number stays private. Buyers never see it; Farmkeke uses it to send you new orders.</Text>
      </View>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.tint },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.forest },
});
