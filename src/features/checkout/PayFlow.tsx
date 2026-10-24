// M-43 Payment method, M-44 Payment in progress, M-45 Payment failed, M-46
// Awaiting payment confirmation. Used for a pickup checkout (by its id) and
// for a delivery bill (by its pay token, from the order or the bill's link,
// which works for whoever has it, e.g. someone paying for a family member).
// - Live: payments/checkout.start opens a Paystack transaction, shown in an
//   in-app browser. Paystack's return page sends the shopper back to
//   farmkeke://checkout/pay/<id>?reference=… (a bill: farmkeke://pay/<token>),
//   which closes the browser. While the page is open the app also checks
//   with Paystack every few seconds, and closes the page itself once the
//   payment lands, in case the browser won't hand the link back.
// - Test: "Pay now (test)" calls payments/checkout.markPaidTest.
// The checkout query is live, so a webhook marking it paid moves the screen
// on by itself; `verify` asks Paystack directly while we wait.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank, Card as CardIcon, Clock, Lock, Phone, Refresh, ShieldCheck, Warning, type IconComponent } from "@/components/icons";
import { Button, Notice, ScreenHeader, Skeleton, StatusScreen, Text } from "@/components/ui";
import { useCheckoutDraft } from "@/features/checkout/draft";
import { paySession } from "@/features/checkout/paySession";
import { dayTime } from "@/features/orders/format";
import { useEnsureIdentity } from "@/lib/session";
import { errorCode } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { showToast } from "@/store/toast";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Method = "card" | "bank_transfer" | "ussd";
type Phase = "auto" | "choose" | "confirming" | "awaiting";

const METHODS: { id: Method; label: string; body: string; icon: IconComponent }[] = [
  { id: "card", label: "Card", body: "Debit or credit card. Paystack asks for the number, expiry and CVV.", icon: CardIcon },
  { id: "bank_transfer", label: "Bank transfer", body: "Paystack gives you an account number. Confirmed automatically, usually within minutes.", icon: Bank },
  { id: "ussd", label: "USSD", body: "Dial a code from the phone number linked to your bank account.", icon: Phone },
];

type Props = {
  /** A checkout the viewer placed (pickup), or the one behind a bill they own. */
  checkoutId?: string;
  /** A delivery bill's pay token. */
  payToken?: string;
  /** Back from Paystack with ?reference= */
  returned?: boolean;
};

