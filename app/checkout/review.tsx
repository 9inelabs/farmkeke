// M-41 Order review, with M-42 "How escrow works". Pickup: "Pay" places the
// cart with checkout.place (one checkout, one order per farm, stock held for
// an hour) and opens the payment screen. Delivery: "Place order" sends the
// orders to the farms unpaid; the shopper pays the bill once the deliveries
// are priced. Guests get a guest identity on this phone first, which is what
// lets only this phone confirm delivery later.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Lock, Pin, Send, ShieldCheck, Truck, User, type IconComponent } from "@/components/icons";
import { BottomSheet, Button, Notice, Text } from "@/components/ui";
import { Card, CheckoutShell } from "@/features/checkout/CheckoutShell";
import { useCheckoutDraft } from "@/features/checkout/draft";
import { groupByFarm, plural, useQuote } from "@/features/checkout/useQuote";
import { errorCode, errorData } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { displayPhone, validPhone } from "@/lib/phone";
import { useEnsureIdentity } from "@/lib/session";
import { quoteItems } from "@/store/cart";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const ESCROW = [
  { title: "You pay Farmkeke", body: "Not the farm directly" },
  { title: "We hold it safely", body: "While the farm prepares your order" },
  { title: "You confirm, they're paid", body: "Problem? Report it and we step in" },
];
const ESCROW_DELIVERY = [
  { title: "The farm accepts", body: "And packs your order" },
  { title: "You pay your bill", body: "Products plus delivery, within 12 hours" },
  { title: "You confirm, they're paid", body: "We hold your money until then" },
];

type Problem = { message: string; fix?: { href: Href; label: string } };

function problemFor(e: unknown): Problem {
  switch (errorCode(e)) {
    case "TOTAL_CHANGED":
      return { message: `The total changed to ${formatNaira(errorData<{ totalKobo: number }>(e).totalKobo ?? 0)} while you were checking out. Check the new total, then try again.` };
    case "NOTE_TOO_LONG":
      return { message: "Your note for the rider is too long. Keep it to 200 characters.", fix: { href: "/checkout/details", label: "Edit your note" } };
    case "EMAIL_REQUIRED":
      return { message: "Add your email so we can send your bill once the delivery is priced.", fix: { href: "/checkout/details", label: "Add your email" } };
    case "TOO_MANY_UNPAID":
      return { message: "You already have unpaid delivery orders waiting for their bill. Pay one of those first, or choose pickup.", fix: { href: "/orders", label: "See your orders" } };
    case "FULFILMENT_NOT_OFFERED":
      return { message: "One of the farms doesn't offer this option for an item in your cart. Choose delivery or pickup again.", fix: { href: "/checkout/method", label: "Change delivery or pickup" } };
    case "AREA_NOT_SERVED":
      return { message: "We don't deliver to that area yet. Choose another area, or pick up instead.", fix: { href: "/checkout/method", label: "Change delivery or pickup" } };
    case "STREET_REQUIRED":
    case "LANDMARK_REQUIRED":
    case "ADDRESS_REQUIRED":
      return { message: "Your address is missing a street or landmark. Add it to continue.", fix: { href: "/checkout/details", label: "Add your address" } };
    case "NAME_REQUIRED":
    case "INVALID_PHONE":
    case "INVALID_EMAIL":
      return { message: "Please check your name, phone number and email.", fix: { href: "/checkout", label: "Edit contact details" } };
    case "BLOCKED":
      return { message: "This account can't place orders right now. Contact support@farmkeke.com." };
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return { message: "You've started a lot of checkouts in the last hour. Wait a little, then try again." };
    default:
      return { message: "We couldn't place your order. Check your connection and try again. You haven't been charged." };
  }
}

