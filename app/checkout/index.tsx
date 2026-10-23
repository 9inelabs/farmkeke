// M-39 Contact details: who the farm and rider should reach. Prefilled from
// the account or the last order on this phone (checkout.contactDefaults). No
// code is sent to the phone.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInput } from "react-native";
import { User } from "@/components/icons";
import { Button, Text, TextField } from "@/components/ui";
import { Card, CheckoutShell } from "@/features/checkout/CheckoutShell";
import { useCheckoutDraft } from "@/features/checkout/draft";
import { displayPhone, validPhone } from "@/lib/phone";
import { isEmail } from "@/lib/session";
import { colors, radii, spacing } from "@/theme/tokens";

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

export default function Contact() {
  const viewer = useQuery(api.users.viewer);
  const defaults = useQuery(api.checkout.contactDefaults, {});
  const saved = useCheckoutDraft((s) => s.contact);
  const patch = useCheckoutDraft((s) => s.patch);
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState<Errors>({});
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const signedIn = viewer != null && !viewer.isGuest;

  // Fill only what's still empty, once the defaults arrive.
  const filled = useRef(false);
  useEffect(() => {
    if (!defaults || filled.current) return;
    filled.current = true;
    setForm((f) => ({
      name: f.name || defaults.name || "",
      phone: f.phone || (defaults.phone ? displayPhone(defaults.phone) : ""),
      email: f.email || defaults.email || "",
    }));
  }, [defaults]);

  const set = (k: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const next = () => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Enter your full name so the rider knows who to ask for.";
    if (!validPhone(form.phone))
      e.phone = form.phone.trim()
        ? "That doesn't look like a Nigerian mobile number. Check it, e.g. 0803 123 4567."
        : "Enter your phone number so the farm and rider can reach you.";
    if (form.email.trim() && !isEmail(form.email)) e.email = "Check the email address, e.g. name@example.com.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    patch({ contact: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() } });
    router.push("/checkout/method");
  };

  return (
    <CheckoutShell
      step={1}
      title="Your contact details"
      subtitle="So the farm and our rider can reach you about this order."
      footer={<Button label="Continue" size="large" pill fullWidth onPress={next} />}
    >
      {viewer !== undefined && !signedIn ? (
        <Pressable accessibilityRole="link" onPress={() => router.push("/sign-in")} style={styles.signIn}>
          <User size={20} color={colors.forest} />
          <Text variant="label" numberOfLines={1} style={styles.flex}>
            Have an account? Check out faster
          </Text>
          <Text variant="label" color={colors.limeInk}>
            Sign in
          </Text>
        </Pressable>
      ) : null}
      <Card>
        <TextField
          label="Full name"
          placeholder="Adaeze Nwankwo"
          value={form.name}
          onChangeText={set("name")}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <TextField
          ref={phoneRef}
          label="Phone number"
          placeholder="0803 123 4567"
          value={form.phone}
          onChangeText={set("phone")}
          error={errors.phone}
          helper="We'll send order updates to this number. No code needed."
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="Email (optional)"
          placeholder="adaeze@example.com"
          value={form.email}
          onChangeText={set("email")}
          error={errors.email}
          helper="Add it to get your receipt and order updates by email."
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={next}
        />
      </Card>
      {viewer !== undefined && !signedIn ? (
        <Text variant="small" style={styles.note}>
          Your order is remembered on this phone. Only this phone can confirm delivery, unless you save an account after
          ordering.
        </Text>
      ) : null}
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.tint,
  },
  note: { paddingHorizontal: spacing.xs },
});
