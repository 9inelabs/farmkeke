// The sheets on a farm order: decline with a reason (F-42), and the buyer's
// 4-digit code for pickup at the farm (optional since 22 Nov 2026: the buyer
// can confirm it themselves). The farm no longer hands over to the rider in
// the app; Farmkeke marks that from Dispatch.
import { useEffect, useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { Camera, Danger, Key } from "@/components/icons";
import { PinPad } from "@/components/premium";
import { BottomSheet, Button, RadioRow, Text } from "@/components/ui";
import { errorCode, errorMessage } from "@/lib/errors";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PickupScanner } from "./PickupScanner";
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

/** Pickup at the farm: the buyer's 4-digit code hands the order over. */
// The camera scanner is for phones; the browser preview types the code
const CAN_SCAN = Platform.OS !== "web";

export function CodeSheet({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (code: string) => Promise<unknown> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    if (visible) {
      setCode("");
      setError(null);
      setScanning(false);
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
      <SheetHead icon={Key} title="Enter pickup code" note={CAN_SCAN ? "Scan the QR code on the buyer's order, or type their 4-digit code." : "Ask the buyer for their 4-digit code."} />
      {CAN_SCAN ? (
        <Button
          label="Scan QR code"
          icon={Camera}
          variant="primary"
          size="large"
          pill
          fullWidth
          disabled={busy}
          onPress={() => {
            setError(null);
            setScanning(true);
          }}
        />
      ) : null}
      <View style={styles.code} accessible accessibilityLabel={`Pickup code: ${code.length} of 4 digits entered`} accessibilityLiveRegion="polite">
        {[0, 1, 2, 3].map((i) => {
          const filled = code[i] !== undefined;
          const active = i === code.length && !busy;
          return (
            <View key={i} style={[styles.digit, filled && styles.digitFilled, active && styles.digitActive, error !== null && styles.digitError]}>
              <Text style={styles.digitText}>{code[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      {/* Farmkeke's own keypad: the phone's keyboard doesn't open for a hidden input inside a sheet on Android */}
      <PinPad
        tone="light"
        dots={false}
        length={4}
        value={code}
        onChange={(v) => {
          setCode(v);
          setError(null);
        }}
        onFilled={(v) => void submit(v)}
        disabled={busy || scanning}
        label="Pickup code"
      />
      {error ? (
        <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label="Confirm collection" variant="dark" size="large" pill fullWidth disabled={code.length !== 4} loading={busy} onPress={() => void submit()} />
      <PickupScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onCode={(scanned) => {
          setScanning(false);
          setCode(scanned);
          void submit(scanned);
        }}
      />
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
  code: { flexDirection: "row", justifyContent: "center", gap: spacing.md, paddingVertical: spacing.sm },
  digit: { width: 60, height: 70, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center", borderWidth: borders.strong, borderColor: "transparent" },
  digitFilled: { backgroundColor: colors.tint },
  digitActive: { borderColor: colors.lime, backgroundColor: colors.white },
  digitError: { borderColor: colors.error },
  digitText: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 31, color: colors.forest },
});
