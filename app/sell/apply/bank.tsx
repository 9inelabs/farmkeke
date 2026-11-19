// Farmer sign-up: bank details. The account is looked up with the bank as
// soon as the 10 digits are in (live payments); when buyers confirm an order,
// the farm's earnings are paid here automatically.
import { api } from "@convex/_generated/api";
import { BANKS } from "@convex/lib/banks";
import { useAction, useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ArrowRight, Bank, Cash, Check, Lock, ShieldCheck } from "@/components/icons";
import { ForestBackdrop } from "@/components/premium";
import { Button, SelectField, Text, TextField } from "@/components/ui";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const BANK_OPTIONS = BANKS.map((b) => ({ value: b.code, label: b.name }));
type Check = { state: "idle" } | { state: "checking" } | { state: "found"; name: string } | { state: "manual" } | { state: "error"; message: string };

export default function BankDetails() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const app = useEditableApplication();
  const resolve = useAction(api.payments.bank.resolveAccount);
  const save = useMutation(api.farmerApplications.savePayout);
  const [bankCode, setBankCode] = useState<string | undefined>();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const bankName = BANKS.find((b) => b.code === bankCode)?.name;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const loaded = useRef<string | null>(null);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    setBankCode(app.bankCode);
    setNumber(app.accountNumber ?? "");
    setName(app.accountName ?? "");
    loaded.current = app.accountName ? `${app.bankCode}:${app.accountNumber}` : null;
    // Load once per application
  }, [appId]);

  useEffect(() => {
    if (!bankCode || number.length !== 10) return setCheck({ state: "idle" });
    // Already checked when it was saved
    if (loaded.current === `${bankCode}:${number}`) return setCheck({ state: "found", name });
    const id = ++run.current;
    setCheck({ state: "checking" });
    resolve({ accountNumber: number, bankCode })
      .then((r) => {
        if (id !== run.current) return;
        if (r.accountName) {
          setName(r.accountName);
          setCheck({ state: "found", name: r.accountName });
        } else setCheck({ state: "manual" });
      })
      .catch((e: unknown) => {
        if (id !== run.current) return;
        const c = errorCode(e);
        setCheck({ state: "error", message: c === "ACCOUNT_NOT_FOUND" ? "We couldn't find that account. Check the number and bank." : errorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `name` is shown, not watched
  }, [bankCode, number, resolve]);

  const submit = async () => {
    const problems: Record<string, string> = {};
    if (!bankCode) problems.bank = "Choose your bank.";
    if (number.length !== 10) problems.number = "Account numbers have 10 digits.";
    if (check.state === "manual" && name.trim().length < 2) problems.name = "Enter the name on the account.";
    if (check.state === "checking") problems.number = "Checking the account…";
    if (check.state === "error") problems.number = check.message;
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await save({ bankCode, accountNumber: number, accountName: name.trim() });
      if (from === "review") router.back();
      else router.push("/sell/apply/review");
    } catch (e) {
      setErrors({ form: errorCode(e) === "INVALID_ACCOUNT_NUMBER" ? "Account numbers have 10 digits." : errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SellShell
      step={{ current: 4, progress: check.state === "found" ? 0.9 : 0.4 }}
      footer={
        <Button
          label={from === "review" ? "Save changes" : "Next: review"}
          iconRight={from === "review" ? undefined : ArrowRight}
          variant="dark"
          size="hero"
          fullWidth
          loading={busy || app === undefined}
          onPress={() => void submit()}
        />
      }
    >
      <SellTitle title="Where should we pay you?" note="When a buyer pays, Paystack sends your share straight to this account." />
      <View style={styles.preview}>
        <ForestBackdrop />
        <View style={styles.previewTop}>
          <Text style={styles.previewLabel}>YOUR PAYOUT ACCOUNT</Text>
          <Bank size={20} color={colors.lime} strokeWidth={1.8} />
        </View>
        <Text style={styles.previewNumber}>{number.length > 0 ? `${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`.trim() : "•••• ••• •••"}</Text>
        <View style={styles.previewBottom}>
          <View style={styles.flex}>
            <Text style={styles.previewSmall}>{bankName ?? "Choose your bank"}</Text>
            <Text style={styles.previewName} numberOfLines={1}>
              {(check.state === "found" ? check.name : name || "Account name").toUpperCase()}
            </Text>
          </View>
          {check.state === "found" ? (
            <View style={styles.verified}>
              <Check size={12} color={colors.forest} strokeWidth={3} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
      </View>
      <SelectField label="Bank" placeholder="Choose your bank" options={BANK_OPTIONS} value={bankCode} onChange={(v) => { setBankCode(v); setErrors({}); }} searchable error={errors.bank} />
      <TextField
        tone="premium"
        valid={number.length === 10 && check.state === "found"}
        label="Account number"
        value={number}
        onChangeText={(t) => {
          setNumber(t.replace(/\D/g, "").slice(0, 10));
          setErrors({});
        }}
        keyboardType="number-pad"
        placeholder="10 digits"
        error={errors.number}
      />
      {check.state === "checking" ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.forest} />
          <Text variant="caption">Checking with the bank…</Text>
        </View>
      ) : check.state === "found" ? (
        <View style={[styles.status, styles.found]}>
          <ShieldCheck size={18} color={colors.forest} strokeWidth={1.8} />
          <Text variant="label" color={colors.forest} style={styles.flex}>
            Name matched with your bank
          </Text>
        </View>
      ) : check.state === "manual" ? (
        <TextField tone="premium" label="Account name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="As it appears at the bank" error={errors.name} />
      ) : null}

      <View style={styles.card}>
        <Row icon={Cash} text="Paid straight to this account when buyers pay" />
        <Row icon={Lock} text="Only Farmkeke's finance team sees these details" />
      </View>
      {errors.form ? (
        <Text variant="small" color={colors.error}>
          {errors.form}
        </Text>
      ) : null}
    </SellShell>
  );
}

function Row({ icon: Icon, text }: { icon: typeof Cash; text: string }) {
  return (
    <View style={styles.row}>
      <Icon size={16} color={colors.forest} />
      <Text variant="small" color={colors.inkSoft} style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  found: { backgroundColor: colors.tint, borderRadius: radii.md },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preview: { borderRadius: 22, padding: 18, overflow: "hidden", gap: 14, boxShadow: "0px 18px 40px 0px rgba(16, 35, 11, 0.25)" },
  previewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewLabel: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.8, color: colors.onForest },
  previewNumber: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: 2, color: colors.white },
  previewBottom: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  previewSmall: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.onForest },
  previewName: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.white },
  verified: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 99, backgroundColor: colors.lime },
  verifiedText: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, color: colors.forest },
});
