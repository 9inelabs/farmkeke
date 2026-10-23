// M-60 Orders (Active and Past) and M-61 No orders yet. Guests see the orders
// placed on this phone; Find my order looks up one placed elsewhere.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box, ChevronRight, Messages, Search, ShieldCheck } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Button, EmptyState, ScreenHeader, Segmented, Skeleton, StatusBadge, Text } from "@/components/ui";
import { dayMonth } from "@/features/orders/format";
import { awaitsConfirm, badge, timingText } from "@/features/orders/status";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Row = FunctionReturnType<typeof api.orders.consumer.list>[number];

const open = (id: string) => router.push({ pathname: "/order/[id]", params: { id } });

export default function Orders() {
  const orders = useQuery(api.orders.consumer.list, {});
  const [tab, setTab] = useState<"active" | "past">("active");
  const [now] = useState(() => Date.now());

  const unreadChats = useQuery(api.chat.unread, { side: "shop" }) ?? 0;
  const header = (
    <ScreenHeader
      title="My Orders"
      onBack={() => router.navigate("/home")}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unreadChats > 0 ? `Messages, ${unreadChats} unread` : "Messages"}
          onPress={() => router.push("/messages")}
          style={styles.chatButton}
        >
          <Messages size={22} color={colors.forest} />
          {unreadChats > 0 ? <View style={styles.chatDot} /> : null}
        </Pressable>
      }
    />
  );

  if (orders === undefined) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        {header}
        <View style={styles.list}>
          <Skeleton height={60} radius={radii.lg} />
          <Skeleton height={170} radius={radii.lg + 4} />
          <Skeleton height={170} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }

  const visible = orders.filter((o) => o.status !== "awaiting_payment");
  if (visible.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        {header}
        <View style={styles.center}>
          <EmptyState
            icon={Box}
            title="No orders yet"
            message="When you buy from a farm, you'll follow it here, from the farm accepting to your door."
            actionLabel="Start shopping"
            onAction={() => router.navigate("/home")}
          />
        </View>
        <FindLink inset />
      </SafeAreaView>
    );
  }

  const active = visible.filter((o) => o.isActive);
  const past = visible.filter((o) => !o.isActive);
  const shown = tab === "active" ? active : past;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Segmented
          options={[
            { value: "active", label: `Active (${active.length})` },
            { value: "past", label: `Past (${past.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Stagger key={tab}>
          {shown.length === 0 ? (
            <View style={styles.none}>
              <Text variant="caption" align="center">
                {tab === "active" ? "Nothing on the way right now. Your earlier orders are under Past." : "No past orders yet."}
              </Text>
            </View>
          ) : (
            shown.map((o) => (tab === "active" ? <ActiveCard key={o._id} o={o} now={now} /> : <PastRow key={o._id} o={o} />))
          )}
        </Stagger>
        <FindLink />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveCard({ o, now }: { o: Row; now: number }) {
  const b = badge(o.status, o.fulfilment, o.paid);
  const toConfirm = awaitsConfirm(o.status);
  const billReady = "billReady" in o && o.billReady === true;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Order ${o.number} from ${o.farmName}, ${b.label}`} onPress={() => open(o._id)} style={styles.card}>
      <View style={styles.cardHead}>
        {o.imageUrl ? <Image source={{ uri: o.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
        <View style={styles.flex}>
          <Text variant="label" numberOfLines={1} style={styles.semibold}>
            {o.number} · {o.farmName}
          </Text>
          <Text variant="small" numberOfLines={1}>
            {dayMonth(o.placedAt)} · {o.fulfilment === "pickup" ? "Pickup" : "Delivery"} · {formatNaira(o.totalKobo)}
          </Text>
          <View style={styles.badges}>
            <StatusBadge label={b.label} tone={b.tone} />
            {o.escrow === "held" ? (
              <View style={styles.held}>
                <ShieldCheck size={12} color={colors.forest} variant="solid" />
                <Text variant="small" color={colors.forest}>
                  Held
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color={colors.inkMuted} />
      </View>
      <View style={[styles.next, (toConfirm || billReady) && styles.nextAction]}>
        <Text variant="caption" color={toConfirm || billReady ? colors.ink : colors.inkSoft} style={styles.flex}>
          {toConfirm ? "Check your items, then confirm to release payment to the farm." : timingText(o, now)}
        </Text>
        {toConfirm ? (
          <Button label="Confirm" size="small" variant="dark" onPress={() => router.push({ pathname: "/order/[id]/confirm", params: { id: o._id } })} />
        ) : billReady ? (
          <Button label="Pay bill" size="small" onPress={() => open(o._id)} />
        ) : null}
      </View>
    </Pressable>
  );
}

function PastRow({ o }: { o: Row }) {
  const b = badge(o.status, o.fulfilment, o.paid);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Order ${o.number} from ${o.farmName}, ${b.label}`} onPress={() => open(o._id)} style={[styles.card, styles.pastRow]}>
      {o.imageUrl ? <Image source={{ uri: o.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1} style={styles.semibold}>
          {o.number} · {o.farmName}
        </Text>
        <Text variant="small" numberOfLines={1}>
          {dayMonth(o.placedAt)} · {o.summary.replace(/^\d+ × /, "")} · {formatNaira(o.totalKobo)}
        </Text>
        <StatusBadge label={b.label} tone={b.tone} />
      </View>
      <ChevronRight size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

function FindLink({ inset = false }: { inset?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push("/find-order")} style={[styles.find, inset && styles.findInset]}>
      <Search size={20} color={colors.forest} />
      <View style={styles.flex}>
        <Text variant="label">Ordered on another phone?</Text>
        <Text variant="small">Find it with the order number and phone number.</Text>
      </View>
      <Text variant="label" color={colors.limeInk}>
        Find order
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  center: { flex: 1, justifyContent: "center" },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.md },
  none: { padding: spacing.xl, borderRadius: radii.lg + 4, backgroundColor: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.md, gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.placeholder },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  held: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  next: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  nextAction: { backgroundColor: colors.tint },
  chatButton: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  chatDot: { position: "absolute", top: 9, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.forest, borderWidth: 1.5, borderColor: colors.tint },
  findInset: { marginHorizontal: spacing.screen, marginBottom: spacing.lg },
  pastRow: { flexDirection: "row", alignItems: "center" },
  find: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
});
