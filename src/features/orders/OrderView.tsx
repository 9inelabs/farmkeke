// The order screen's three faces: tracking (M-63, with the pickup code card
// and the next step), ended early (M-71), and view-only (Find my order on
// another phone). app/order/[id] loads the order; app/dev/orders draws sample
// orders with it.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
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
              {!o.paid ? <StatusBadge label="Not paid yet" tone="neutral" /> : null}
            </View>
          </View>

          {payToken ? (
            <View style={styles.bill}>
              <Receipt size={24} color={colors.pendingInk} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">Your bill is ready: {formatNaira(o.bill!.totalKobo)}</Text>
                <Text variant="small">
                  {o.fulfilment === "delivery" ? "Delivery included. " : ""}Pay by {o.bill!.payBy ? dayTime(o.bill!.payBy) : "the time on your bill"}, or the order is cancelled.
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
  const markArrived = useMutation(api.orders.consumer.markArrived);
  const markCollected = useMutation(api.orders.consumer.markCollected);
  const [busy, setBusy] = useState(false);
  const confirm = async (run: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  };
  let title: string;
  let body: string;
  let action: ReactNode = null;
  const report = () => router.push({ pathname: "/order/[id]/problem", params: { id: o._id } });
  // Problems are reported until the order closes, a day after delivery or collection
  const until = o.reportBy ? dayTime(o.reportBy) : null;
  const reportLine = until ? `Something wrong? Report it by ${until}. After that, the order closes.` : "Something wrong? Report a problem.";

  if (o.status === "completed") {
    title = "All done";
    body = "Thanks for buying direct from the farm.";
    action = o.reviewed ? (
      <Button label={`Buy again from ${o.farmName}`} size="large" pill fullWidth onPress={() => router.push(`/farm/${o.farmId}`)} />
    ) : (
      <Button label="Rate your order" icon={Star} size="large" pill fullWidth onPress={() => router.push({ pathname: "/order/[id]/review", params: { id: o._id } })} />
    );
  } else if (o.status === "disputed") {
    title = "We're looking into your report";
    body = "The farm can reply, then our team decides. If you're owed a refund, Farmkeke sends it. We'll let you know the outcome.";
    action = <Button label="Follow this case" size="large" pill fullWidth onPress={() => router.push({ pathname: "/order/[id]/dispute", params: { id: o._id } })} />;
  } else if (!o.paid) {
    if (payToken) {
      title = "Pay your bill";
      body = pickup
        ? `${o.farmName} accepted your order. Pay ${formatNaira(o.bill!.totalKobo)}, then collect it from the farm with your pickup code.`
        : `${o.farmName} accepted your order and a rider is arranged. Pay ${formatNaira(o.bill!.totalKobo)}, delivery included, and the rider brings it.`;
      action = <Button label={`Pay ${formatNaira(o.bill!.totalKobo)}`} size="large" pill fullWidth onPress={() => router.push({ pathname: "/pay/[token]", params: { token: payToken } })} />;
    } else {
      title = r <= 1 ? `Waiting for ${o.farmName} to accept` : "We're pricing your delivery";
      body = `Nothing to pay yet. We'll send your bill by email, text and in the app once ${pickup ? "the farm accepts" : "a rider is arranged"}. You'll have 12 hours to pay.`;
    }
  } else if (pickup) {
    if (o.status === "collected") {
      title = "Check everything";
      body = reportLine;
      action = o.canReport ? <Button label="Report a problem" variant="secondary" size="large" pill fullWidth onPress={report} /> : null;
    } else if (o.canMarkCollected) {
      // The farm can scan the code, but needn't: the shopper says they have it
      title = "Ready to collect";
      body = "Show your pickup code at the farm and check everything before you leave. Got it? Tap Collected.";
      action = <Button label="Collected" size="large" pill fullWidth loading={busy} onPress={() => void confirm(() => markCollected({ orderId: o._id as Id<"orders"> }))} />;
    } else {
      title = r >= 4.5 ? "Ready to collect" : `${o.farmName} accepted your order`;
      body = r >= 4.5 ? "Show your pickup code at the farm. Check everything before you leave." : "We'll tell you when it's ready to collect.";
    }
  } else if (o.canMarkArrived && o.status === "out_for_delivery") {
    // The shopper can say it arrived without waiting for staff
    title = `${rider ?? "The rider"} is bringing your order`;
    body = "When it's in your hands, check everything and let us know it arrived. Something wrong? Report a problem.";
    action = <Button label="It's arrived" size="large" pill fullWidth loading={busy} onPress={() => void confirm(() => markArrived({ orderId: o._id as Id<"orders"> }))} />;
  } else if (o.canMarkArrived) {
    // Paid, waiting for the rider: the rider can arrive before staff mark it on its way
    title = "A Farmkeke rider brings it";
    body = "We'll let you know when it's on its way. Already in your hands? Tell us it arrived.";
    action = <Button label="It's arrived" variant="secondary" size="large" pill fullWidth loading={busy} onPress={() => void confirm(() => markArrived({ orderId: o._id as Id<"orders"> }))} />;
  } else if (o.status === "delivered") {
    title = "Check everything arrived";
    body = reportLine;
    action = o.canReport ? <Button label="Report a problem" variant="secondary" size="large" pill fullWidth onPress={report} /> : null;
  } else {
    title = r <= 1 ? `Waiting for ${o.farmName} to accept` : "A Farmkeke rider brings it";
    body = "We'll let you know when it's on its way.";
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
    </View>
  );
}

function CollectFrom({ o }: { o: OrderDetail }) {
  const f = o.collectFrom!;
  const place = [f.address, f.lga, f.state].filter(Boolean).join(", ");
  // Ready as soon as the farm accepts; the days to collect start once it's paid
  const ready = (RANK[o.status] ?? 0) >= 4.5 && o.paid;
  return (
    <View style={styles.card}>
      <Text variant="small">Collect at the farm</Text>
      <Text variant="heading">{f.farmName}</Text>
      <Text variant="caption">{place}</Text>
      {f.hours && f.hours.length > 0 ? <Text variant="small">Hands over orders: {formatHours(f.hours)}</Text> : null}
      <Text variant="small">
        {ready && o.collectBy ? `Ready now. Collect by ${dayLabel(o.collectBy)}.` : `Ready once your bill is paid. You'll then have ${f.collectWithinDays} days to collect.`}
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
  // Paystack splits each payment at once: the farm's share goes to the farm,
  // Farmkeke keeps its fee and the delivery fee. Refunds come from Farmkeke.
  const [title, sub] =
    o.escrow === "refunded"
      ? [`${formatNaira(o.totalKobo)} refunded to you`, "Back to how you paid"]
      : o.escrow === "split"
        ? ["Part refunded", "See the refund for details"]
        : o.paid
          ? [`${formatNaira(o.totalKobo)} paid`, o.paidAt ? `Paid ${dayTime(o.paidAt)}` : "Paid by card or bank"]
          : o.bill?.state === "ready_to_pay"
            ? [`Bill ready: ${formatNaira(o.bill.totalKobo)}`, o.bill.payBy ? `Pay by ${dayTime(o.bill.payBy)}` : "Pay from your bill"]
            : o.bill?.state === "waiting_for_price"
              ? ["Nothing to pay yet", o.fulfilment === "delivery" ? "We'll send your bill once the delivery is priced" : "We'll send your bill once the farm accepts"]
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
  const money = o.escrow === "none" ? "You weren't charged for this order." : o.escrow === "refunded" ? `${formatNaira(o.totalKobo)} has been refunded to you in full.` : `Farmkeke is refunding your ${formatNaira(o.totalKobo)} in full. Banks usually take 3 to 10 working days to show it.`;
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
              To report a problem, open it on the phone you ordered on{o.linkEmailHint ? `, or create an account with ${o.linkEmailHint}` : ""}.
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
