// M-65 Confirm receipt: tick each item that arrived in good condition, then
// orders.consumer.confirmReceipt completes the order and releases the money
// to the farm (M-66). Guests can only confirm on the phone that placed it.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, ShieldCheck } from "@/components/icons";
import { Button, Notice, Screen, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { useOrder } from "@/features/orders/useOrder";
import { errorCode } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";

export default function ConfirmReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);
  const confirm = useMutation(api.orders.consumer.confirmReceipt);
  const o = access.state === "ok" ? access.order : null;
  const [unticked, setUnticked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const all = unticked.size === 0;

  const submit = async () => {
    if (!o || !all || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirm({ orderId: o._id as Id<"orders"> });
      router.replace({ pathname: "/order/[id]/released", params: { id: o._id } });
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      setError(
        code === "NOT_DELIVERED_YET"
          ? "This order hasn't been marked delivered yet. You can confirm once it arrives."
          : code === "NOT_FOUND"
            ? "Only the account or phone that placed this order can confirm it."
            : "We couldn't confirm right now. Check your connection and try again.",
      );
    }
  };

  return (
    <Screen
      scroll
      background={colors.canvas}
      contentStyle={styles.content}
      header={<ScreenHeader title="Did everything arrive?" />}
      footer={
        o ? (
          <>
            <Button label="Confirm and release payment" variant="dark" size="large" pill fullWidth loading={busy} disabled={!all || !o.canConfirm} onPress={() => void submit()} />
            <Button label="There's a problem" variant="ghost" fullWidth onPress={() => router.replace({ pathname: "/order/[id]/problem", params: { id: o._id } })} />
          </>
        ) : undefined
      }
    >
      {access.state === "loading" ? (
        <Skeleton height={220} radius={radii.lg} />
      ) : !o || o.viewOnly ? (
        <Notice tone="error">We couldn't open this order. Only the account or phone that placed it can confirm delivery.</Notice>
      ) : (
        <>
          <Text variant="caption">
            {o.number} · {o.farmName}. Tick each item you received in good condition.
          </Text>
          <View style={styles.list}>
            {o.items.map((it) => {
              const ticked = !unticked.has(it.index);
              return (
                <Pressable
                  key={it.index}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ticked }}
                  accessibilityLabel={`${it.name}, ${it.quantity} ${it.unitLabel}`}
                  onPress={() =>
                    setUnticked((u) => {
                      const next = new Set(u);
                      if (ticked) next.add(it.index);
                      else next.delete(it.index);
                      return next;
                    })
                  }
                  style={[styles.item, ticked && styles.itemOn]}
                >
                  <View style={[styles.box, ticked && styles.boxOn]}>{ticked ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}</View>
                  {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                  <View style={styles.flex}>
                    <Text variant="bodyMedium">{it.name}</Text>
                    <Text variant="small">
                      {it.quantity} {it.unitLabel}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.release}>
            <ShieldCheck size={20} color={colors.forest} variant="solid" />
            <Text variant="caption" color={colors.ink} style={styles.flex}>
              When you confirm, <Text variant="label">{formatNaira(o.totalKobo)}</Text> is released to {o.farmName}. You can't undo this, so report any problem first.
            </Text>
          </View>
          {!all ? <Notice tone="pending">Something missing or damaged? Don't confirm. Tap "There's a problem" and we'll help.</Notice> : null}
          {!o.canConfirm ? <Notice>You can confirm once the order has been {o.fulfilment === "pickup" ? "handed over" : "delivered"}.</Notice> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  flex: { flex: 1 },
  list: { gap: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.white },
  itemOn: { borderColor: colors.lime },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  thumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.placeholder },
  release: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.tint },
});
