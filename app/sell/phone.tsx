// Farmer sign-up, step 1: the phone number. A 6-digit code is texted to it.
// ?mode=reset is "Forgot PIN": the same code, then a new PIN.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, TextField } from "@/components/ui";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { displayPhone, validPhone } from "@/lib/phone";

export default function PhoneStep() {
  const params = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const reset = params.mode === "reset";
  const { send } = usePhoneAuth();
  const [phone, setPhone] = useState(params.phone ? displayPhone(params.phone) : "");
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
      scene="phone"
      curve="left"
      sticker="center"
      footer={<Button label="Get Verification Code" variant="black" size="large" fullWidth loading={busy} onPress={() => void submit()} />}
    >
      <SellTitle
        title={reset ? "Reset your" : "Input your Phone"}
        accent={reset ? "PIN" : "Number"}
        note={reset ? "We'll text a code to your number, then you choose a new PIN." : "Please input your correct phone number, a verification code would be sent to the phone number"}
      />
      <TextField
        tone="lime"
        label="Enter Mobile Number"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          setError(null);
        }}
        placeholder="0902 345 3382"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        error={error}
        autoFocus
      />
    </SellShell>
  );
}
