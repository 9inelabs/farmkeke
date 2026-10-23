// M-67 Report a problem: the form (disputes.open). The route (app/order/[id]/problem)
// checks the order can be reported; the sample page (app/dev/orders) draws it too.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Check, ShieldCheck } from "@/components/icons";
import { Button, Notice, QuantityStepper, Screen, ScreenHeader, Text } from "@/components/ui";
import { AttachmentStrip } from "@/features/chat/AttachmentStrip";
import { useAttachments } from "@/features/chat/useAttachments";
import { errorCode } from "@/lib/errors";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { dayLabel } from "./format";
import type { OrderDetail } from "./useOrder";

const REASONS = [
  { reason: "missing", label: "Items missing" },
  { reason: "damaged", label: "Damaged or spoiled" },
  { reason: "wrong_item", label: "Wrong item sent" },
  { reason: "short", label: "Less than I ordered" },
  { reason: "other", label: "Something else" },
] as const;
type Reason = (typeof REASONS)[number]["reason"];
const MAX_PHOTOS = 5;

type Errors = Partial<Record<"reason" | "items" | "note" | "form", string>>;

export function ProblemForm({ o }: { o: OrderDetail }) {
  const open = useMutation(api.disputes.open);
  const generateUploadUrl = useMutation(api.disputes.generateUploadUrl);
  const photos = useAttachments(() => generateUploadUrl({}), MAX_PHOTOS);
  const [reason, setReason] = useState<Reason | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({}); // item index → units affected
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const indexes = Object.keys(picked).map(Number);
  const atStake = o.items.reduce((sum, it) => sum + (picked[it.index] ?? 0) * it.priceKobo, 0);

  const submit = async () => {
    const e: Errors = {};
    if (!reason) e.reason = "Choose what went wrong.";
    if (indexes.length === 0) e.items = "Tick the items affected.";
    if (!note.trim()) e.note = "Tell us what happened, in a sentence or two.";
    setErrors(e);
    if (Object.keys(e).length > 0 || photos.uploading) return;
    setBusy(true);
    try {
      const { number } = await open({
        orderId: o._id as Id<"orders">,
        reason: reason!,
        itemIndexes: indexes,
        itemQuantities: indexes.map((i) => picked[i]!),
        note: note.trim(),
        photoIds: photos.ids,
      });
      router.replace({ pathname: "/order/[id]/problem-sent", params: { id: o._id, number } });
    } catch (err) {
      setBusy(false);
      const code = errorCode(err);
      setErrors({
        form:
          code === "ALREADY_REPORTED"
            ? "You've already reported a problem with this order."
            : code === "ALREADY_CONFIRMED"
              ? "This order is already confirmed, so the payment has gone to the farm. Contact support and we'll help."
              : code === "NOTE_TOO_LONG"
                ? "That's a bit long. Keep it under 2,000 characters."
                : "We couldn't send your report. Check your connection and try again.",
      });
    }
  };

  return (
    <Screen
      scroll
      background={colors.canvas}
      contentStyle={styles.content}
      header={<ScreenHeader title="Report a problem" />}
      footer={
        <>
          {errors.form ? <Notice tone="error">{errors.form}</Notice> : null}
          <Button label="Send report" variant="dark" size="large" pill fullWidth loading={busy} disabled={photos.uploading} onPress={() => void submit()} />
        </>
      }
    >
      <Text variant="caption">
        {o.number} · {o.farmName}
        {o.deliveredAt ? ` · ${o.fulfilment === "pickup" ? "Collected" : "Delivered"} ${dayLabel(o.deliveredAt)}` : ""}
      </Text>

      <View style={styles.card}>
        <Text variant="heading">1. What went wrong?</Text>
        <View style={styles.reasons} accessibilityRole="radiogroup">
          {REASONS.map((r) => {
            const on = reason === r.reason;
            return (
              <Pressable
                key={r.reason}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  setReason(r.reason);
                  setErrors((x) => ({ ...x, reason: undefined }));
                }}
                style={[styles.reason, on && styles.reasonOn]}
              >
                <Text variant="label" style={on && styles.semibold}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.reason ? <Text variant="small" color={colors.error}>{errors.reason}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text variant="heading">2. Which items?</Text>
        {o.items.map((it) => {
          const on = picked[it.index] !== undefined;
          return (
            <View key={it.index} style={[styles.item, on && styles.itemOn]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={it.name}
                onPress={() => {
                  setPicked((p) => {
                    const next = { ...p };
                    if (on) delete next[it.index];
                    else next[it.index] = it.quantity;
                    return next;
                  });
                  setErrors((x) => ({ ...x, items: undefined }));
                }}
                style={styles.itemMain}
              >
                <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}</View>
                {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                <View style={styles.flex}>
                  <Text variant="label">{it.name}</Text>
                  <Text variant="small">
                    {it.quantity} {it.unitLabel} · {formatNaira(it.lineTotalKobo)}
                  </Text>
                </View>
              </Pressable>
              {on && it.quantity > 1 ? (
                <View style={styles.qty}>
                  <Text variant="small" style={styles.flex}>
                    How many {it.unitPlural} were affected?
                  </Text>
                  <QuantityStepper value={picked[it.index]!} min={1} max={it.quantity} onChange={(q) => setPicked((p) => ({ ...p, [it.index]: q }))} />
                </View>
              ) : null}
            </View>
          );
        })}
        {errors.items ? <Text variant="small" color={colors.error}>{errors.items}</Text> : null}
        {atStake > 0 ? (
          <Text variant="small">
            Amount in question: <Text variant="label">{formatNaira(atStake)}</Text> (delivery isn't included)
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text variant="heading">3. Tell us what happened</Text>
        <TextInput
          value={note}
          onChangeText={(t) => {
            setNote(t);
            if (errors.note) setErrors((x) => ({ ...x, note: undefined }));
          }}
          placeholder="For example: two of the tomatoes were crushed and leaking when the basket arrived."
          placeholderTextColor={colors.inkMuted}
          multiline
          maxLength={2000}
          style={[styles.note, errors.note && styles.noteError]}
          accessibilityLabel="What happened"
        />
        {errors.note ? <Text variant="small" color={colors.error}>{errors.note}</Text> : null}
        <Text variant="label">Photos (optional, up to {MAX_PHOTOS})</Text>
        <AttachmentStrip items={photos.items} onAdd={() => void photos.add()} onRemove={photos.remove} onRetry={photos.retry} full={photos.full} />
        <Text variant="small">Clear photos help us decide quickly.</Text>
      </View>

      <View style={styles.held}>
        <ShieldCheck size={20} color={colors.forest} variant="solid" />
        <Text variant="caption" color={colors.ink} style={styles.flex}>
          Your {formatNaira(o.totalKobo)} stays held while we look into it. The farm can reply, and Farmkeke decides, usually within a day.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.md },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reason: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surfaceSoft, borderWidth: 1.5, borderColor: colors.surfaceSoft },
  reasonOn: { backgroundColor: colors.tint, borderColor: colors.lime },
  item: { borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.line, padding: spacing.md, gap: spacing.sm },
  itemOn: { borderColor: colors.lime, backgroundColor: "#FBFDF6" },
  itemMain: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  thumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.placeholder },
  qty: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  note: {
    minHeight: 110,
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
  noteError: { borderColor: colors.error },
  held: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.tint },
});
