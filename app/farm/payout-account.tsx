// F-62 Payout account: where the farm's money goes. The account is checked
// with the bank before it's saved (live payments), saving asks for the
// farmer's PIN (or password), and the farmer gets a text whenever it changes.
import { api } from "@convex/_generated/api";
import { BANKS } from "@convex/lib/banks";
import { useAction, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Bank, CheckCircle, Lock } from "@/components/icons";
import { BottomSheet, Button, ScreenHeader, SelectField, Skeleton, Text, TextField } from "@/components/ui";
import { Card } from "@/features/farm/ui";
import { CodeBoxes } from "@/features/sell/CodeBoxes";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { showToast } from "@/store/toast";
import { colors, radii, spacing } from "@/theme/tokens";

const BANK_OPTIONS = BANKS.map((b) => ({ value: b.code, label: b.name }));

type Check = { state: "idle" } | { state: "checking" } | { state: "found"; name: string } | { state: "manual" } | { state: "error"; message: string };

export default function PayoutAccount() {
  const insets = useSafeAreaInsets();
  const farm = useQuery(api.farms.mine);
  const resolve = useAction(api.payments.bank.resolveAccount);
  const save = useAction(api.payments.bank.savePayoutAccount);
  const login = useQuery(api.phoneAuth.mine);
  const usesPin = login?.hasPin === true;
  const [confirming, setConfirming] = useState(false);
  const [secret, setSecret] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bankCode, setBankCode] = useState<string | undefined>();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  // Look the account up as soon as the bank and all 10 digits are in
  useEffect(() => {
    if (!bankCode || number.length !== 10) {
      setCheck({ state: "idle" });
      return;
    }
    const id = ++run.current;
    setCheck({ state: "checking" });
    resolve({ accountNumber: number, bankCode })
      .then((r) => {
        if (id !== run.current) return;
        setCheck(r.accountName ? { state: "found", name: r.accountName } : { state: "manual" });
      })
      .catch((e: unknown) => {
        if (id !== run.current) return;
        const c = errorCode(e);
        setCheck({ state: "error", message: c === "ACCOUNT_NOT_FOUND" ? "We couldn't find that account. Check the number and bank." : c === "INVALID_ACCOUNT_NUMBER" ? "Account numbers have 10 digits." : errorMessage(e) });
      });
  }, [bankCode, number, resolve]);

  const ready = bankCode !== undefined && number.length === 10 && (check.state === "found" || (check.state === "manual" && name.trim().length > 1));

  const submit = async (value = secret) => {
    if (!ready || !bankCode || busy || value.length === 0) return;
    setBusy(true);
    setConfirmError(null);
    try {
      const saved = await save({ accountNumber: number, bankCode, accountName: check.state === "manual" ? name.trim() : undefined, secret: value });
      setConfirming(false);
      showToast({ message: `Payouts now go to ${saved.bankName} ••${saved.accountLast4}` });
      router.back();
    } catch (e) {
      const code = errorCode(e);
      setSecret("");
      if (code === "WRONG_PIN") {
        const left = errorData<{ attemptsLeft?: number }>(e).attemptsLeft;
        setConfirmError(left !== undefined ? `That PIN isn't right. ${left} ${left === 1 ? "try" : "tries"} left before it locks.` : errorMessage(e));
      } else if (code === "WRONG_PASSWORD" || code === "PIN_LOCKED" || code === "TOO_MANY_ATTEMPTS") {
        setConfirmError(errorMessage(e));
      } else {
        setConfirming(false);
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const askToConfirm = () => {
    if (!ready) return;
    setError(null);
    setSecret("");
    setConfirmError(null);
    setConfirming(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Payout account" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {farm === undefined ? (
            <Skeleton height={86} radius={radii.lg + 4} />
          ) : farm ? (
            <View style={styles.current}>
              <View style={styles.bankIcon}>
                <Bank size={22} color={colors.lime} />
              </View>
              <View style={styles.flex}>
                <Text variant="small" color="rgba(255,255,255,0.65)">
                  Paying into
                </Text>
                <Text variant="heading" color={colors.white}>
                  {farm.bankName} ••{farm.accountLast4}
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.8)">
                  {farm.accountName}
                </Text>
              </View>
            </View>
          ) : null}

          <Text variant="overline">New account</Text>
          <Card>
            <SelectField label="Bank" placeholder="Choose your bank" options={BANK_OPTIONS} value={bankCode} onChange={setBankCode} searchable />
            <TextField label="Account number" value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" placeholder="10 digits" />
            {check.state === "checking" ? (
              <View style={styles.status}>
                <ActivityIndicator size="small" color={colors.forest} />
                <Text variant="caption">Checking with the bank…</Text>
              </View>
            ) : check.state === "found" ? (
              <View style={[styles.status, styles.found]}>
                <CheckCircle size={18} color={colors.forest} variant="solid" />
                <Text variant="label" color={colors.forest} style={styles.flex}>
                  {check.name}
                </Text>
              </View>
            ) : check.state === "error" ? (
              <Text variant="small" color={colors.error}>
                {check.message}
              </Text>
            ) : check.state === "manual" ? (
              <TextField label="Account name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="As it appears at the bank" />
            ) : null}
          </Card>

          <View style={styles.note}>
            <Lock size={16} color={colors.inkMuted} />
            <Text variant="small" style={styles.flex}>
              We'll text you whenever this changes. Only Farmkeke's finance team sees it.
            </Text>
          </View>
          {error ? (
            <Text variant="small" color={colors.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button label="Save account" variant="dark" size="large" pill fullWidth disabled={!ready} onPress={askToConfirm} />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} dismissible={!busy}>
        <View style={styles.sheetHead}>
          <View style={styles.lockIcon}>
            <Lock size={20} color={colors.forest} />
          </View>
          <Text variant="heading" accessibilityRole="header">
            Confirm it's you
          </Text>
          <Text variant="caption" align="center">
            {usesPin ? "Enter your 4-digit PIN to change where your money goes." : "Enter your password to change where your money goes."}
          </Text>
        </View>
        {usesPin ? (
          <CodeBoxes length={4} secure value={secret} onChange={(v) => { setSecret(v); setConfirmError(null); }} onFilled={(v) => void submit(v)} error={confirmError !== null} autoFocus label="PIN" />
        ) : (
          <TextField label="Password" value={secret} onChangeText={(v) => { setSecret(v); setConfirmError(null); }} secureTextEntry autoComplete="current-password" autoFocus error={confirmError ?? undefined} />
        )}
        {usesPin && confirmError ? (
          <Text variant="small" color={colors.error} align="center" accessibilityLiveRegion="polite">
            {confirmError}
          </Text>
        ) : null}
        <Button label="Confirm and save" variant="dark" size="large" pill fullWidth loading={busy} disabled={usesPin ? secret.length !== 4 : secret.length === 0} onPress={() => void submit()} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, gap: spacing.md },
  current: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.forest, borderRadius: radii.lg + 8, padding: spacing.lg },
  bankIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(169,214,84,0.16)", alignItems: "center", justifyContent: "center" },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40 },
  found: { backgroundColor: colors.tint, borderRadius: radii.md, paddingHorizontal: spacing.md },
  note: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs },
  sheetHead: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.xs },
  lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  dock: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, backgroundColor: colors.canvas },
});
