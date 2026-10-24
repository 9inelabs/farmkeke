// Log in as a farmer: phone number and 4-digit PIN, no text message.
// "Forgot PIN?" proves the phone with a texted code, then sets a new PIN.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text, TextField } from "@/components/ui";
import { useAfterFarmerSignIn } from "@/features/sell/afterSignIn";
import { CodeBoxes } from "@/features/sell/CodeBoxes";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { validPhone } from "@/lib/phone";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function FarmerLogin() {
  const { login } = usePhoneAuth();
  const after = useAfterFarmerSignIn();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (value = pin) => {
    const local = validPhone(phone);
    if (local === null) return setErrors({ phone: "Enter a Nigerian mobile number, like 0803 123 4567." });
    if (value.length !== 4 || busy) return;
    setBusy(true);
    setErrors({});
    try {
      await login(`0${local}`, value);
      await after();
    } catch (e) {
      setErrors({ form: phoneAuthMessage(e) });
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      scene="login"
      curve="left"
      sticker="center"
      footer={
        <>
          <Button label="Log in" variant="black" size="large" fullWidth loading={busy} disabled={pin.length !== 4} onPress={() => void submit()} />
          <View style={styles.row}>
            <Text variant="small" color={colors.inkSoft}>
              New to selling?
            </Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.replace("/sell")}>
              <Text variant="small" color={colors.limeInk} style={styles.link}>
                Apply as a farmer
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <SellTitle title="Log in as a" accent="Farmer" note="Your phone number and the 4-digit PIN you chose" />
      <TextField
        tone="lime"
        label="Mobile Number"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          setErrors({});
        }}
        placeholder="0902 345 3382"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
      />
      <View style={styles.pin}>
        <Text variant="label" color={colors.ink}>
          PIN
        </Text>
        <CodeBoxes length={4} secure value={pin} onChange={(v) => { setPin(v); setErrors((e) => ({ ...e, form: undefined })); }} onFilled={(v) => void submit(v)} error={errors.form !== undefined} label="PIN" />
      </View>
      {errors.form ? (
        <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        onPress={() => router.push({ pathname: "/sell/phone", params: { mode: "reset", ...(validPhone(phone) ? { phone: `0${validPhone(phone)}` } : {}) } })}
        style={styles.forgot}
      >
        <Text variant="small" color={colors.limeInk} style={styles.link}>
          Forgot PIN?
        </Text>
      </Pressable>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  pin: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: spacing.xs },
  link: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  forgot: { alignSelf: "center" },
});
