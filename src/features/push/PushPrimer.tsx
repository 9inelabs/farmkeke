// M-48 (shopper, after the first order) and F-12 (farmer, on first switch to
// farmer mode): why turn on push, shown before the phone's own prompt so the
// one chance to ask isn't wasted. Two sample alerts show what's coming.
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Bell, Box, CashIn, Clipboard, TruckFast, type IconComponent } from "@/components/icons";
import { BottomSheet, Button, Text } from "@/components/ui";
import { usePush } from "@/store/push";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { askForPush, openPushSettings, type PushStatus } from "./push";

type Side = "shop" | "farm";

const COPY: Record<Side, { title: string; note: string; samples: { icon: IconComponent; title: string; body: string; when: string }[] }> = {
  shop: {
    title: "Know the moment it moves",
    note: "Accepted, on its way, ready to collect. No need to keep checking.",
    samples: [
      { icon: Box, title: "Order accepted", body: "Okafor Family Farms is preparing it", when: "now" },
      { icon: TruckFast, title: "Out for delivery", body: "Chinedu is bringing your order", when: "2h" },
    ],
  },
  farm: {
    title: "Never miss an order",
    note: "You have 24 hours to reply to each one. We'll tell you the moment it lands.",
    samples: [
      { icon: Clipboard, title: "New order FK-10234", body: "2 baskets of tomatoes · reply within 24h", when: "now" },
      { icon: CashIn, title: "Payment released", body: "₦10,260 is on its way to your bank", when: "1d" },
    ],
  },
};

function Sample({ s, index }: { s: (typeof COPY)["shop"]["samples"][number]; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 110).springify().damping(18)} style={[styles.sample, index === 1 && styles.sampleBack]}>
      <View style={styles.sampleIcon}>
        <s.icon size={18} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <View style={styles.sampleTop}>
          <Text variant="label" numberOfLines={1} style={styles.flex}>
            {s.title}
          </Text>
          <Text variant="small">{s.when}</Text>
        </View>
        <Text variant="small" numberOfLines={1}>
          {s.body}
        </Text>
      </View>
    </Animated.View>
  );
}

export function PushPrimer({ side, visible, onClose, status }: { side: Side; visible: boolean; onClose: () => void; status: PushStatus | null }) {
  const copy = COPY[side];
  const setStatus = usePush((s) => s.setStatus);
  const markPrimerSeen = usePush((s) => s.markPrimerSeen);
  const [busy, setBusy] = useState(false);
  const blocked = status === "denied";

  // Seen once it opens, whatever the answer
  useEffect(() => {
    if (visible) markPrimerSeen(side);
  }, [visible, side, markPrimerSeen]);

  const turnOn = async () => {
    if (blocked) {
      openPushSettings();
      onClose();
      return;
    }
    setBusy(true);
    const next = await askForPush();
    setStatus(next);
    setBusy(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!busy}>
      <View style={styles.stage}>
        <View style={styles.glow} />
        <View style={styles.bell}>
          <Bell size={20} color={colors.forest} variant="solid" />
        </View>
        <View style={styles.stack}>
          {copy.samples.map((s, i) => (
            <Sample key={s.title} s={s} index={i} />
          ))}
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text variant="caption" align="center">
          {blocked ? "Notifications are off for Farmkeke. Turn them on in your phone's Settings." : copy.note}
        </Text>
      </View>
      <Button label={blocked ? "Open Settings" : "Turn on notifications"} variant="dark" size="large" pill fullWidth loading={busy} onPress={() => void turnOn()} />
      <Button label="Not now" variant="ghost" fullWidth onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { backgroundColor: colors.forest, borderRadius: radii.lg + 8, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: "center", gap: spacing.lg, overflow: "hidden", marginTop: spacing.xs },
  glow: { position: "absolute", right: -60, top: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(169,214,84,0.16)" },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  stack: { alignSelf: "stretch", gap: spacing.sm },
  sample: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md },
  sampleBack: { marginHorizontal: spacing.md, opacity: 0.88 },
  sampleIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  sampleTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  copy: { gap: spacing.xs, paddingHorizontal: spacing.sm, alignItems: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, color: colors.ink, textAlign: "center" },
});

/**
 * Opens the primer once per side, a moment after `armed` turns true: the
 * shopper's after an order is placed, while the phone can still be asked;
 * the farmer's in farmer mode whenever push is off (F-12).
 */
export function usePrimer(side: Side, armed: boolean, delay = 900) {
  const status = usePush((s) => s.status);
  const seen = usePush((s) => s.primerSeen[side]);
  const [open, setOpen] = useState(false);
  const eligible = armed && !seen && (status === "undetermined" || (side === "farm" && status === "denied"));
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(t);
  }, [eligible, delay]);
  return { open, close: () => setOpen(false), status };
}
