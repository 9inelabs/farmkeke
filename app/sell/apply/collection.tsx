// F-05 Apply: collection details (step 3 of 6). Farmkeke riders collect
// every order from the farm, so we need where and when.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Checkbox, ChipGroup, TextField } from "@/components/ui";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { LEAD_TIMES } from "@/features/farmer/constants";
import { HoursEditor, type Hours } from "@/features/farmer/HoursEditor";
import { StepFooter } from "@/features/farmer/StepFooter";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { errorMessage } from "@/lib/errors";

const LEAD_OPTIONS = LEAD_TIMES.map((l) => ({ value: l.value, label: `${l.label}` }));

export default function CollectionDetails() {
  const app = useEditableApplication();
  const save = useMutation(api.farmerApplications.saveCollection);

  const [sameAsFarm, setSameAsFarm] = useState(true);
  const [collectionAddress, setCollectionAddress] = useState("");
  const [hours, setHours] = useState<Hours>([]);
  const [leadTime, setLeadTime] = useState<number | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    const farmAddress = app.address ?? "";
    const saved = app.collectionAddress ?? "";
    setSameAsFarm(saved === "" || saved === farmAddress);
    setCollectionAddress(saved === farmAddress ? "" : saved);
    setHours(app.collectionHours);
    setLeadTime(app.leadTimeHours);
  }, [appId]); // load once per application

  const address = sameAsFarm ? (app?.address ?? "") : collectionAddress;
  const persist = () => save({ collectionAddress: address, collectionHours: hours, leadTimeHours: leadTime });

  const next = async () => {
    const problems: Record<string, string> = {};
    if (!address.trim()) problems.address = sameAsFarm ? "Add the farm's address in step 1 first." : "Enter where riders should collect.";
    if (hours.length === 0) problems.hours = "Choose at least one day.";
    else if (hours[0].opens >= hours[0].closes) problems.hours = "Closing time must be after opening time.";
    if (leadTime === undefined) problems.leadTime = "Choose how long you need.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await persist();
      router.push("/sell/apply/documents");
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveLater = async () => {
    try {
      await persist();
      return true;
    } catch (e) {
      setBanner(errorMessage(e));
      return false;
    }
  };

  return (
    <ApplyStep
      step={3}
      intro="A Farmkeke rider collects each order from you. Tell us where and when."
      loading={app === undefined}
      banner={banner}
      adminNote={app?.status === "more_info" && app.moreInfo?.sections.includes("collection") ? app.moreInfo.note : null}
      footer={<StepFooter busy={busy} onContinue={() => void next()} onSaveLater={saveLater} />}
    >
      <Checkbox label="Collect from the farm address" checked={sameAsFarm} onChange={setSameAsFarm} />
      {sameAsFarm ? (
        <TextField label="Collection address" value={app?.address ?? ""} editable={false} error={errors.address} />
      ) : (
        <TextField
          label="Collection address"
          value={collectionAddress}
          onChangeText={setCollectionAddress}
          placeholder="Where should riders come?"
          multiline
          error={errors.address}
        />
      )}
      <HoursEditor value={hours} onChange={setHours} error={errors.hours} />
      <ChipGroup
        label="How long do you need to prepare an order?"
        helper="From when you accept it to when it's ready for the rider."
        options={LEAD_OPTIONS}
        value={leadTime}
        onChange={setLeadTime}
        error={errors.leadTime}
      />
    </ApplyStep>
  );
}
