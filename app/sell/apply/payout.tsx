// F-07 Apply: payout details (step 5 of 6). The automatic account-name check
// arrives with payments (Phase 7).
import { api } from "@convex/_generated/api";
import { BANKS } from "@convex/lib/banks";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Notice, SelectField, TextField } from "@/components/ui";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { StepFooter } from "@/features/farmer/StepFooter";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { errorCode, errorMessage } from "@/lib/errors";

const BANK_OPTIONS = BANKS.map((b) => ({ value: b.code, label: b.name }));

export default function PayoutDetails() {
  const app = useEditableApplication();
  const save = useMutation(api.farmerApplications.savePayout);
  const [bankCode, setBankCode] = useState<string | undefined>();
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    setBankCode(app.bankCode);
    setAccountNumber(app.accountNumber ?? "");
    setAccountName(app.accountName ?? "");
  }, [appId]); // load once per application

  const persist = () => save({ bankCode, accountNumber, accountName });
  const handleError = (e: unknown) => {
    if (errorCode(e) === "INVALID_ACCOUNT_NUMBER") setErrors({ accountNumber: "Account numbers have 10 digits." });
    else setBanner(errorMessage(e));
  };

  const next = async () => {
    const problems: Record<string, string> = {};
    if (!bankCode) problems.bank = "Choose your bank.";
    if (!/^\d{10}$/.test(accountNumber.replace(/\D/g, ""))) problems.accountNumber = "Account numbers have 10 digits.";
    if (!accountName.trim()) problems.accountName = "Enter the name on the account.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await persist();
      router.push("/sell/apply/review");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const saveLater = async () => {
    try {
      await persist();
      return true;
    } catch (e) {
      handleError(e);
      return false;
    }
  };

  return (
    <ApplyStep
      step={5}
      intro="Where Farmkeke sends your money once buyers confirm delivery."
      loading={app === undefined}
      banner={banner}
      adminNote={app?.status === "more_info" && app.moreInfo?.sections.includes("payout") ? app.moreInfo.note : null}
      footer={<StepFooter busy={busy} onContinue={() => void next()} onSaveLater={saveLater} />}
    >
      <SelectField label="Bank" placeholder="Choose your bank" options={BANK_OPTIONS} value={bankCode} onChange={setBankCode} searchable error={errors.bank} />
      <TextField
        label="Account number"
        value={accountNumber}
        onChangeText={(t) => setAccountNumber(t.replace(/\D/g, "").slice(0, 10))}
        keyboardType="number-pad"
        placeholder="10 digits"
        error={errors.accountNumber}
        onFocus={() => setErrors((e) => ({ ...e, accountNumber: "" }))}
      />
      <TextField
        label="Account name"
        value={accountName}
        onChangeText={setAccountName}
        autoCapitalize="words"
        placeholder="As it appears at the bank"
        helper="It should match your name or your farm's registered name."
        error={errors.accountName}
        onFocus={() => setErrors((e) => ({ ...e, accountName: "" }))}
      />
      <Notice icon={Lock}>Only Farmkeke's finance team can see these details. Buyers never do.</Notice>
    </ApplyStep>
  );
}
