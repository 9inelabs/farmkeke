// Farmer sign-up: bank details. The account is looked up with the bank as
// soon as the 10 digits are in (live payments); when buyers confirm an order,
// the farm's earnings are paid here automatically.
import { api } from "@convex/_generated/api";
import { BANKS } from "@convex/lib/banks";
import { useAction, useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Cash, CheckCircle, Lock } from "@/components/icons";
import { Button, SelectField, Text, TextField } from "@/components/ui";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

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
      scene="bank"
      curve="left"
      sticker="center"
      footer={<Button label={from === "review" ? "Save changes" : "Review Profile"} variant="black" size="large" fullWidth loading={busy || app === undefined} onPress={() => void submit()} />}
    >
      <SellTitle title="Add your Bank" accent="Details" note="Your earnings are paid here automatically once buyers confirm their orders" />
      <SelectField label="Bank" placeholder="Choose your bank" options={BANK_OPTIONS} value={bankCode} onChange={(v) => { setBankCode(v); setErrors({}); }} searchable error={errors.bank} />
      <TextField
        tone="lime"
        label="Account Number"
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
          <CheckCircle size={18} color={colors.forest} variant="solid" />
          <Text variant="label" color={colors.forest} style={styles.flex}>
            {check.name}
          </Text>
        </View>
      ) : check.state === "manual" ? (
        <TextField tone="lime" label="Account Name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="As it appears at the bank" error={errors.name} />
      ) : null}

      <View style={styles.card}>
        <Row icon={Cash} text="Paid automatically when buyers confirm delivery" />
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
});
