// F-48 Problem report, farm side: what the buyer reported, the farm's one
// reply (agree, partly or disagree, with a note and photos), Farmkeke's
// decision, and messages with the buyer and Farmkeke support.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "@/components/icons";
import { Button, ScreenHeader, StatusBadge, Text, Timeline, type BadgeTone, type TimelineStep } from "@/components/ui";
import { AttachmentStrip } from "@/features/chat/AttachmentStrip";
import { ChatThread } from "@/features/chat/ChatThread";
import { useAttachments } from "@/features/chat/useAttachments";
import { dayTime } from "@/features/orders/format";
import { errorCode, errorMessage } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Countdown } from "./ui";

export type FarmDispute = NonNullable<FunctionReturnType<typeof api.disputes.get>>;
export type Stance = "agrees" | "partly" | "disagrees";

const STANCES: { value: Stance; label: string }[] = [
  { value: "agrees", label: "Agree" },
  { value: "partly", label: "Partly" },
  { value: "disagrees", label: "Disagree" },
];

type Props = {
  d: FarmDispute;
  now: number;
  generateUploadUrl: () => Promise<string>;
  onRespond: (stance: Stance, note: string, photoIds: string[]) => Promise<unknown>;
  onSend: (body: string, photoIds: string[]) => Promise<unknown>;
};

