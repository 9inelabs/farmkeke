// The order screen's three faces: tracking (M-63, with the pickup code card
// and the next step), ended early (M-71), and view-only (Find my order on
// another phone). app/order/[id] loads the order; app/dev/orders draws sample
// orders with it.
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Call, ChevronRight, Clock, CloseCircle, Eye, Flag, Headphone, Help, Messages, Pin, Receipt, ShieldCheck, Star, type IconComponent } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Avatar, Button, ScreenHeader, StatusBadge, StatusScreen, Text, Timeline } from "@/components/ui";
import { formatHours } from "@/lib/hours";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { dayLabel, dayTime, shortName } from "./format";
import { PickupQr } from "./PickupQr";
import { badge, ENDED, RANK } from "./status";
import { orderSteps } from "./steps";
import type { OrderDetail } from "./useOrder";

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

export function OrderView({ order: o }: { order: OrderDetail }) {
  return o.viewOnly ? <ViewOnly o={o} /> : ENDED.includes(o.status) ? <Ended o={o} /> : <Tracking o={o} />;
}

// ---------------------------------------------------------------------------
// M-63

function Tracking({ o }: { o: OrderDetail }) {
  const pickup = o.fulfilment === "pickup";
  const b = badge(o.status, o.fulfilment, o.paid);
  const payToken = o.bill?.state === "ready_to_pay" ? o.bill.payToken : null;

  const riderCard = o.rider ? (
    <View style={styles.rider}>
      <Avatar name={o.rider.name} size={40} />
      <View style={styles.flex}>
        <Text variant="label">{shortName(o.rider.name)}</Text>
        <Text variant="small">Your Farmkeke rider</Text>
      </View>
      {o.rider.phone ? <Button label="Call" icon={Call} variant="secondary" size="small" onPress={() => void Linking.openURL(`tel:${o.rider!.phone}`)} /> : null}
    </View>
  ) : undefined;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Order" onBack={() => (router.canGoBack() ? router.back() : router.replace("/orders"))} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Stagger>
          <View style={styles.hero}>
            <Text variant="title" style={styles.number}>
              {o.number}
            </Text>
            <Text variant="caption">
              {o.farmName} · {pickup ? "Pickup at the farm" : "Home delivery"} · Ordered {dayLabel(o.placedAt)}
            </Text>
            <View style={styles.badges}>
              <StatusBadge label={b.label} tone={b.tone} />
              {o.escrow === "held" ? (
                <View style={styles.held}>
                  <ShieldCheck size={13} color={colors.forest} variant="solid" />
                  <Text variant="small" color={colors.forest} style={styles.medium}>
                    {formatNaira(o.totalKobo)} held
                  </Text>
                </View>
              ) : o.fulfilment === "delivery" && o.escrow === "none" ? (
                <StatusBadge label="Not paid yet" tone="neutral" />
              ) : null}
            </View>
          </View>

          {payToken ? (
            <View style={styles.bill}>
              <Receipt size={24} color={colors.pendingInk} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">Your bill is ready: {formatNaira(o.bill!.totalKobo)}</Text>
                <Text variant="small">
                  Delivery included. Pay by {o.bill!.payBy ? dayTime(o.bill!.payBy) : "the time on your bill"}, or the order is cancelled.
                </Text>
              </View>
            </View>
          ) : null}

          {pickup && o.pickupCode ? <CodeCard o={o} /> : null}

          <NextStep o={o} payToken={payToken} />

          <View style={styles.card}>
            <Text variant="heading">Progress</Text>
            <Timeline steps={orderSteps(o, riderCard)} />
          </View>

          {pickup && o.collectFrom ? <CollectFrom o={o} /> : null}

          <Items o={o} />

          {!pickup && o.address ? (
            <Row icon={Pin} label="Delivering to" title={[o.address.street, o.address.areaName ?? o.address.lga].filter(Boolean).join(", ")} detail={[o.address.landmark, o.address.note].filter(Boolean).join(" · ")} />
          ) : null}
          <Payment o={o} />

          <View style={styles.card}>
            <Text variant="overline">Need help?</Text>
            <HelpRow icon={Messages} label="Message the farmer" onPress={() => router.push({ pathname: "/order/[id]/chat", params: { id: o._id } })} />
            {o.disputeId ? (
              <HelpRow icon={Flag} label="View your problem report" onPress={() => router.push({ pathname: "/order/[id]/dispute", params: { id: o._id } })} />
            ) : o.canReport ? (
              <HelpRow icon={Flag} label="Report a problem" onPress={() => router.push({ pathname: "/order/[id]/problem", params: { id: o._id } })} />
            ) : null}
            <HelpRow icon={Headphone} label="Contact Farmkeke support" onPress={() => router.push({ pathname: "/support", params: { orderId: o._id } })} />
            <HelpRow icon={Help} label="Help and FAQ" onPress={() => router.push("/help")} />
          </View>
        </Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

function CodeCard({ o }: { o: OrderDetail }) {
  const code = o.pickupCode!;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open your pickup code full screen" onPress={() => router.push({ pathname: "/order/[id]/code", params: { id: o._id } })} style={styles.code}>
      <Text variant="label" color={colors.lime}>
        Your pickup code
      </Text>
      <View style={styles.codeRow}>
        <View style={styles.digits} accessible accessibilityLabel={`Pickup code ${code.split("").join(" ")}`}>
          {code.split("").map((d, i) => (
            <View key={i} style={styles.digit}>
              <Text style={styles.digitText}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={styles.qr}>
          <PickupQr code={code} size={64} />
        </View>
      </View>
      <Text variant="small" color="rgba(255,255,255,0.8)">
        Show this at the farm. Only hand it over when you're collecting your order. Tap to enlarge.
      </Text>
    </Pressable>
  );
}

function NextStep({ o, payToken }: { o: OrderDetail; payToken: string | null }) {
  const pickup = o.fulfilment === "pickup";
  const r = RANK[o.status] ?? 0;
  const rider = o.rider ? shortName(o.rider.name).split(" ")[0] : null;
  const first = o.items[0]?.name.toLowerCase();
  let title: string;
  let body: string;
  let action: ReactNode = null;
  // Under a confirm button that isn't available yet
  let hint: string | null = null;
  const confirm = () => router.push({ pathname: "/order/[id]/confirm", params: { id: o._id } });

  if (o.status === "completed") {
    title = "All done";
    body = `${formatNaira(o.totalKobo)} was released to ${o.farmName}. Thanks for buying direct from the farm.`;
    action = o.reviewed ? (
      <Button label={`Buy again from ${o.farmName}`} size="large" pill fullWidth onPress={() => router.push(`/farm/${o.farmId}`)} />
    ) : (
      <Button label="Rate your order" icon={Star} size="large" pill fullWidth onPress={() => router.push({ pathname: "/order/[id]/review", params: { id: o._id } })} />
    );
  } else if (o.status === "disputed") {
    title = "We're looking into your report";
    body = "Your payment stays held while the farm replies and our team reviews it. We'll text you with the outcome.";
    action = <Button label="Follow this case" size="large" pill fullWidth onPress={() => router.push({ pathname: "/order/[id]/dispute", params: { id: o._id } })} />;
  } else if (o.fulfilment === "delivery" && o.escrow === "none") {
    if (payToken) {
      title = "Pay your bill";
      body = `${o.farmName} has packed your order and a rider is arranged. Pay ${formatNaira(o.bill!.totalKobo)}, delivery included, and the rider brings it.`;
      action = <Button label={`Pay ${formatNaira(o.bill!.totalKobo)}`} size="large" pill fullWidth onPress={() => router.push({ pathname: "/pay/[token]", params: { token: payToken } })} />;
    } else {
      title = r <= 1 ? `Waiting for ${o.farmName} to accept` : "We're pricing your delivery";
      body = "Nothing to pay yet. We'll send your bill by email, text and in the app once a rider is arranged. You'll have 12 hours to pay.";
    }
  } else if (pickup) {
    title = "Collect your order, then confirm";
    body = "Check everything at the farm. Something wrong? Report a problem instead of confirming.";
    action = <Button label="I've collected my order" size="large" pill fullWidth disabled={!o.canConfirm} onPress={confirm} />;
    if (!o.canConfirm) hint = "Available once the farm hands it over";
  } else if (o.canConfirm && o.status === "out_for_delivery") {
    // The shopper marks it delivered themselves by confirming
    title = `${rider ?? "The rider"} is bringing your order`;
    body = "When it's in your hands, check everything, then confirm here. That marks it delivered and releases payment to the farm. Something wrong? Report a problem instead.";
    action = <Button label="I received everything" size="large" pill fullWidth onPress={confirm} />;
  } else if (o.canConfirm) {
    title = "Check everything arrived";
    body = "Then confirm receipt here to release payment to the farm. Something wrong? Report a problem instead.";
    action = <Button label="I received everything" size="large" pill fullWidth onPress={confirm} />;
  } else if (r >= 4) {
    title = first ? `Check your ${first} when ${o.items.length > 1 ? "your order arrives" : "it arrives"}` : "Check your order when it arrives";
    body = `Once ${rider ?? "the rider"} hands ${o.items.length > 1 ? "everything" : "it"} over, confirm receipt here to release payment to the farm.`;
    action = <Button label="I received everything" size="large" pill fullWidth disabled />;
    hint = "Available once your order is on its way";
  } else {
    title = r <= 1 ? `Waiting for ${o.farmName} to accept` : `${o.farmName} is getting your order ready`;
    body = "We'll text you when it's on its way. Your payment stays held until you confirm delivery.";
  }

  const dark = !pickup;
  return (
    <View style={[styles.next, dark ? styles.nextDark : styles.card]}>
      <Text variant="small" color={dark ? colors.lime : colors.limeInk} style={styles.semibold}>
        Next step
      </Text>
      <Text variant="heading" color={dark ? colors.white : colors.ink}>
        {title}
      </Text>
      <Text variant="caption" color={dark ? "rgba(255,255,255,0.8)" : colors.inkSoft}>
        {body}
      </Text>
      {action ? <View style={styles.nextAction}>{action}</View> : null}
      {hint ? (
        <Text variant="small" align="center" color={dark ? "rgba(255,255,255,0.7)" : colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function CollectFrom({ o }: { o: OrderDetail }) {
  const f = o.collectFrom!;
  const place = [f.address, f.lga, f.state].filter(Boolean).join(", ");
  const ready = (RANK[o.status] ?? 0) >= 4.5;
  return (
    <View style={styles.card}>
      <Text variant="small">Collect at the farm</Text>
      <Text variant="heading">{f.farmName}</Text>
      <Text variant="caption">{place}</Text>
      {f.hours && f.hours.length > 0 ? <Text variant="small">Hands over orders: {formatHours(f.hours)}</Text> : null}
      <Text variant="small">
        {ready && o.collectBy ? `Ready now. Collect by ${dayLabel(o.collectBy)}.` : `We'll tell you when it's ready. You'll have ${f.collectWithinDays} days to collect.`}
      </Text>
      <View style={styles.actions}>
        <Button
          label="Directions"
          icon={Pin}
          variant="secondary"
          size="small"
          onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.farmName}, ${place}`)}`)}
        />
        {f.phone ? <Button label="Call the farm" icon={Call} variant="secondary" size="small" onPress={() => void Linking.openURL(`tel:${f.phone}`)} /> : null}
      </View>
    </View>
  );
}

function Items({ o }: { o: OrderDetail }) {
  return (
    <View style={styles.card}>
      <Text variant="heading">{plural(o.items.length, "item")}</Text>
      {o.items.map((it) => (
        <View key={it.index} style={styles.item}>
          {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
          <View style={styles.flex}>
            <Text variant="label" numberOfLines={1}>
              {it.name}
            </Text>
            <Text variant="small">
              {it.quantity} × {formatNaira(it.priceKobo)} per {it.unitSingular}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.semibold}>
            {formatNaira(it.lineTotalKobo)}
          </Text>
        </View>
      ))}
      <View style={styles.totals}>
        <Line label="Items" value={formatNaira(o.itemsTotalKobo)} />
        {o.fulfilment === "delivery" ? (
          <Line label="Delivery" value={o.deliveryPricedAt || o.paid ? formatNaira(o.deliveryFeeKobo) : "Priced after the farm accepts"} />
        ) : (
          <Line label="Pickup" value="No fee" />
        )}
        <Line bold label={o.paid ? "Total paid" : o.deliveryPricedAt ? "Total to pay" : "Products total"} value={formatNaira(o.totalKobo)} />
      </View>
    </View>
  );
}

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text variant={bold ? "bodyMedium" : "caption"} style={bold && styles.semibold}>
        {label}
      </Text>
      <Text variant={bold ? "bodyMedium" : "caption"} style={bold && styles.bold}>
        {value}
      </Text>
    </View>
  );
}

function Payment({ o }: { o: OrderDetail }) {
  const [title, sub] =
    o.escrow === "held"
      ? [`${formatNaira(o.totalKobo)} held safely by Farmkeke`, o.status === "disputed" ? "Held until your report is resolved" : "Released only when you confirm"]
      : o.escrow === "released"
        ? [`${formatNaira(o.totalKobo)} released to ${o.farmName}`, o.releasedAt ? dayTime(o.releasedAt) : "After you confirmed receipt"]
        : o.escrow === "refunded"
          ? [`${formatNaira(o.totalKobo)} refunded to you`, "Back to how you paid"]
          : o.escrow === "split"
            ? ["Part refunded, part released", "See the refund for details"]
            : o.bill?.state === "ready_to_pay"
              ? [`Bill ready: ${formatNaira(o.bill.totalKobo)}`, o.bill.payBy ? `Pay by ${dayTime(o.bill.payBy)}` : "Delivery included"]
              : o.bill?.state === "waiting_for_price"
                ? ["Nothing to pay yet", "We'll send your bill once the delivery is priced"]
                : ["Payment pending", "We'll update this once your payment is confirmed"];
  const refundable = o.hasRefund;
  return (
    <Row
      icon={ShieldCheck}
      label="Payment"
      title={title}
      detail={sub}
      onPress={refundable ? () => router.push({ pathname: "/order/[id]/refund", params: { id: o._id } }) : undefined}
      link={refundable ? "View refund" : undefined}
    />
  );
}

function Row({ icon: Icon, label, title, detail, onPress, link }: { icon: IconComponent; label: string; title: string; detail?: string; onPress?: () => void; link?: string }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : undefined} style={[styles.card, styles.row]}>
      <View style={styles.rowIcon}>
        <Icon size={20} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <Text variant="small">{label}</Text>
        <Text variant="label">{title}</Text>
        {detail ? <Text variant="small">{detail}</Text> : null}
      </View>
      {link ? (
        <Text variant="label" color={colors.limeInk}>
          {link}
        </Text>
      ) : null}
    </Pressable>
  );
}

function HelpRow({ icon: Icon, label, onPress }: { icon: IconComponent; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.help, pressed && styles.helpPressed]}>
      <Icon size={20} color={colors.forest} />
      <Text variant="bodyMedium" style={styles.flex}>
        {label}
      </Text>
      <ChevronRight size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// M-71 Order declined or expired

// The backend keeps the farm's reason as a code
const DECLINED_BECAUSE: Record<string, string> = {
  out_of_stock: "The farm ran out of what you ordered.",
  cannot_deliver_in_time: "The farm couldn't prepare it in time.",
};

function Ended({ o }: { o: OrderDetail }) {
  const title = o.status === "declined" ? `${o.farmName} couldn't take this order` : o.status === "expired" ? `${o.farmName} didn't accept in time` : o.cancelReason === "bill_not_paid" ? "The bill wasn't paid in time" : "This order was cancelled";
  const reason =
    o.status === "declined" && o.declineReason && DECLINED_BECAUSE[o.declineReason]
      ? DECLINED_BECAUSE[o.declineReason]
      : o.status === "expired"
        ? "Farms have 24 hours to accept an order. This one ran out of time."
        : "";
  const money = o.escrow === "none" ? "You weren't charged for this order." : o.escrow === "refunded" ? `${formatNaira(o.totalKobo)} has been refunded to you in full.` : `Your ${formatNaira(o.totalKobo)} is coming back to you in full. Banks can take a few working days to show it.`;
  return (
    <StatusScreen
      icon={o.status === "expired" ? Clock : CloseCircle}
      tone="pending"
      header={<ScreenHeader title={`Order ${o.number}`} onBack={() => (router.canGoBack() ? router.back() : router.replace("/orders"))} />}
      title={title}
      message={[reason, money].filter(Boolean).join(" ")}
      actions={
        <>
          {o.hasRefund ? <Button label="View refund" variant="dark" size="large" pill fullWidth onPress={() => router.push({ pathname: "/order/[id]/refund", params: { id: o._id } })} /> : null}
          <Button label="Shop similar items" size="large" pill fullWidth variant={o.hasRefund ? "ghost" : "primary"} onPress={() => router.push(o.items[0] ? `/product/${o.items[0].listingId}` : "/home")} />
        </>
      }
    >
      <Text variant="small" align="center">
        {o.farmName} · {plural(o.items.length, "item")} · Ordered {dayLabel(o.placedAt)}
      </Text>
    </StatusScreen>
  );
}

// ---------------------------------------------------------------------------
// View only (Find my order on another phone)

function ViewOnly({ o }: { o: OrderDetail }) {
  const b = badge(o.status, o.fulfilment, o.paid);
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Order" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.viewOnly}>
          <Eye size={22} color={colors.pendingInk} />
          <View style={styles.flex}>
            <Text variant="label" color={colors.pendingInk}>
              You're viewing this order
            </Text>
            <Text variant="small" color={colors.pendingInk}>
              To confirm delivery, open it on the phone you ordered on{o.linkEmailHint ? `, or create an account with ${o.linkEmailHint}` : ""}.
            </Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Text variant="title" style={styles.number}>
            {o.number}
          </Text>
          <Text variant="caption">
            {o.farmName} · Ordered {dayLabel(o.placedAt)}
          </Text>
          <StatusBadge label={b.label} tone={b.tone} />
        </View>
        <View style={styles.card}>
          <Timeline steps={orderSteps(o, undefined)} />
        </View>
        <Items o={o} />
        {o.linkEmailHint ? <Button label="Create an account" variant="dark" size="large" pill fullWidth onPress={() => router.push("/create-account")} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  medium: { fontFamily: fonts.medium },
  semibold: { fontFamily: fonts.semibold },
  bold: { fontFamily: fonts.bold },
  body: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { gap: spacing.xs, paddingBottom: spacing.xs },
  number: { fontFamily: fonts.displayBold, letterSpacing: -0.3 },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs, marginTop: spacing.xxs },
  held: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  bill: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg + 4, backgroundColor: colors.pendingSoft },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  next: { gap: spacing.xs },
  nextDark: { backgroundColor: colors.forest, borderRadius: radii.lg + 4, padding: spacing.lg },
  nextAction: { marginTop: spacing.md },
  code: { backgroundColor: colors.forest, borderRadius: radii.lg + 8, padding: spacing.lg, gap: spacing.md },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  digits: { flex: 1, flexDirection: "row", gap: spacing.sm },
  digit: { flex: 1, maxWidth: 58, height: 64, borderRadius: radii.md + 2, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  digitText: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 32, color: colors.forest },
  qr: { padding: 6, borderRadius: radii.md, backgroundColor: colors.white },
  rider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.placeholder },
  totals: { gap: spacing.xs, paddingTop: spacing.md, marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.line },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  help: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, borderRadius: radii.md },
  helpPressed: { backgroundColor: colors.surfaceSoft },
  viewOnly: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg + 4, backgroundColor: colors.pendingSoft },
});
