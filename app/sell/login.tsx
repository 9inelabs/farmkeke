// Log in as a farmer: phone number and 4-digit PIN, no text message, on
// deep green with Farmkeke's own PIN keypad.
// "Forgot PIN?" proves the phone with a texted code, then sets a new PIN.
import { router } from "expo-router";
import { useState } from "react";
import { Keyboard, Platform, StyleSheet, TextInput, View } from "react-native";
import { Glass, PinPad } from "@/components/premium";
import { Text } from "@/components/ui";
import { useAfterFarmerSignIn } from "@/features/sell/afterSignIn";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { phoneAuthMessage, usePhoneAuth } from "@/features/sell/usePhoneAuth";
import { validPhone } from "@/lib/phone";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function FarmerLogin() {
  const { login } = usePhoneAuth();
  const after = useAfterFarmerSignIn();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async (value = pin) => {
    const local = validPhone(phone);
    if (local === null) {
      // Clear the PIN so typing it again submits once the number is fixed
      setPin("");
      return setErrors({ phone: "Enter a Nigerian mobile number, like 0803 123 4567." });
    }
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
    <SellShell tone="dark" bare>
      <View style={styles.head}>
        <SellTitle tone="dark" overline="Farmers" title="Log in" accent="with your PIN" note="Your phone number and the 4-digit PIN you chose." />
        <View>
          <Text style={styles.label}>Mobile number</Text>
          <Glass style={[styles.phone, focused && styles.phoneFocused, errors.phone ? styles.phoneError : null]}>
            <Text style={styles.prefix} numberOfLines={1}>
              🇳🇬 +234
            </Text>
            <TextInput
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setErrors({});
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="803 123 4567"
              placeholderTextColor="rgba(201, 216, 190, 0.6)"
              selectionColor={colors.lime}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              accessibilityLabel="Mobile number"
              style={styles.input}
            />
          </Glass>
          {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
        </View>
        <Text style={styles.pinLabel}>PIN</Text>
      </View>
      <PinPad
        value={pin}
        onChange={(v) => {
          Keyboard.dismiss();
          setPin(v);
          setErrors((e) => ({ ...e, form: undefined }));
        }}
        onFilled={(v) => void submit(v)}
        error={errors.form !== undefined}
        disabled={busy}
        label="PIN"
      />
      {errors.form ? (
        <Text style={[styles.error, styles.center]} accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}
      <View style={styles.links}>
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: "/sell/phone", params: { mode: "reset", ...(validPhone(phone) ? { phone: `0${validPhone(phone)}` } : {}) } })}
        >
          {busy ? "Logging in…" : "Forgot PIN?"}
        </Text>
        <Text style={styles.linkSoft} accessibilityRole="link" onPress={() => router.replace("/sell")}>
          New to selling? <Text style={styles.link}>Apply as a farmer</Text>
        </Text>
      </View>
    </SellShell>
  );
}

const styles = StyleSheet.create({
  head: { gap: 18, paddingTop: 8, marginBottom: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.white, marginBottom: 7 },
  phone: { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 15, paddingHorizontal: 15 },
  phoneFocused: { borderColor: colors.lime, borderWidth: 1.5 },
  phoneError: { borderColor: "#FF9C9C" },
  prefix: { flexShrink: 0, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.white, paddingRight: 12, marginRight: 12, borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.white, paddingVertical: 12, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  pinLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.white, textAlign: "center", marginTop: 6 },
  error: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: "#FF9C9C", marginTop: 6 },
  center: { textAlign: "center", marginTop: 14 },
  links: { alignItems: "center", gap: 12, marginTop: 22 },
  link: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.lime },
  linkSoft: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.onForest },
});