function ReplyForm({ d, now, generateUploadUrl, onRespond }: Omit<Props, "onSend">) {
  const [stance, setStance] = useState<Stance | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photos = useAttachments(generateUploadUrl, 6);

  const submit = async () => {
    if (stance === null) return setError("Choose where you stand.");
    if (note.trim().length < 5) return setError("Tell Farmkeke what happened.");
    setBusy(true);
    setError(null);
    try {
      await onRespond(stance, note.trim(), photos.ids);
    } catch (e) {
      setError(errorCode(e) === "ALREADY_RESPONDED" ? "You've already replied to this case." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, styles.reply]}>
      <View style={styles.line}>
        <Text variant="heading" style={styles.flex}>
          Your reply
        </Text>
        <Countdown until={d.farmReplyBy} now={now} />
      </View>
      <View style={styles.stances} accessibilityRole="radiogroup">
        {STANCES.map((s) => {
          const on = stance === s.value;
          return (
            <Button key={s.value} label={s.label} variant={on ? "dark" : "secondary"} size="small" pill onPress={() => setStance(s.value)} style={styles.flex} />
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={(t) => setNote(t.slice(0, 1000))}
        placeholder="What happened, from your side"
        placeholderTextColor={colors.inkMuted}
        multiline
        accessibilityLabel="Your reply"
        style={[styles.note, Platform.OS === "web" && styles.noOutline]}
      />
      <AttachmentStrip items={photos.items} onAdd={() => void photos.add()} onRemove={photos.remove} onRetry={photos.retry} full={photos.full} />
      {error ? (
        <Text variant="small" color={colors.error}>
          {error}
        </Text>
      ) : null}
      <Button label="Send reply" variant="dark" pill fullWidth loading={busy} disabled={photos.uploading || photos.failed} onPress={() => void submit()} />
    </View>
  );
}

export function DisputeView({ d, now, generateUploadUrl, onRespond, onSend }: Props) {
  const [label, tone]: [string, BadgeTone] =
    d.status === "resolved" ? ["Decided", "success"] : d.status === "farmer_responded" ? ["Under review", "pending"] : ["Reply needed", "error"];
  const steps: TimelineStep[] = [
    { key: "reported", title: `${d.consumerFirstName || "The buyer"} reported a problem`, detail: dayTime(d.reportedAt), state: "done" },
    {
      key: "farm",
      title: d.farmResponse ? "You replied" : d.farmReplyOverdue ? "No reply in time" : "Your reply",
      detail: d.farmResponse ? dayTime(d.farmResponse.at) : d.farmReplyOverdue ? "Farmkeke decides without it" : `By ${dayTime(d.farmReplyBy)}`,
      state: d.farmResponse || d.farmReplyOverdue ? "done" : "current",
    },
    {
      key: "decision",
      title: d.decision ? "Farmkeke decided" : "Farmkeke decides",
      detail: d.decision?.at ? dayTime(d.decision.at) : `Usually by ${dayTime(d.decideBy)}`,
      state: d.decision ? "done" : d.status === "farmer_responded" || d.farmReplyOverdue ? "current" : "todo",
    },
  ];

  const header = (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <View style={styles.glow} />
        <Text variant="label" color={colors.lime}>
          Case {d.number} · Order {d.orderNumber}
        </Text>
        <Text style={styles.heroTitle}>{d.reasonLabel}</Text>
        <Text variant="small" color="rgba(255,255,255,0.75)">
          {formatNaira(d.amountKobo)} in question
        </Text>
        <View style={styles.heroBadges}>
          <StatusBadge label={label} tone={tone} />
          {d.heldKobo > 0 ? (
            <View style={styles.held}>
              <ShieldCheck size={13} color={colors.forest} variant="solid" />
              <Text variant="small" color={colors.forest}>
                Payment held
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {d.decision ? (
        <View style={[styles.card, styles.decision]}>
          <Text variant="heading">{d.decision.outcome === "refunded" ? "Refunded to the buyer" : d.decision.outcome === "split" ? "Part refund, part paid to you" : "Paid to you"}</Text>
          {d.decision.releaseKobo > 0 ? <Text variant="caption">To you: {formatNaira(d.decision.releaseKobo)}</Text> : null}
          {d.decision.refundKobo > 0 ? <Text variant="caption">Refund: {formatNaira(d.decision.refundKobo)}</Text> : null}
          {d.decision.note ? <Text variant="body">{d.decision.note}</Text> : null}
        </View>
      ) : null}

      {d.canRespond ? <ReplyForm d={d} now={now} generateUploadUrl={generateUploadUrl} onRespond={onRespond} /> : null}

      <View style={styles.card}>
        <Text variant="heading">Reported</Text>
        {d.items.map((it) => (
          <View key={it.index} style={styles.line}>
            <Text variant="caption" style={styles.flex}>
              {it.name}: {it.affectedQuantity} of {it.quantity} {it.unitLabel}
            </Text>
            <Text variant="label">{formatNaira(it.affectedKobo)}</Text>
          </View>
        ))}
        {d.note ? <Text variant="body">“{d.note}”</Text> : null}
        {d.photos.length > 0 ? (
          <View style={styles.photos}>
            {d.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
          </View>
        ) : null}
      </View>

      {d.farmResponse ? (
        <View style={styles.card}>
          <View style={styles.line}>
            <Text variant="heading" style={styles.flex}>
              Your reply
            </Text>
            {d.farmResponse.stanceLabel ? <StatusBadge label={d.farmResponse.stanceLabel} tone={d.farmResponse.stance === "disagrees" ? "error" : "brand"} /> : null}
          </View>
          <Text variant="body">{d.farmResponse.note}</Text>
          {d.farmResponse.photos.length > 0 ? (
            <View style={styles.photos}>
              {d.farmResponse.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Timeline steps={steps} />
      </View>

      <View style={styles.line}>
        <Text variant="overline" style={styles.flex}>
          Messages
        </Text>
        <Button label="Open order" variant="ghost" size="small" onPress={() => router.push({ pathname: "/farm-order/[id]", params: { id: d.orderId } })} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Problem report" />
      <ChatThread
        messages={d.messages
          .map((m) => ({
            _id: m._id,
            mine: m.mine,
            body: m.body,
            photos: m.photos,
            at: m.at,
            staff: m.from === "staff",
            authorName: m.from === "staff" ? (m.authorName ?? "Farmkeke support") : m.from === "consumer" ? d.consumerFirstName || "Buyer" : null,
          }))
          .reverse()}
        loading={false}
        startAtTop
        header={header}
        empty="Messages with the buyer and Farmkeke support show here."
        canSend={d.canMessage}
        closedNote="This case is closed."
        placeholder="Message the buyer and Farmkeke"
        maxPhotos={6}
        generateUploadUrl={generateUploadUrl}
        onSend={async (body, photoIds) => {
          await onSend(body, photoIds);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  stack: { gap: spacing.md },
  hero: { backgroundColor: colors.forest, borderRadius: radii.lg + 10, padding: spacing.xl, gap: spacing.xs, overflow: "hidden" },
  glow: { position: "absolute", right: -50, top: -70, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(169,214,84,0.14)" },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, color: colors.white },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  held: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  reply: { borderWidth: 1.5, borderColor: colors.lime },
  decision: { borderWidth: 1.5, borderColor: colors.lime },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stances: { flexDirection: "row", gap: spacing.xs },
  note: { minHeight: 96, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, padding: spacing.md, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
  noOutline: { outlineStyle: "none" } as object,
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photo: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.placeholder },
});