export function PayFlow({ checkoutId: fromRoute, payToken, returned = false }: Props) {
  const { isLoading: authLoading } = useConvexAuth();
  const owned = useQuery(api.payments.checkout.get, authLoading || payToken || !fromRoute ? "skip" : { checkoutId: fromRoute });
  const billed = useQuery(api.payments.checkout.bill, authLoading || !payToken ? "skip" : { token: payToken });
  const checkout = payToken ? billed : owned;
  const isBill = !!payToken;
  const checkoutIdStr = checkout?._id ?? fromRoute ?? "";
  const id = checkoutIdStr as Id<"checkouts">;
  const ensureIdentity = useEnsureIdentity();
  const start = useAction(api.payments.checkout.start);
  const verify = useAction(api.payments.checkout.verify);
  const markPaidTest = useMutation(api.payments.checkout.markPaidTest);
  const draftCheckoutId = useCheckoutDraft((s) => s.checkoutId);
  const patchDraft = useCheckoutDraft((s) => s.patch);

  const [phase, setPhase] = useState<Phase>(returned ? "confirming" : "auto");
  const [method, setMethod] = useState<Method>("card");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const config = checkout?.payments;
  const paid = checkout?.status === "paid";
  // Someone else's bill: stay here and say thank you (their orders aren't ours to show)
  const paidElsewhere = paid && isBill && checkout?.isOwner === false;
  const firstOrder = checkout?.orders[0]?._id;
  // Paid while this screen was open, rather than opened on a bill paid before
  const sawUnpaid = useRef(false);
  if (checkout?.status === "awaiting_payment") sawUnpaid.current = true;
  useEffect(() => {
    if (!paid || paidElsewhere) return;
    if (isBill) {
      // A paid bill: back to the order it was for
      showToast({ message: sawUnpaid.current ? "Payment received" : "This bill is already paid" });
      if (firstOrder) router.replace({ pathname: "/order/[id]", params: { id: firstOrder } });
      else router.replace("/orders");
      return;
    }
    // Paid: the checkout steps are done with. Back to the tabs, then the confirmation on top.
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: "/order-placed/[checkoutId]", params: { checkoutId: checkoutIdStr } });
  }, [paid, paidElsewhere, isBill, firstOrder, checkoutIdStr]);

  const check = useCallback(async () => {
    try {
      await verify({ checkoutId: id, payToken });
    } catch {
      // Offline or Paystack slow: the live query still updates on its own.
    }
  }, [verify, id, payToken]);

  // M-44: ask Paystack every few seconds; after 30s show M-46 instead.
  const awaitingPayment = checkout?.status === "awaiting_payment";
  useEffect(() => {
    if (phase !== "confirming" || !awaitingPayment) return;
    void check();
    const every = setInterval(() => void check(), 4000);
    const giveUp = setTimeout(() => setPhase("awaiting"), 30_000);
    return () => {
      clearInterval(every);
      clearTimeout(giveUp);
    };
  }, [phase, awaitingPayment, check]);

  const last = checkout?.lastAttempt ?? null;
  // Cancelled on Paystack's page: its return page says so, so no waiting for an answer
  const cancelled = last?.status === "abandoned";
  useEffect(() => {
    if (phase !== "confirming" || !cancelled) return;
    setPhase("auto");
    setNote("The payment wasn't finished. You haven't been charged.");
  }, [phase, cancelled]);
  const pendingTransfer = (last?.status === "opened" || last?.status === "started") && (last.method === "bank_transfer" || last.method === "ussd");
  const view: "choose" | "confirming" | "awaiting" | "failed" =
    phase === "choose"
      ? "choose"
      : last?.status === "failed" && phase !== "auto"
        ? "failed"
        : phase === "confirming"
          ? "confirming"
          : phase === "awaiting" || (phase === "auto" && pendingTransfer)
            ? "awaiting"
            : last?.status === "failed"
              ? "failed"
              : "choose";

  // M-46: keep checking quietly.
  useEffect(() => {
    if (view !== "awaiting" || !awaitingPayment) return;
    const every = setInterval(() => void check(), 15_000);
    return () => clearInterval(every);
  }, [view, awaitingPayment, check]);

  const expired = checkout != null && checkout.status !== "awaiting_payment" && checkout.status !== "paid";
  useEffect(() => {
    if (expired && draftCheckoutId === checkoutIdStr) patchDraft({ checkoutId: null });
  }, [expired, draftCheckoutId, checkoutIdStr, patchDraft]);

  const begin = async (m: Method) => {
    if (opening || !config) return;
    setOpening(true);
    setError(null);
    setNote(null);
    setMethod(m);
    try {
      // Paying from a bill's link on a phone that isn't signed in: a guest session to pay with
      if (isBill) await ensureIdentity();
      if (!config.live) {
        await markPaidTest({ checkoutId: id, payToken });
        return;
      }
      const r = await start({ checkoutId: id, method: m, returnTo: Platform.OS === "web" ? "web" : "app", payToken });
      if (Platform.OS === "web") {
        // The browser preview: Paystack opens in a new tab, and this screen waits for the answer.
        await WebBrowser.openBrowserAsync(r.authorizationUrl);
        setPhase("confirming");
        return;
      }
      // Where Paystack's return page sends the shopper: the screen this payment started on
      const returnLink = payToken ? `farmkeke://pay/${encodeURIComponent(payToken)}` : `farmkeke://checkout/pay/${encodeURIComponent(checkoutIdStr)}`;
      const end = paySession.begin();
      // While Paystack is showing: once the payment lands, close the page ourselves
      let landed = false;
      const watch = setInterval(() => {
        verify({ checkoutId: id, payToken, open: true }).then(
          (v) => {
            if (!v.paid || landed) return;
            landed = true;
            try {
              WebBrowser.dismissAuthSession();
            } catch {
              // Android can't close it from here; the screen behind has already moved on
            }
          },
          () => undefined,
        );
      }, 5000);
      let result: WebBrowser.WebBrowserAuthSessionResult;
      try {
        result = await WebBrowser.openAuthSessionAsync(r.authorizationUrl, returnLink, {
          // iOS: no "wants to use paystack.co to sign in" prompt; a payment needs no shared cookies
          preferEphemeralSession: true,
          // Android: the page opens over the app, so the link back closes it
          createTask: false,
          showTitle: true,
          toolbarColor: colors.white,
          controlsColor: colors.forest,
        });
      } finally {
        clearInterval(watch);
        end();
      }
      if (result.type === "success" || landed) {
        setPhase("confirming");
        return;
      }
      // Closed before Paystack sent them back: it may still have gone through
      const now = await verify({ checkoutId: id, payToken }).catch(() => null);
      if (now?.paid) return;
      if (m === "card") {
        // Back to choosing; a declined card shows M-45 with Paystack's reason
        setPhase("auto");
        setNote("The payment wasn't finished. You haven't been charged.");
      } else {
        // A transfer or USSD may already be on its way
        setPhase("awaiting");
      }
    } catch (e) {
      const code = errorCode(e);
      setError(
        code === "RATE_LIMITED"
          ? "Too many payment attempts. Wait a few minutes, then try again."
          : code === "CHECKOUT_EXPIRED" || code === "NOT_PAYABLE"
            ? isBill
              ? "This bill has expired, so the order was cancelled. You weren't charged."
              : "This checkout has expired. Go back to your cart to start again."
            : code === "ALREADY_PAID"
              ? "This has already been paid."
            : "We couldn't open the payment. Check your connection and try again. You haven't been charged.",
      );
    } finally {
      setOpening(false);
    }
  };

  if (checkout === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Payment" />
        <View style={styles.body}>
          <Skeleton height={120} radius={radii.lg} />
          <Skeleton height={240} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }

  if (checkout === null) {
    return (
      <StatusScreen
        icon={Warning}
        tone="pending"
        title={isBill ? "We couldn't find this bill" : "We couldn't find this payment"}
        message={isBill ? "The link may be incomplete. Open it again from the text or email we sent." : "It may have been started on another phone or account."}
        actions={<Button label={isBill ? "Go to my orders" : "Back to my cart"} variant="dark" size="large" pill fullWidth onPress={() => router.replace(isBill ? "/orders" : "/cart")} />}
      />
    );
  }

  if (checkout.status === "awaiting_bill") {
    return (
      <StatusScreen
        icon={Clock}
        tone="pending"
        title="Your bill isn't ready yet"
        message="The farm is packing the order and we're arranging a rider. We'll send the bill by email, text and in the app, with 12 hours to pay."
        actions={<Button label="Go to my orders" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/orders")} />}
      />
    );
  }

  if (expired) {
    return (
      <StatusScreen
        icon={Clock}
        tone="pending"
        title={isBill ? "This bill has expired" : "This payment has expired"}
        message={
          isBill
            ? "The bill wasn't paid in time, so the order was cancelled and you weren't charged. You can order again from the farm."
            : "We hold stock for an hour while you pay. Your cart is still here, so you can check out again."
        }
        actions={<Button label={isBill ? "Go to my orders" : "Back to my cart"} variant="dark" size="large" pill fullWidth onPress={() => router.replace(isBill ? "/orders" : "/cart")} />}
      />
    );
  }

  if (paidElsewhere) {
    return (
      <StatusScreen
        icon={ShieldCheck}
        title="Bill paid. Thank you"
        message={`${formatNaira(checkout.totalKobo)} is held safely by Farmkeke until ${checkout.contact.name || "the shopper"} confirms the order arrived.`}
        actions={<Button label="Shop on Farmkeke" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/home")} />}
      />
    );
  }

  // M-44
  if (view === "confirming" || paid) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <View style={styles.spinnerRing}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
        <Text variant="displaySmall" align="center" accessibilityRole="header">
          Confirming your payment
        </Text>
        <Text variant="body" color={colors.inkSoft} align="center" style={styles.centerCopy}>
          This usually takes a few seconds. Please don't close the app.
        </Text>
        <Text variant="small" align="center">
          {formatNaira(checkout.totalKobo)} · {checkout.reference}
        </Text>
      </SafeAreaView>
    );
  }

  // M-45
  if (view === "failed") {
    return (
      <StatusScreen
        icon={Warning}
        tone="error"
        title="Your payment didn't go through"
        message={`${last?.reason ? `${last.reason}. ` : ""}You haven't been charged. Try again, or use another way to pay.`}
        actions={
          <>
            <Button label={`Try again with ${METHODS.find((x) => x.id === (last?.method ?? method))?.label.toLowerCase() ?? "card"}`} variant="dark" size="large" pill fullWidth loading={opening} onPress={() => void begin((last?.method as Method) ?? method)} />
            <Button
              label="Change payment method"
              variant="ghost"
              fullWidth
              onPress={() => {
                setNote(null);
                setPhase("choose");
              }}
            />
          </>
        }
      />
    );
  }

  // M-46
  if (view === "awaiting") {
    return (
      <StatusScreen
        icon={Clock}
        tone="pending"
        title="Waiting for your bank"
        message="Transfers and USSD can take a few minutes to confirm. We'll move you on as soon as it lands, and text you too. If you haven't sent it yet, you still can."
        actions={
          <>
            <Button label="Check again" icon={Refresh} variant="dark" size="large" pill fullWidth onPress={() => setPhase("confirming")} />
            <Button label="Choose another way to pay" variant="ghost" fullWidth onPress={() => setPhase("choose")} />
          </>
        }
      >
        <Text variant="small" align="center">
          {formatNaira(checkout.totalKobo)} · {checkout.reference}
        </Text>
      </StatusScreen>
    );
  }

  // M-43
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={isBill ? "Your bill" : "Payment"} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.amount}>
          <Text variant="small" color="rgba(255,255,255,0.7)">
            {isBill ? `Bill for ${checkout.isOwner ? "your delivery" : `${checkout.contact.name || "a Farmkeke"}'s order`}` : "Total to pay"}
          </Text>
          <Text style={styles.amountText}>{formatNaira(checkout.totalKobo)}</Text>
          <View style={styles.held}>
            <ShieldCheck size={16} color={colors.lime} variant="solid" />
            <Text variant="small" color={colors.white}>
              Held safely until you confirm you've got your order
            </Text>
          </View>
        </View>

        {isBill ? (
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text variant="caption">Products ({checkout.orders.length === 1 ? checkout.orders[0]?.farmName : `${checkout.orders.length} farms`})</Text>
              <Text variant="label">{formatNaira(checkout.itemsTotalKobo)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text variant="caption">Delivery</Text>
              <Text variant="label">{formatNaira(checkout.deliveryFeeKobo)}</Text>
            </View>
            {checkout.payBy ? (
              <Text variant="small" color={colors.pendingInk}>
                Pay by {dayTime(checkout.payBy)}, or the order is cancelled.
              </Text>
            ) : null}
          </View>
        ) : null}
        {config?.live ? (
          <View style={styles.methods} accessibilityRole="radiogroup">
            <Text variant="overline">Choose how to pay</Text>
            {METHODS.map((m) => {
              const on = m.id === method;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setMethod(m.id)}
                  style={[styles.method, on && styles.methodOn]}
                >
                  <View style={[styles.methodIcon, on && styles.methodIconOn]}>
                    <m.icon size={22} color={colors.forest} variant={on ? "solid" : "line"} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyMedium" style={styles.semibold}>
                      {m.label}
                    </Text>
                    <Text variant="small">{m.body}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.dot} />}</View>
                </Pressable>
              );
            })}
          </View>
        ) : config?.testStep ? (
          <Notice tone="pending">Test mode: no real money moves. Tap Pay now (test) to mark this checkout paid.</Notice>
        ) : (
          <Notice tone="pending">Paying in the app isn't switched on yet. Your cart is saved; please try again a little later.</Notice>
        )}
        {error !== null ? <Notice tone="error">{error}</Notice> : note !== null ? <Notice tone="pending">{note}</Notice> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={config?.live ? `Pay ${formatNaira(checkout.totalKobo)}` : "Pay now (test)"}
          icon={Lock}
          variant="dark"
          size="large"
          pill
          fullWidth
          loading={opening}
          disabled={!config || (!config.live && !config.testStep)}
          onPress={() => void begin(method)}
        />
        <Text variant="small" align="center">
          Secured by Paystack · Ref {checkout.reference}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl, gap: spacing.md },
  centerCopy: { maxWidth: 300 },
  spinnerRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  body: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.lg },
  amount: { backgroundColor: colors.forest, borderRadius: radii.lg + 8, padding: spacing.xl, gap: spacing.xs },
  amountText: { fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 46, color: colors.white, letterSpacing: -0.5 },
  held: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  methods: { gap: spacing.sm },
  billCard: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  billRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  methodOn: { borderColor: colors.lime },
  methodIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  methodIconOn: { backgroundColor: colors.lime },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.forest },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.forest },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
});
