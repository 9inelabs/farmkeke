// M-88 (shopper) and F-75 (farmer) Notification settings: this phone's push
// permission, then every alert type against its channels (push, SMS,
// email). Money alerts are always on. SMS is offered only where an alert
// sends texts, and email only with an email on file.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Check, CheckCircle, Lock, Phone } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import type { PushStatus } from "./push";

export type AlertPrefs = NonNullable<FunctionReturnType<typeof api.notifications.preferences>>;
export type Channel = "push" | "sms" | "email";

const COLS: { key: Channel; label: string }[] = [
  { key: "push", label: "Push" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
];

// Short lines for each alert type; the backend's longer description is the fallback
const SHORT: Record<string, string> = {
  "shop:order_updates": "Accepted, on its way, ready",
  "shop:messages": "Replies from farms",
  "shop:reminders": "Confirm and review",
  "shop:back_in_stock": "Saved items return",
  "shop:offers": "Seasonal picks and news",
  "farm:orders": "New orders, deadlines, riders",
  "farm:problems": "Reports and decisions",
  "farm:messages": "Buyers and support",
  "farm:listings": "Approvals and low stock",
  "farm:reviews": "New ratings",
};

const SMS_NOTE = {
  shop: "Texts only go out for bills and pickup codes.",
  farm: "Texts only go out for new orders and bank changes.",
};

function PushCard({ status, onEnable }: { status: PushStatus | null; onEnable: () => void }) {
  if (status === "granted") {
    return (
      <View style={[styles.push, styles.pushOn]}>
        <CheckCircle size={22} color={colors.forest} variant="solid" />
        <View style={styles.flex}>
          <Text variant="label">Push is on</Text>
          <Text variant="small">This phone gets your alerts.</Text>
        </View>
      </View>
    );
  }
  if (status === "unavailable") {
    return (
      <View style={[styles.push, styles.pushPlain]}>
        <Phone size={22} color={colors.inkSoft} />
        <View style={styles.flex}>
          <Text variant="label">Push works in the app</Text>
          <Text variant="small">Open Farmkeke on your phone to turn it on.</Text>
        </View>
      </View>
    );
  }
  const denied = status === "denied";
  return (
    <View style={[styles.push, styles.pushOff]}>
      <View style={styles.glow} />
      <View style={styles.bell}>
        <Bell size={20} color={colors.forest} variant="solid" />
      </View>
      <View style={styles.flex}>
        <Text variant="label" color={colors.white}>
          Push is off
        </Text>
        <Text variant="small" color="rgba(255,255,255,0.72)">
          {denied ? "Turn it on in your phone's Settings." : "Get updates the moment they happen."}
        </Text>
      </View>
      <Button label={denied ? "Settings" : "Turn on"} size="small" pill onPress={onEnable} />
    </View>
  );
}

function Cell({ state, label, onPress }: { state: "on" | "off" | "locked" | "none"; label: string; onPress?: () => void }) {
  if (state === "none") {
    return (
      <View style={styles.cell} accessible accessibilityLabel={`${label}: not offered`}>
        <View style={styles.dash} />
      </View>
    );
  }
  const on = state !== "off";
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: state === "locked" }}
      accessibilityLabel={label}
      disabled={state === "locked"}
      hitSlop={4}
      onPress={onPress}
      style={styles.cell}
    >
      <View style={[styles.dot, on && styles.dotOn, state === "locked" && styles.dotLocked]}>
        {state === "locked" ? <Lock size={13} color={colors.forest} /> : on ? <Check size={14} color={colors.forest} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

export function AlertSettingsView({
  side,
  prefs,
  status,
  onToggle,
  onEnablePush,
}: {
  side: "shop" | "farm";
  prefs: AlertPrefs | null | undefined;
  status: PushStatus | null;
  onToggle: (alert: string, channel: Channel, on: boolean) => void;
  onEnablePush: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PushCard status={status} onEnable={onEnablePush} />

        {prefs === undefined ? (
          <Skeleton height={420} radius={radii.lg + 4} />
        ) : prefs === null ? (
          <View style={styles.card}>
            <Text variant="label">Sign in to choose your alerts</Text>
            <Text variant="small">Your choices are saved to your account.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.headRow}>
              <Text variant="overline" style={styles.flex}>
                Alerts
              </Text>
              {COLS.map((c) => (
                <Text key={c.key} variant="small" style={styles.colLabel}>
                  {c.label}
                </Text>
              ))}
            </View>
            {prefs.alerts.map((a, i) => (
              <View key={a.alert} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="label">{a.title}</Text>
                  <Text variant="small" numberOfLines={1}>
                    {a.locked ? "Always on" : (SHORT[`${side}:${a.alert}`] ?? a.description)}
                  </Text>
                </View>
                {COLS.map((c) => {
                  const offered = c.key === "sms" ? a.smsAvailable : c.key === "email" ? prefs.hasEmail : true;
                  const state = !offered ? "none" : a.locked ? "locked" : a[c.key] ? "on" : "off";
                  return <Cell key={c.key} state={state} label={`${a.title}, ${c.label}`} onPress={() => onToggle(a.alert, c.key, !a[c.key])} />;
                })}
              </View>
            ))}
          </View>
        )}

        {prefs ? (
          <Text variant="small" align="center" style={styles.foot}>
            {SMS_NOTE[side]}
            {prefs.hasEmail ? "" : " Add an email to your account to get alerts by email."}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL = 46;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, gap: 2 },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
  push: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radii.lg + 6, padding: spacing.lg, overflow: "hidden" },
  pushOn: { backgroundColor: colors.tint },
  pushPlain: { backgroundColor: colors.white },
  pushOff: { backgroundColor: colors.forest },
  glow: { position: "absolute", right: -40, top: -60, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(169,214,84,0.16)" },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 },
  headRow: { flexDirection: "row", alignItems: "center", paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
  colLabel: { width: CELL, textAlign: "center", fontFamily: fonts.medium },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: 0 },
  divider: { borderTopWidth: 1, borderTopColor: colors.surfaceSoft },
  cell: { width: CELL, height: 44, alignItems: "center", justifyContent: "center" },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  dotOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  dotLocked: { backgroundColor: colors.tint, borderColor: colors.tint },
  dash: { width: 10, height: 2, borderRadius: 1, backgroundColor: colors.line },
  foot: { paddingHorizontal: spacing.md },
});
