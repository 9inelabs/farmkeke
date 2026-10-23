// M-62 Find my order: order number and phone (orders.consumer.find). On
// another phone the order opens view-only; on the phone that placed it, in full.
import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Box } from "@/components/icons";
import { Button, Notice, Screen, ScreenHeader, Text, TextField } from "@/components/ui";
import { useLookup } from "@/features/orders/useOrder";
import { validPhone } from "@/lib/phone";
import { colors, radii, spacing } from "@/theme/tokens";

type Errors = Partial<Record<"number" | "phone" | "form", string>>;

export default function FindOrder() {
  const convex = useConvex();
  const remember = useLookup((s) => s.remember);
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const submit = async () => {
    const e: Errors = {};
    if (!number.trim()) e.number = "Enter your order number, e.g. FK-10234.";
    const local = validPhone(phone);
    if (!local) e.phone = "Enter the phone number you used when ordering, e.g. 0803 123 4567.";
    setErrors(e);
    if (e.number || e.phone) return;
    setBusy(true);
    try {
      const order = await convex.query(api.orders.consumer.find, { number: number.trim(), phone: `+234${local}` });
      if (!order) {
        setErrors({ form: "We couldn't find an order with that number and phone number. Check both and try again." });
        return;
      }
      remember({ orderId: order._id, number: order.number, phone: `+234${local}` });
      router.replace({ pathname: "/order/[id]", params: { id: order._id } });
    } catch {
      setErrors({ form: "We couldn't look that up. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content} header={<ScreenHeader title="Find my order" />} footer={<Button label="Find order" size="large" pill fullWidth loading={busy} onPress={() => void submit()} />}>
      <View style={styles.intro}>
        <View style={styles.icon}>
          <Box size={28} color={colors.forest} variant="solid" />
        </View>
        <Text variant="body" color={colors.inkSoft}>
          Ordered as a guest, or on another phone? Look it up with the order number and the phone number you used.
        </Text>
      </View>
      {errors.form ? <Notice tone="error">{errors.form}</Notice> : null}
      <TextField
        label="Order number"
        placeholder="FK-10234"
        value={number}
        onChangeText={(t) => {
          setNumber(t.toUpperCase());
          setErrors({});
        }}
        error={errors.number}
        helper="It's on your order confirmation, and in the text and email we sent."
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label="Phone number"
        placeholder="0803 123 4567"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          setErrors({});
        }}
        error={errors.phone}
        keyboardType="phone-pad"
        returnKeyType="search"
        onSubmitEditing={() => void submit()}
      />
      <Text variant="small">On another phone you can follow the order, but only the phone that placed it can confirm delivery.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  intro: { gap: spacing.md },
  icon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
});
