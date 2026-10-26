// The sheets on a farm order: decline with a reason (F-42), hand over to the
// rider with a last check of the items (F-45), and the buyer's 4-digit code
// for pickup at the farm.
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Bike, Call, Danger, Key } from "@/components/icons";
import { BottomSheet, Button, Checkbox, RadioRow, Text } from "@/components/ui";
import { displayPhone } from "@/lib/phone";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { DECLINE_REASONS, type DeclineReason } from "./status";

function SheetHead({ icon: Icon, title, note, tone = "brand" }: { icon: typeof Key; title: string; note: string; tone?: "brand" | "danger" }) {
  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, tone === "danger" && styles.headIconDanger]}>
        <Icon size={22} color={tone === "danger" ? colors.error : colors.forest} variant="solid" />
      </View>
      <Text variant="heading" accessibilityRole="header" align="center">
        {title}
      </Text>
      <Text variant="caption" align="center">
        {note}
      </Text>
    </View>
  );
}

/** F-42 Decline: why, with a note required for "something else". */
export function DeclineSheet({ visible, onClose, paid, onDecline }: { visible: boolean; onClose: () => void; paid: boolean; onDecline: (reason: DeclineReason, note?: string) => Promise<unknown> }) {
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote("");
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    if (reason === null) return setError("Choose a reason.");
    if (reason === "other" && note.trim() === "") return setError("Tell the buyer why.");
    setBusy(true);
    setError(null);
    try {
      await onDecline(reason, note.trim() || undefined);
    } catch (e) {
      setError(errorCode(e) === "WRONG_STATUS" ? "This order has already moved on." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!busy}>
      <SheetHead icon={Danger} tone="danger" title="Decline this order?" note={paid ? "The buyer is refunded in full." : "The buyer isn't charged."} />
      <View style={styles.group} accessibilityRole="radiogroup">
        {DECLINE_REASONS.map((r, i) => (
          <View key={r.value} style={i > 0 && styles.divider}>
            <RadioRow title={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
          </View>
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={(t) => setNote(t.slice(0, 500))}
        placeholder={reason === "other" ? "What should the buyer know?" : "Add a note (optional)"}
        placeholderTextColor={colors.inkMuted}
        multiline
        accessibilityLabel="Note for the buyer"
        style={[styles.note, Platform.OS === "web" && styles.noOutline]}
      />
      {error ? (
        <Text variant="small" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Button label="Keep it" variant="outline" pill onPress={onClose} disabled={busy} style={styles.flex} />
        <Button label="Decline" variant="danger" pill onPress={() => void submit()} loading={busy} style={styles.flex} />
      </View>
    </BottomSheet>
  );
}

/** F-45 Hand to the rider: who's collecting, and a last check of every item. */
export function HandoverSheet({
  visible,
  onClose,
  rider,
  items,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  rider: { name: string; phone: string } | null;
  items: { index: number; name: string; quantity: number; unitLabel: string }[];
  onConfirm: () => Promise<unknown>;
}) {
  const [ticked, setTicked] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) {
      setTicked([]);
      setError(null);
    }
  }, [visible]);
  const all = ticked.length === items.length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(errorCode(e) === "NOT_PAID_YET" ? "The buyer hasn't paid yet. Keep the order until they do." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!busy}>
      <SheetHead icon={Bike} title="Hand to the rider" note="Check each item as it goes." />
      <View style={styles.rider}>
        <View style={styles.riderIcon}>
          <Bike size={20} color={colors.forest} />
        </View>
        <View style={styles.flex}>
          <Text variant="small">Rider</Text>
          <Text variant="label">{rider?.name ?? "Farmkeke rider"}</Text>
        </View>
        {rider ? (
          <View style={styles.riderPhone}>
            <Call size={14} color={colors.inkSoft} />
            <Text variant="small">{displayPhone(rider.phone)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.checks}>
        {items.map((it) => (
          <Checkbox
            key={it.index}
            label={`${it.quantity} ${it.unitLabel} · ${it.name}`}
            checked={ticked.includes(it.index)}
            onChange={(on) => setTicked((t) => (on ? [...t, it.index] : t.filter((x) => x !== it.index)))}
          />
        ))}
      </View>
      {error ? (
        <Text variant="small" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={all ? "Confirm handover" : `Tick all ${items.length} items`} variant="dark" size="large" pill fullWidth disabled={!all} loading={busy} onPress={() => void submit()} />
    </BottomSheet>
  );
}

/** Pickup at the farm: the buyer's 4-digit code hands the order over. */
export function CodeSheet({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (code: string) => Promise<unknown> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (visible) {
      setCode("");
      setError(null);
      const t = setTimeout(() => input.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const submit = async (value = code) => {
    if (value.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(value);
    } catch (e) {
      const c = errorCode(e);
      setError(c === "WRONG_PICKUP_CODE" ? "That code isn't right. Check it with the buyer." : c === "RATE_LIMITED" ? "Too many tries. Wait an hour, or contact support." : errorMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!busy}>
      <SheetHead icon={Key} title="Enter pickup code" note="Ask the buyer for their 4-digit code." />
      <Pressable onPress={() => input.current?.focus()} style={styles.code} accessibilityLabel="Pickup code" accessibilityHint="Opens the keypad">
        {[0, 1, 2, 3].map((i) => {
          const filled = code[i] !== undefined;
          const active = i === code.length && !busy;
          return (
            <View key={i} style={[styles.digit, filled && styles.digitFilled, active && styles.digitActive, error !== null && styles.digitError]}>
              <Text style={styles.digitText}>{code[i] ?? ""}</Text>
            </View>
          );
        })}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, "").slice(0, 4);
            setCode(v);
            setError(null);
            if (v.length === 4) void submit(v);
          }}
          keyboardType="number-pad"
          maxLength={4}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          caretHidden
          style={styles.hidden}
          accessibilityLabel="Pickup code"
        />
      </Pressable>
      {error ? (
        <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label="Confirm collection" variant="dark" size="large" pill fullWidth disabled={code.length !== 4} loading={busy} onPress={() => void submit()} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.xs },
  headIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  headIconDanger: { backgroundColor: colors.errorSoft },
  group: { backgroundColor: colors.surfaceSoft, borderRadius: radii.lg, overflow: "hidden" },
  divider: { borderTopWidth: 1, borderTopColor: colors.white },
  note: { minHeight: 76, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, padding: spacing.md, paddingTop: spacing.md, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
  noOutline: { outlineStyle: "none" } as object,
  row: { flexDirection: "row", gap: spacing.sm },
  rider: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft },
  riderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  riderPhone: { flexDirection: "row", alignItems: "center", gap: 4 },
  checks: { gap: spacing.md, paddingVertical: spacing.xs },
  code: { flexDirection: "row", justifyContent: "center", gap: spacing.md, paddingVertical: spacing.sm },
  digit: { width: 60, height: 70, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  digitFilled: { backgroundColor: colors.tint },
  digitActive: { borderColor: colors.lime, backgroundColor: colors.white },
  digitError: { borderColor: colors.error },
  digitText: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 31, color: colors.forest },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
