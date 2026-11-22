// F-41 to F-47: one order as the farm sees it. A stage bar and where it's up
// to on a dark card; what the farm earns; the items; the buyer and how it
// leaves the farm; and the order's history. Since 22 Nov 2026 the farm only
// accepts or declines: Farmkeke sends the rider and marks the delivery, and
// for pickup at the farm, scanning the buyer's code is the one optional step.
// The step's button is pinned at the bottom. The route gives it the order and
// the actions.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Ban, Bike, Call, Chat, ChevronLeft, Clock, Document, Flag, Headphone, Pin, ShieldCheck, Truck } from "@/components/icons";
import { Button, StatusBadge, Text, Timeline, type TimelineStep } from "@/components/ui";
import { dayTime } from "@/features/orders/format";
import { errorCode, errorMessage } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { displayPhone } from "@/lib/phone";
import { showToast } from "@/store/toast";
import { androidUi } from "@/theme/platform";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { CodeSheet, DeclineSheet } from "./OrderSheets";
import { DECLINE_REASONS, farmBadge, type DeclineReason } from "./status";
import { Card, Countdown, Fact, LinkRow, MoneyLine, RoundButton } from "./ui";

export type FarmOrder = NonNullable<FunctionReturnType<typeof api.orders.farmer.get>>;

export type FarmOrderActions = {
  accept: () => Promise<unknown>;
  decline: (reason: DeclineReason, note?: string) => Promise<unknown>;
  collect: (code: string) => Promise<unknown>;
};

const ENDED = ["declined", "expired", "cancelled"];
// The farm accepts; the buyer pays; Farmkeke (or the buyer) takes it from there
const STAGES = ["Accept", "Paid", "With buyer", "Closed"];

function stageOf(o: FarmOrder): number {
  if (o.next === "accept") return 0;
  if (o.status === "completed") return 4;
  if (o.status === "delivered" || o.status === "collected" || o.status === "disputed") return 3;
  return o.paid ? 2 : 1;
}

type Step = { title: string; note: string; button?: string; sheet?: "code"; run?: keyof FarmOrderActions; done?: string };

function stepFor(o: FarmOrder): Step | null {
  const atFarm = o.fulfilment === "pickup" && o.pickupPoint === null;
  switch (o.next) {
    case "accept":
      return {
        title: "Accept this order",
        note: o.fulfilment === "delivery" ? "That's all you do. Farmkeke sends a rider and bills the buyer." : "That's all you do. We bill the buyer, then they collect it from you.",
        button: "Accept order",
        run: "accept",
        done: "Order accepted",
      };
    case "waiting_for_payment":
      return { title: "Bill sent to the buyer", note: atFarm ? "They collect it once it's paid. Paystack sends your share when they pay." : "A Farmkeke rider collects it once it's paid." };
    case "rider_collecting":
      return {
        title: "A Farmkeke rider collects it",
        note: o.rider ? `${o.rider.name} is collecting${o.riderCollectAt ? ` ${dayTime(o.riderCollectAt)}` : ""}. Have it ready. Nothing to tap.` : "We'll tell you who's coming and when. Have it ready. Nothing to tap.",
      };
    case "confirm_collection":
      return {
        title: "Buyer collecting",
        note: `${o.collectBy ? `Collect by ${dayTime(o.collectBy)}. ` : ""}When they come, you can scan their code. Optional: they can confirm it themselves.`,
        button: "Scan pickup code",
        sheet: "code",
      };
    default:
      // After the hand-over there's nothing for the farm to do; say where it's up to
      if (o.status === "out_for_delivery" || o.status === "with_rider" || o.status === "at_pickup_point") return { title: "On its way", note: "You've been paid. The buyer can report a problem for a day after it arrives." };
      if (o.status === "delivered" || o.status === "collected") return { title: "With the buyer", note: "They can report a problem for a day. Then the order closes." };
      if (o.status === "completed") return { title: "Order complete", note: o.endedAt ? `Closed ${dayTime(o.endedAt)}` : "Nothing more to do." };
      return null;
  }
}

