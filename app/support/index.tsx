// M-91 Contact support (and F-91 for farmers, with ?side=farm): earlier
// conversations with Farmkeke support, and a new message about an order or
// anything else, with photos. Replies arrive in the app (and by email).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import { ChevronRight, Headphone, Mail } from "@/components/icons";
import { Button, Notice, Screen, ScreenHeader, Text } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/content/help";
import { AttachmentStrip } from "@/features/chat/AttachmentStrip";
import { useAttachments } from "@/features/chat/useAttachments";
import { dayMonth } from "@/features/orders/format";
import { errorCode } from "@/lib/errors";
import { useEnsureIdentity } from "@/lib/session";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function Support() {
  const params = useLocalSearchParams<{ side?: string; orderId?: string }>();
  const side = params.side === "farm" ? "farm" : "shop";
  const tickets = useQuery(api.support.mine, { side });
  const orders = useQuery(api.support.orderChoices, { side });
  const open = useMutation(api.support.open);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const ensureIdentity = useEnsureIdentity();
  const photos = useAttachments(() => generateUploadUrl({}), 4);
  const [orderId, setOrderId] = useState<string | null>(params.orderId ?? null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!body.trim() && photos.ids.length === 0) return setError("Write a message, or add a photo.");
    if (photos.uploading) return;
    setBusy(true);
    setError(null);
    try {
      await ensureIdentity();
      const { ticketId } = await open({ side, body: body.trim(), photoIds: photos.ids, orderId: (orderId ?? undefined) as Id<"orders"> | undefined });
      router.replace({ pathname: "/support/[ticketId]", params: { ticketId } });
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      setError(code === "RATE_LIMITED" ? "You've sent a lot of messages. Wait a little, then try again." : code === "BLOCKED" ? `This account can't message support. Email ${SUPPORT_EMAIL}.` : "That didn't send. Check your connection and try again.");
    }
  };

  return (
    <Screen
      scroll
      background={colors.canvas}
      contentStyle={styles.content}
      header={<ScreenHeader title="Contact support" />}
      footer={<Button label="Send to Farmkeke" variant="dark" size="large" pill fullWidth loading={busy} disabled={photos.uploading} onPress={() => void send()} />}
    >
      <View style={styles.intro}>
        <View style={styles.icon}>
          <Headphone size={28} color={colors.forest} variant="solid" />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">How can we help?</Text>
          <Text variant="caption">A real person replies here, usually within a few hours.</Text>
        </View>
      </View>

      {tickets && tickets.length > 0 ? (
        <View style={styles.card}>
          <Text variant="overline">Your conversations</Text>
          {tickets.slice(0, 5).map((t) => (
            <Pressable key={t._id} accessibilityRole="button" onPress={() => router.push({ pathname: "/support/[ticketId]", params: { ticketId: t._id } })} style={styles.ticket}>
              <View style={styles.flex}>
                <Text variant="label" numberOfLines={1} style={t.unread && styles.bold}>
                  {t.number ?? "Support"}
                  {t.order ? ` · Order ${t.order.number}` : ""}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  {t.status === "resolved" ? "Resolved · " : ""}
                  {dayMonth(t.lastMessageAt)} · {t.preview ?? ""}
                </Text>
              </View>
              {t.unread ? <View style={styles.dot} /> : null}
              <ChevronRight size={18} color={colors.inkMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text variant="heading">New message</Text>
        {orders && orders.length > 0 ? (
          <>
            <Text variant="label">Is it about an order?</Text>
            <View style={styles.chips}>
              <Choice label="Not about an order" on={orderId === null} onPress={() => setOrderId(null)} />
              {orders.slice(0, 6).map((o) => (
                <Choice key={o.orderId} label={`${o.number} · ${side === "shop" ? o.farmName : o.consumerFirstName}`} on={orderId === o.orderId} onPress={() => setOrderId(o.orderId)} />
              ))}
            </View>
          </>
        ) : null}
        <TextInput
          value={body}
          onChangeText={(t) => {
            setBody(t);
            setError(null);
          }}
          placeholder="Tell us what's happening"
          placeholderTextColor={colors.inkMuted}
          multiline
          maxLength={4000}
          style={styles.input}
          accessibilityLabel="Message"
        />
        <AttachmentStrip items={photos.items} onAdd={() => void photos.add()} onRemove={photos.remove} onRetry={photos.retry} full={photos.full} size={64} />
        {error ? <Notice tone="error">{error}</Notice> : null}
      </View>

      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={[styles.card, styles.email]}>
        <Mail size={20} color={colors.forest} />
        <View style={styles.flex}>
          <Text variant="label">Prefer email?</Text>
          <Text variant="small">{SUPPORT_EMAIL}</Text>
        </View>
        <ChevronRight size={18} color={colors.inkMuted} />
      </Pressable>
    </Screen>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text variant="small" color={colors.ink} style={on && styles.bold}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.semibold },
  intro: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.md },
  ticket: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.surfaceSoft, borderWidth: 1.5, borderColor: colors.surfaceSoft },
  chipOn: { backgroundColor: colors.tint, borderColor: colors.lime },
  input: {
    minHeight: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: "top",
    // The box is the outline; no second browser focus ring on web
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  email: { flexDirection: "row", alignItems: "center" },
});