export default function Review() {
  const d = useCheckoutDraft();
  const fulfilment = d.fulfilment ?? "delivery";
  const delivery = fulfilment === "delivery";
  const { quote, lines, area } = useQuote(fulfilment);
  const farms = groupByFarm(lines);
  const place = useMutation(api.checkout.place);
  const ensureIdentity = useEnsureIdentity();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [escrowOpen, setEscrowOpen] = useState(false);

  const total = quote?.totalKobo;
  const phone = validPhone(d.contact.phone);
  const farmQuote = new Map((quote?.farms ?? []).map((f) => [f.farmId as string, f]));
  const serverLine = new Map<string, NonNullable<typeof quote>["farms"][number]["lines"][number]>(
    (quote?.farms ?? []).flatMap((f) => f.lines.map((l) => [`${l.listingId}:${l.unitId}`, l] as const)),
  );

  const submit = async () => {
    if (busy || !quote || total === undefined) return;
    if (quote.changes.length > 0) return router.replace("/cart");
    setBusy(true);
    setProblem(null);
    try {
      await ensureIdentity();
      const result = await place({
        items: quoteItems(lines),
        fulfilment,
        expectedTotalKobo: total,
        address: delivery
          ? {
              street: d.address.street,
              landmark: d.address.landmark,
              serviceAreaId: area?.serviceAreaId,
              latitude: d.address.latitude,
              longitude: d.address.longitude,
              note: d.address.note.trim() || undefined,
            }
          : undefined,
        contact: { name: d.contact.name, phone: phone ? `+234${phone}` : d.contact.phone, email: d.contact.email || undefined },
        replaces: delivery ? undefined : (d.checkoutId ?? undefined),
      });
      const placed = { checkoutId: result.checkoutId as string, street: delivery ? d.address.street : undefined };
      if (result.payNow === false) {
        // Delivery: nothing to pay yet. The bill comes once the deliveries are priced.
        d.finish(placed);
        // The checkout steps are done with: back to the tabs, then the confirmation on top
        if (router.canDismiss()) router.dismissAll();
        router.push({ pathname: "/order-placed/[checkoutId]", params: { checkoutId: placed.checkoutId } });
        return;
      }
      d.patch({ checkoutId: placed.checkoutId, placed });
      router.push({ pathname: "/checkout/pay/[checkoutId]", params: { checkoutId: placed.checkoutId } });
      setBusy(false);
    } catch (e) {
      setBusy(false);
      if (errorCode(e) === "CART_CHANGED") return router.replace("/cart");
      setProblem(problemFor(e));
    }
  };

  return (
    <CheckoutShell
      step={4}
      title="Check your order"
      subtitle={delivery ? "Make sure everything is right before you place it." : "Make sure everything is right before you pay."}
      footer={
        <>
          {problem ? (
            <Notice tone="error">
              <Text variant="caption" color={colors.error}>
                {problem.message}
                {problem.fix ? (
                  <Text variant="label" color={colors.error} style={styles.underline} onPress={() => router.navigate(problem.fix!.href)}>
                    {` ${problem.fix.label}`}
                  </Text>
                ) : null}
              </Text>
            </Notice>
          ) : null}
          <View style={styles.totalRow}>
            <Text variant="bodyMedium">{delivery ? "Products total" : "Total to pay"}</Text>
            <Text variant="title" style={styles.total}>
              {total !== undefined ? formatNaira(total) : "…"}
            </Text>
          </View>
          <Button
            label={delivery ? "Place order" : total !== undefined ? `Pay ${formatNaira(total)}` : "Pay"}
            icon={delivery ? Send : Lock}
            variant={delivery ? "primary" : "dark"}
            size="large"
            pill
            fullWidth
            loading={busy}
            disabled={!quote}
            onPress={() => void submit()}
          />
          <Text variant="small" align="center">
            {delivery ? "Nothing to pay now. " : "Card, bank transfer or USSD · Secured by Paystack. "}By {delivery ? "placing your order" : "paying"} you agree to the{" "}
            <Text variant="small" color={colors.forest} style={styles.underline} onPress={() => router.push("/legal/terms")}>
              Terms
            </Text>{" "}
            and{" "}
            <Text variant="small" color={colors.forest} style={styles.underline} onPress={() => router.push("/legal/refunds")}>
              Refund policy
            </Text>
            .
          </Text>
        </>
      }
    >
      <Card style={styles.blocks}>
        <Block
          icon={User}
          label="Contact"
          title={d.contact.name}
          detail={[phone ? displayPhone(phone) : d.contact.phone, d.contact.email].filter(Boolean).join(" · ")}
          onEdit={() => router.navigate("/checkout")}
        />
        {delivery ? (
          <Block
            icon={Truck}
            label="Home delivery"
            title={[d.address.street, area?.name].filter(Boolean).join(", ")}
            detail={[d.address.landmark, d.address.note.trim()].filter(Boolean).join(" · ")}
            onEdit={() => router.navigate("/checkout/details")}
          />
        ) : (
          <Block
            icon={Pin}
            label="Pickup at the farm"
            title={farms.length > 1 ? `Collect from ${farms.length} farms` : `Collect from ${farms[0]?.farmName ?? "the farm"}`}
            detail="We'll send the farm's address and your 4-digit code when it's ready. You have 3 days to collect."
            onEdit={() => router.navigate("/checkout/method")}
          />
        )}
      </Card>

      {farms.map((g, gi) => {
        const fq = farmQuote.get(g.farmId);
        return (
          <Card key={g.farmId}>
            <View style={styles.orderHead}>
              <Text variant="heading" style={styles.flex} numberOfLines={1}>
                Order {gi + 1} · {g.farmName}
              </Text>
              <View style={styles.badge}>
                <Text variant="small" color={colors.forest}>
                  {delivery ? "Delivery priced later" : "Pickup · No fee"}
                </Text>
              </View>
            </View>
            {g.lines.map((l) => {
              const s = serverLine.get(`${l.listingId}:${l.unitId}`);
              return (
                <View key={`${l.listingId}:${l.unitId}`} style={styles.line}>
                  {l.imageUrl ? <Image source={{ uri: l.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text variant="small">
                      {s?.quantity ?? l.quantity} × {formatNaira(s?.priceKobo ?? l.priceKobo)} per {l.unitSingular}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.bold}>
                    {formatNaira(s?.lineTotalKobo ?? l.priceKobo * l.quantity)}
                  </Text>
                </View>
              );
            })}
            {fq ? (
              <View style={styles.subtotal}>
                <Text variant="caption" style={styles.flex}>
                  {g.farmName} subtotal
                </Text>
                <Text variant="bodyMedium" style={styles.bold}>
                  {formatNaira(fq.itemsTotalKobo)}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Pressable accessibilityRole="button" onPress={() => setEscrowOpen(true)} style={styles.escrow}>
        <ShieldCheck size={22} color={colors.forest} variant="solid" />
        <View style={styles.flex}>
          <Text variant="label">Your money is held safely</Text>
          <Text variant="small">
            {delivery
              ? `If a farm declines or doesn't accept within 24 hours, that order is left off your bill.`
              : `If a farm declines or doesn't accept within 24 hours, that order is refunded in full.`}
          </Text>
        </View>
        <Text variant="label" color={colors.limeInk}>
          How?
        </Text>
      </Pressable>
      <Text variant="small" style={styles.items}>
        {plural(lines.length, "item")} from {plural(farms.length, "farm")}. Each farm becomes its own order.
      </Text>

      <BottomSheet visible={escrowOpen} onClose={() => setEscrowOpen(false)}>
        <Text variant="title" style={styles.sheetTitle}>
          How your money is protected
        </Text>
        {(delivery ? ESCROW_DELIVERY : ESCROW).map((s, i) => (
          <View key={s.title} style={styles.escrowStep}>
            <View style={styles.escrowNum}>
              <Text variant="label" style={styles.bold}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="bodyMedium">{s.title}</Text>
              <Text variant="caption">{s.body}</Text>
            </View>
          </View>
        ))}
        <Button label="Got it" variant="dark" size="large" pill fullWidth onPress={() => setEscrowOpen(false)} style={styles.gotIt} />
      </BottomSheet>
    </CheckoutShell>
  );
}

function Block({ icon: Icon, label, title, detail, onEdit }: { icon: IconComponent; label: string; title: string; detail: string; onEdit: () => void }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockIcon}>
        <Icon size={20} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <Text variant="small">{label}</Text>
        <Text variant="bodyMedium">{title}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <Text variant="label" color={colors.limeInk} accessibilityRole="button" accessibilityLabel={`Edit ${label.toLowerCase()}`} onPress={onEdit} style={styles.edit}>
        Edit
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  underline: { textDecorationLine: "underline" },
  blocks: { gap: 0, paddingVertical: spacing.xs },
  block: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.md },
  blockIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  edit: { paddingVertical: spacing.xs },
  orderHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.placeholder },
  subtotal: { flexDirection: "row", alignItems: "center", backgroundColor: colors.tint, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  escrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  items: { paddingHorizontal: spacing.xs },
  totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  total: { fontFamily: fonts.bold },
  sheetTitle: { marginTop: spacing.md, marginBottom: spacing.xs },
  escrowStep: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  escrowNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  gotIt: { marginTop: spacing.sm, marginBottom: spacing.sm },
});