function history(o: FarmOrder): TimelineStep[] {
  const t = (ms: number | null | undefined) => (ms ? dayTime(ms) : undefined);
  const pickup = o.fulfilment === "pickup";
  if (ENDED.includes(o.status)) {
    const title = o.status === "declined" ? "You declined" : o.status === "expired" ? "Expired without a reply" : "Cancelled";
    return [
      { key: "in", title: "Order received", detail: t(o.placedAt), state: "done" },
      { key: "end", title, detail: t(o.endedAt), state: "current" },
    ];
  }
  const raw: { key: string; title: string; at: number | null }[] = [
    { key: "in", title: "Order received", at: o.placedAt },
    { key: "accepted", title: "Accepted", at: o.acceptedAt },
    // Paystack sends the farm's share the moment the shopper pays
    { key: "paid", title: "Paid to your bank", at: o.paidAt },
    // Older orders (before 22 Nov 2026) went through preparing and packed
    ...(o.preparingAt !== null ? [{ key: "preparing", title: "Preparing", at: o.preparingAt }] : []),
    ...(o.packedAt !== null ? [{ key: "packed", title: "Packed", at: o.packedAt }] : []),
    ...(o.fulfilment === "delivery" && o.readyAt !== null ? [{ key: "ready", title: "Ready for the rider", at: o.readyAt }] : []),
    ...(pickup
      ? [
          // Ready to collect as soon as it's accepted; the buyer's days start once it's paid
          { key: "ready", title: "Ready to collect", at: o.paid ? (o.readyAt ?? o.paidAt) : null },
          { key: "collected", title: "Collected by the buyer", at: o.deliveredAt },
        ]
      : [
          { key: "out", title: "With the rider", at: o.outForDeliveryAt },
          { key: "delivered", title: "Delivered", at: o.deliveredAt },
        ]),
    // A day after delivery or collection with no problem reported
    { key: "closed", title: "Closed", at: o.status === "completed" ? o.endedAt : null },
  ];
  const current = raw.findIndex((s) => s.at === null);
  return raw.map((s, i) => ({
    key: s.key,
    title: s.title,
    detail: t(s.at),
    state: s.at !== null ? "done" : i === current && o.isActive ? "current" : "todo",
  }));
}

