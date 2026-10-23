// M-47 Order placed, with M-49 Save your details for guests. Clears the cart
// once the checkout is paid (pickup) or placed (delivery, paid later by
// bill). A guest can turn their details into an account; their orders move
// into it (startGuestClaim → sign up → claimGuestOrders).
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, CheckCircle, Info, Receipt, ShieldCheck } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Avatar, Button, Notice, PasswordRules, Skeleton, StatusScreen, Text, TextField } from "@/components/ui";
import { useCheckoutDraft } from "@/features/checkout/draft";
import { plural } from "@/features/checkout/useQuote";
import { errorCode } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { displayPhone } from "@/lib/phone";
import { isEmail, passwordRules } from "@/lib/session";
import { useCart } from "@/store/cart";
import { claimPendingGuestOrders, useClaim } from "@/store/claim";
import { usePrefs } from "@/store/prefs";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function OrderPlaced() {
  const { checkoutId } = useLocalSearchParams<{ checkoutId: string }>();
  const { isLoading: authLoading } = useConvexAuth();
  const live = useQuery(api.orders.consumer.placedSummary, authLoading ? "skip" : { checkoutId });
  // Keep showing the order while a guest becomes an account (the query is
  // briefly empty between sign-up and the orders moving over).
  const [kept, setKept] = useState<typeof live>(undefined);
  if (live && live !== kept) setKept(live);
  // null (not found) only when there was never anything to keep
  const summary = live ?? kept ?? live;
  const clearCart = useCart((s) => s.clear);
  const draft = useCheckoutDraft();

  const status = summary?.status;
  // A pickup checkout not paid yet goes to its payment screen
  const toPay = status === "awaiting_payment" && !summary?.payBy;
  const placedDelivery = summary?.fulfilment === "delivery" && status !== "abandoned";
  useEffect(() => {
    if (toPay) router.replace({ pathname: "/checkout/pay/[checkoutId]", params: { checkoutId } });
    if (status === "paid" || placedDelivery) {
      clearCart();
      if (draft.checkoutId === checkoutId) draft.finish(draft.placed);
    }
  }, [toPay, placedDelivery, status, checkoutId, clearCart, draft]);

  if (summary === undefined || toPay) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Skeleton width={84} height={84} radius={42} />
          <Skeleton height={34} width={260} />
          <Skeleton height={200} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (summary === null) {
    return (
      <StatusScreen
        icon={Info}
        tone="pending"
        title="We couldn't find this order"
        message="It may have been placed on another phone or account."
        actions={<Button label="Back to shopping" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/home")} />}
      />
    );
  }

  const first = summary.contact.name.trim().split(/\s+/)[0] ?? "";
  const orders = summary.orders;
  const delivery = summary.fulfilment === "delivery";
  const unpaid = delivery && summary.status !== "paid";
  const billReady = unpaid && summary.status === "awaiting_payment" && !!summary.payToken;
  const street = summary.address?.street ?? (draft.placed?.checkoutId === checkoutId ? draft.placed.street : undefined);
  const many = orders.length > 1;

  const steps = [
    { title: many ? "The farms accept and pack your orders" : "The farm accepts and packs your order", detail: "Usually within a few hours" },
    ...(delivery
      ? [
          { title: "We price the delivery and send your bill", detail: "By email, text and in the app. You'll have 12 hours to pay." },
          { title: street ? `A Farmkeke rider delivers to ${street}` : "A Farmkeke rider delivers to your address", detail: "Once you've paid" },
        ]
      : [{ title: many ? "Collect each order at its farm" : "Collect your order at the farm", detail: "We'll send the farm's address and your 4-digit code when it's ready. You have 3 days." }]),
    { title: "You check everything and confirm receipt", detail: `Then ${many ? "each farm is" : "the farm is"} paid. Something wrong? Report it before confirming.` },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Stagger>
          <View style={styles.hero}>
            <View style={styles.tick}>
              <Check size={40} color={colors.forest} strokeWidth={2.5} />
            </View>
            <Text variant="displaySmall" align="center" accessibilityRole="header" style={styles.heroTitle}>
              Order placed{first ? `. Thank you, ${first}` : ""}
            </Text>
            <Text variant="body" color={colors.inkSoft} align="center">
              We've sent your {many ? "orders to the farms" : "order to the farm"}.{unpaid ? " Nothing to pay yet." : ""} We'll text{" "}
              {displayPhone(summary.contact.phone)} at every step.
            </Text>
          </View>

          {billReady ? (
            <View style={styles.bill}>
              <Receipt size={24} color={colors.pendingInk} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">Your bill is ready: {formatNaira(summary.totalKobo)}</Text>
                <Text variant="small">Delivery included. Pay it from your order before it runs out.</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text variant="heading" style={styles.flex}>
                Your {many ? "orders" : "order"}
              </Text>
              <View style={[styles.badge, unpaid ? styles.badgePending : styles.badgeHeld]}>
                {unpaid ? null : <ShieldCheck size={14} color={colors.forest} variant="solid" />}
                <Text variant="small" color={unpaid ? colors.pendingInk : colors.forest} style={styles.semibold}>
                  {unpaid ? (billReady ? "Bill ready" : "Bill coming soon") : `${formatNaira(summary.totalKobo)} held safely`}
                </Text>
              </View>
            </View>
            {orders.map((o) => (
              <View key={o._id} style={styles.order}>
                <Avatar name={o.farmName} size={44} />
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={1} style={styles.semibold}>
                    {o.number} · {o.farmName}
                  </Text>
                  <Text variant="small">
                    {plural(o.itemCount, "item")} · {formatNaira(o.totalKobo)}
                    {o.fulfilment === "delivery" ? (o.deliveryPricedAt || o.paid ? " with delivery" : " · delivery priced later") : ""}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.cardNote}>
              <Info size={18} color={colors.forest} />
              <Text variant="small" style={styles.flex}>
                {delivery
                  ? many
                    ? "Farms have up to 24 hours to accept. If one doesn't, that order is left off your bill."
                    : "The farm has up to 24 hours to accept. If it doesn't, the order is cancelled and you pay nothing."
                  : many
                    ? "Farms have up to 24 hours to accept. If one doesn't, that order is refunded in full."
                    : "The farm has up to 24 hours to accept. If it doesn't, your order is refunded in full."}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text variant="heading">What happens next</Text>
            {steps.map((s, i) => (
              <View key={s.title} style={styles.step}>
                <View style={[styles.stepNum, i === 0 && styles.stepNumOn]}>
                  <Text variant="small" color={i === 0 ? colors.ink : colors.inkSoft} style={styles.bold}>
                    {i + 1}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="label">{s.title}</Text>
                  <Text variant="small">{s.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          {summary.isGuest ? <SaveDetails name={summary.contact.name} email={summary.contact.email ?? ""} count={orders.length} /> : null}
        </Stagger>
      </ScrollView>
      <View style={styles.footer}>
        <Button label={`Track your ${many ? "orders" : "order"}`} size="large" pill fullWidth onPress={() => router.replace("/orders")} />
        <Button label="Continue shopping" variant="ghost" fullWidth onPress={() => router.replace("/home")} />
      </View>
    </SafeAreaView>
  );
}

// M-49
function SaveDetails({ name, email: initialEmail, count }: { name: string; email: string; count: number }) {
  const { signIn } = useAuthActions();
  const startClaim = useMutation(api.orders.consumer.startGuestClaim);
  const claim = useMutation(api.orders.consumer.claimGuestOrders);
  const saveToken = useClaim((s) => s.save);
  const forgetToken = useClaim((s) => s.forget);
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const submit = async () => {
    const e: typeof errors = {};
    if (!isEmail(email)) e.email = "Enter your email address, e.g. name@example.com.";
    if (!passwordRules(password).every((r) => r.met)) e.password = "Use at least 8 characters, with letters and at least one number.";
    setErrors(e);
    setTaken(false);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    try {
      const { token } = await startClaim({});
      saveToken(token);
      await signIn("password", { flow: "signUp", email: email.trim(), password, name });
      setAccountSignedIn(true);
      const moved = await claimPendingGuestOrders(claim);
      setDone(moved ?? count);
    } catch (err) {
      const code = errorCode(err);
      if (code === "EMAIL_TAKEN") {
        // Keep the claim token: signing in moves the orders over.
        setTaken(true);
      } else {
        forgetToken();
        setErrors(
          code === "INVALID_EMAIL"
            ? { email: "Check the email address, e.g. name@example.com." }
            : code === "WEAK_PASSWORD"
              ? { password: "Use at least 8 characters, with letters and at least one number." }
              : { form: "We couldn't create your account. Check your connection and try again." },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (done !== null) {
    return (
      <View style={[styles.card, styles.saved]} accessibilityLiveRegion="polite">
        <CheckCircle size={28} color={colors.forest} variant="solid" />
        <Text variant="heading">Your details are saved</Text>
        <Text variant="caption">
          {done > 0
            ? `Your ${plural(done, "order")} ${done === 1 ? "is" : "are"} now in your account. Track ${done === 1 ? "it" : "them"} from any phone.`
            : "You're signed in. Track your orders from any phone."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.recommended}>
        <Text variant="small" color={colors.forest} style={styles.semibold}>
          Recommended
        </Text>
      </View>
      <Text variant="heading">Save your details as an account</Text>
      <Text variant="caption">
        Track {count > 1 ? "these orders" : "this order"} from any phone, check out faster and keep your addresses. Your{" "}
        {plural(count, "order")} will be added to your account.
      </Text>
      <TextField label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Create a password" password value={password} onChangeText={setPassword} error={errors.password} autoComplete="new-password" textContentType="newPassword" />
      {password.length > 0 ? <PasswordRules password={password} /> : null}
      {taken ? (
        <Notice tone="pending">
          <Text variant="caption" color={colors.pendingInk}>
            There's already an account with this email.{" "}
            <Text variant="label" color={colors.pendingInk} style={styles.underline} onPress={() => router.push("/sign-in")}>
              Sign in instead
            </Text>{" "}
            and we'll add your {plural(count, "order")} to it.
          </Text>
        </Notice>
      ) : null}
      {errors.form ? <Notice tone="error">{errors.form}</Notice> : null}
      <Button label="Create account" variant="black" size="large" fullWidth loading={busy} onPress={() => void submit()} />
      <Text variant="small">Without an account, only this phone can confirm delivery.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  semibold: { fontFamily: fonts.semibold },
  underline: { textDecorationLine: "underline" },
  body: { paddingHorizontal: spacing.screen, paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { alignItems: "center", gap: spacing.sm, paddingBottom: spacing.sm },
  tick: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  heroTitle: { fontFamily: fonts.displayBold },
  bill: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg + 4, backgroundColor: colors.pendingSoft },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeHeld: { backgroundColor: colors.tint },
  badgePending: { backgroundColor: colors.pendingSoft },
  order: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardNote: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  stepNumOn: { backgroundColor: colors.lime },
  saved: { alignItems: "flex-start" },
  recommended: { alignSelf: "flex-start", backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs, backgroundColor: colors.canvas },
});