export function FarmOrderView({ order: o, actions, now }: { order: FarmOrder; actions: FarmOrderActions; now: number }) {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<"decline" | "code" | null>(null);
  const [busy, setBusy] = useState(false);
  const step = stepFor(o);
  const stage = stageOf(o);
  const ended = ENDED.includes(o.status);
  const b = farmBadge(o);
  const pct = o.money.productKobo > 0 ? Math.round((o.money.feeKobo / o.money.productKobo) * 1000) / 10 : 0;
  // Paystack sends the farm's share the moment the shopper pays
  const moneyState =
    o.escrow === "refunded" || ended
      ? { label: o.escrow === "none" ? "Not charged" : "Refunded to buyer", tone: "neutral" as const }
      : o.paymentPending
        ? { label: "Not paid yet", tone: "neutral" as const }
        : { label: "Sent to your bank", tone: "success" as const };
  const recovered = o.money.recoveredKobo;

  const run = async (s: Step) => {
    if (!s.run) return;
    setBusy(true);
    try {
      await (actions[s.run] as () => Promise<unknown>)();
      if (s.done) showToast({ message: s.done });
    } catch (e) {
      const c = errorCode(e);
      const message = c === "EXPIRED" ? "The time to reply has passed." : c === "WRONG_STATUS" ? "This order has already moved on." : c === "FARM_SUSPENDED" ? "Selling is paused on your farm." : errorMessage(e);
      showToast({ message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const finish = (message: string) => {
    setSheet(null);
    showToast({ message });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.top}>
        <RoundButton icon={androidUi ? ArrowLeft : ChevronLeft} label="Back" onPress={() => router.back()} />
        <Text variant="label" style={styles.topTitle} numberOfLines={1}>
          Order
        </Text>
        <RoundButton icon={Chat} label="Message the buyer" onPress={() => router.push({ pathname: "/farm-order/[id]/chat", params: { id: o._id } })} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: (step?.button || o.next === "waiting_for_payment" ? 120 : spacing.xxxl) + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.title}>
          <Text variant="screenTitle" accessibilityRole="header">
            {o.number}
          </Text>
          <Text variant="caption">Placed {dayTime(o.placedAt)}</Text>
          <View style={styles.badges}>
            <StatusBadge label={b.label} tone={b.tone} />
            <View style={styles.way}>
              {o.fulfilment === "pickup" ? <Pin size={13} color={colors.inkSoft} /> : <Truck size={13} color={colors.inkSoft} />}
              <Text variant="small" color={colors.inkSoft}>
                {o.fulfilment === "pickup" ? "Pickup" : "Delivery"}
              </Text>
            </View>
            {o.next === "accept" && o.respondBy ? <Countdown until={o.respondBy} now={now} /> : null}
          </View>
        </View>

        {o.disputeId ? (
          <Card onPress={() => router.push({ pathname: "/farm-dispute/[id]", params: { id: o.disputeId! } })} style={styles.alert}>
            <View style={styles.alertRow}>
              <View style={styles.alertIcon}>
                <Flag size={18} color={colors.error} variant="solid" />
              </View>
              <View style={styles.flex}>
                <Text variant="label">Problem reported</Text>
                <Text variant="small">Reply with your side. Farmkeke decides</Text>
              </View>
              <Text variant="label" color={colors.error}>
                View
              </Text>
            </View>
          </Card>
        ) : null}

        {ended ? (
          <Card>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, styles.endedIcon]}>
                <Ban size={18} color={colors.inkSoft} />
              </View>
              <View style={styles.flex}>
                <Text variant="label">{o.status === "declined" ? "You declined this order" : o.status === "expired" ? "No reply in time" : "Order cancelled"}</Text>
                <Text variant="small">
                  {o.status === "declined"
                    ? [DECLINE_REASONS.find((r) => r.value === o.declineReason)?.label, o.declineNote].filter(Boolean).join(" · ")
                    : o.escrow === "none"
                      ? "The buyer wasn't charged"
                      : "The buyer is refunded in full"}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {step ? (
          <View style={styles.next}>
            <View style={styles.glow} />
            <Text variant="overline" color={colors.lime}>
              {step.button || o.next === "waiting_for_payment" ? "Next step" : "Status"}
            </Text>
            <Text style={styles.nextTitle}>{step.title}</Text>
            <Text variant="caption" color="rgba(255,255,255,0.72)">
              {step.note}
            </Text>
            <View style={styles.stages} accessibilityLabel={`Step ${Math.min(stage + 1, STAGES.length)} of ${STAGES.length}`}>
              {STAGES.map((s, i) => (
                <View key={s} style={styles.stage}>
                  <View style={[styles.bar, i < stage && styles.barDone, i === stage && styles.barNow]} />
                  <Text variant="small" color={i <= stage ? colors.white : "rgba(255,255,255,0.45)"} numberOfLines={1} style={styles.stageLabel}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {ended ? null : (
          <Card>
            <View style={styles.cardHead}>
              <Text variant="small">You earn</Text>
              <StatusBadge label={moneyState.label} tone={moneyState.tone} />
            </View>
            <Text style={styles.earn}>{formatNaira(o.money.netKobo)}</Text>
            <View style={styles.rule} />
            <MoneyLine label="Products" value={formatNaira(o.money.productKobo)} />
            <MoneyLine label={`Farmkeke fee${pct ? ` · ${pct}%` : ""}`} value={`−${formatNaira(o.money.feeKobo)}`} />
            {recovered > 0 ? <MoneyLine label="Refund paid back" value={`−${formatNaira(recovered)}`} /> : null}
            {recovered < 0 ? <MoneyLine label="Credit from Farmkeke" value={`+${formatNaira(-recovered)}`} /> : null}
            {o.paymentPending ? (
              <Text variant="small">Paystack sends this to your bank as soon as the shopper pays.</Text>
            ) : null}
          </Card>
        )}

        <Card>
          <View style={styles.cardHead}>
            <Text variant="heading">Items · {o.items.length}</Text>
            <Button label="Packing slip" icon={Document} variant="ghost" size="small" onPress={() => router.push({ pathname: "/farm-order/[id]/slip", params: { id: o._id } })} />
          </View>
          {o.items.map((it) => (
            <View key={it.index} style={styles.item}>
              {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
              <View style={styles.flex}>
                <Text variant="label" numberOfLines={1}>
                  {it.name}
                </Text>
                <Text variant="small">
                  {it.quantity} {it.unitLabel}
                </Text>
              </View>
              <Text variant="label">{formatNaira(it.lineTotalKobo)}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <Text variant="heading">{o.fulfilment === "pickup" ? "Buyer collects" : "Delivery"}</Text>
          </View>
          <View style={styles.facts}>
            <Fact label="Buyer" value={o.consumer.firstName || "Buyer"} />
            <Fact label="Phone" value={displayPhone(o.consumer.phone)} />
            {o.fulfilment === "delivery" ? (
              <Fact label="Area" value={o.address ? `${o.address.areaName}, ${o.address.lga}` : "–"} />
            ) : (
              <Fact label="Where" value={o.pickupPoint?.name ?? "At your farm"} />
            )}
            {o.fulfilment === "pickup" ? <Fact label="Collect by" value={o.collectBy ? dayTime(o.collectBy) : "3 days after they pay"} /> : <Fact label="Payment" value={o.escrow === "refunded" ? "Refunded" : o.paid ? "Paid" : o.isActive ? "After pricing" : "Not charged"} />}
          </View>
          {o.rider ? (
            <View style={styles.rider}>
              <View style={styles.riderIcon}>
                <Bike size={18} color={colors.forest} />
              </View>
              <View style={styles.flex}>
                <Text variant="small">Rider</Text>
                <Text variant="label">{o.rider.name}</Text>
              </View>
              <RoundButton icon={Call} label={`Call ${o.rider.name}`} tone="tint" onPress={() => void Linking.openURL(`tel:${o.rider!.phone}`)} />
            </View>
          ) : null}
          {o.isActive ? (
            <View style={styles.row}>
              <Button label="Call" icon={Call} variant="secondary" size="small" pill onPress={() => void Linking.openURL(`tel:${o.consumer.phone}`)} style={styles.flex} />
              <Button label="Message" icon={Chat} variant="secondary" size="small" pill onPress={() => router.push({ pathname: "/farm-order/[id]/chat", params: { id: o._id } })} style={styles.flex} />
            </View>
          ) : null}
        </Card>

        <Card>
          <Text variant="heading">History</Text>
          <View style={styles.timeline}>
            <Timeline steps={history(o)} />
          </View>
        </Card>

        <Card style={styles.links}>
          <LinkRow icon={Headphone} label="Contact support" onPress={() => router.push({ pathname: "/support", params: { side: "farm" } })} last />
        </Card>
      </ScrollView>

      {step && (step.button || o.next === "waiting_for_payment") ? (
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {o.next === "waiting_for_payment" ? (
            <View style={styles.waiting}>
              <Clock size={18} color={colors.pendingInk} />
              <Text variant="label" color={colors.pendingInk}>
                Waiting for payment
              </Text>
            </View>
          ) : o.next === "accept" ? (
            <View style={styles.row}>
              <Button label="Decline" variant="outline" size="large" pill onPress={() => setSheet("decline")} disabled={busy} style={styles.decline} />
              <Button label="Accept order" variant="dark" size="large" pill onPress={() => void run(step)} loading={busy} style={styles.flex} />
            </View>
          ) : (
            <Button
              label={step.button!}
              variant="dark"
              size="large"
              pill
              fullWidth
              loading={busy}
              icon={step.sheet === "code" ? ShieldCheck : undefined}
              onPress={() => (step.sheet ? setSheet(step.sheet) : void run(step))}
            />
          )}
        </View>
      ) : null}

      <DeclineSheet
        visible={sheet === "decline"}
        onClose={() => setSheet(null)}
        paid={o.paid}
        onDecline={async (reason, note) => {
          await actions.decline(reason, note);
          finish("Order declined");
        }}
      />
      <CodeSheet
        visible={sheet === "code"}
        onClose={() => setSheet(null)}
        onConfirm={async (code) => {
          await actions.collect(code);
          finish("Collected. The buyer can now confirm");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.screen, paddingVertical: spacing.sm },
  topTitle: { flex: 1, textAlign: "center" },
  content: { paddingHorizontal: spacing.screen, gap: spacing.md },
  title: { gap: 2, paddingBottom: spacing.xs },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  way: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, height: 24, borderRadius: radii.pill, backgroundColor: colors.white },
  alert: { borderWidth: 1, borderColor: colors.errorSoft },
  alertRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  alertIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.errorSoft, alignItems: "center", justifyContent: "center" },
  endedIcon: { backgroundColor: colors.surfaceSoft },
  next: { backgroundColor: colors.forest, borderRadius: radii.lg + 10, padding: spacing.xl, gap: 4, overflow: "hidden" },
  glow: { position: "absolute", right: -50, top: -70, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(169,214,84,0.14)" },
  nextTitle: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, color: colors.white },
  stages: { flexDirection: "row", gap: 6, marginTop: spacing.lg },
  stage: { flex: 1, gap: 6 },
  stageLabel: { fontSize: 11 },
  bar: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.16)" },
  barDone: { backgroundColor: colors.lime },
  barNow: { backgroundColor: "rgba(169,214,84,0.55)" },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  earn: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 34, color: colors.ink, letterSpacing: -0.4 },
  rule: { height: 1, backgroundColor: colors.surfaceSoft, marginVertical: spacing.xs },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 2 },
  thumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.placeholder },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md, columnGap: spacing.md, paddingVertical: spacing.xs },
  rider: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft },
  riderIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  timeline: { paddingTop: spacing.xs },
  links: { padding: 0, overflow: "hidden" },
  decline: { minWidth: 120 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: spacing.md, backgroundColor: colors.white, boxShadow: "0px -4px 20px 0px rgba(0, 0, 0, 0.07)" },
  waiting: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: 26, backgroundColor: colors.pendingSoft },
});
