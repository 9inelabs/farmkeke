// F-03 Apply: farm details (step 1 of 6).
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import * as Location from "expo-location";
import { router } from "expo-router";
import { CheckCircle2, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ChipGroup, Notice, SelectField, Text, TextField } from "@/components/ui";
import { NIGERIAN_STATES } from "@/content/nigeria";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { FARM_SIZES, FARM_TYPES, type FarmSize, type FarmType } from "@/features/farmer/constants";
import { nationalPhone, StepFooter } from "@/features/farmer/StepFooter";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { errorCode, errorMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

const STATE_OPTIONS = NIGERIAN_STATES.map((s) => ({ value: s, label: s }));
const isNigerianMobile = (s: string) => /^(\+?234|0)?[789]\d{9}$/.test(s.replace(/[\s-]/g, ""));

export default function FarmDetails() {
  const app = useEditableApplication();
  const save = useMutation(api.farmerApplications.saveFarm);

  const [farmName, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<string | undefined>();
  const [lga, setLga] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [farmSize, setFarmSize] = useState<FarmSize | undefined>();
  const [farmType, setFarmType] = useState<FarmType | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    setFarmName(app.farmName ?? "");
    setPhone(nationalPhone(app.phone));
    setState(app.state);
    setLga(app.lga ?? "");
    setAddress(app.address ?? "");
    setCoords(app.latitude !== undefined && app.longitude !== undefined ? { latitude: app.latitude, longitude: app.longitude } : null);
    setFarmSize(app.farmSize);
    setFarmType(app.farmType);
    // Load once per application, not on every live update.
  }, [appId]);

  const saveFarmLocation = async () => {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setBanner("Location is off for Farmkeke. You can skip this; staff will confirm the farm's location.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setBanner("We couldn't get your location. You can try again at the farm, or skip this.");
    } finally {
      setLocating(false);
    }
  };

  const persist = async () => {
    await save({
      farmName,
      phone: phone.trim() === "" ? undefined : phone,
      state,
      lga,
      address,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      farmSize,
      farmType,
    });
  };

  const handleError = (e: unknown) => {
    if (errorCode(e) === "INVALID_PHONE") setErrors({ phone: "Enter a Nigerian mobile number, like 0803 123 4567." });
    else setBanner(errorMessage(e));
  };

  const next = async () => {
    const problems: Record<string, string> = {};
    if (!farmName.trim()) problems.farmName = "Enter your farm's name.";
    if (!isNigerianMobile(phone)) problems.phone = "Enter a Nigerian mobile number, like 0803 123 4567.";
    if (!state) problems.state = "Choose the state.";
    if (!lga.trim()) problems.lga = "Enter the LGA.";
    if (!address.trim()) problems.address = "Enter the farm's address.";
    if (!farmSize) problems.farmSize = "Choose the farm size.";
    if (!farmType) problems.farmType = "Choose the type of farm.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await persist();
      router.push("/sell/apply/produce");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const saveLater = async () => {
    setBusy(true);
    try {
      await persist();
      return true;
    } catch (e) {
      handleError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const field = (key: string) => ({ error: errors[key], onFocus: () => setErrors((e) => ({ ...e, [key]: "" })) });

  return (
    <ApplyStep
      step={1}
      intro="Tell us about your farm. Buyers see the farm name; the rest is for Farmkeke."
      loading={app === undefined}
      banner={banner}
      adminNote={app?.status === "more_info" && app.moreInfo?.sections.includes("farm") ? app.moreInfo.note : null}
      footer={<StepFooter busy={busy} onContinue={() => void next()} onSaveLater={saveLater} />}
    >
      <TextField label="Farm name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Okafor Family Farms" {...field("farmName")} />
      <TextField
        label="Your phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="0803 123 4567"
        helper="Riders and Farmkeke staff call this number. You can also sign in with it."
        {...field("phone")}
      />
      <SelectField label="State" placeholder="Choose the state" options={STATE_OPTIONS} value={state} onChange={setState} searchable error={errors.state} />
      <TextField label="LGA" value={lga} onChangeText={setLga} placeholder="e.g. Owerri North" {...field("lga")} />
      <TextField label="Farm address" value={address} onChangeText={setAddress} placeholder="Road, village or nearest landmark" multiline {...field("address")} />

      <View style={styles.location}>
        <Text variant="label">Farm location</Text>
        {coords ? (
          <Notice icon={CheckCircle2}>Location saved. Riders use it to find your farm gate.</Notice>
        ) : (
          <Text variant="small">If you're at the farm now, save its location so riders can find you. Optional.</Text>
        )}
        <Button
          label={coords ? "Update location" : "I'm at the farm: use my location"}
          icon={MapPin}
          variant="secondary"
          loading={locating}
          onPress={() => void saveFarmLocation()}
        />
      </View>

      <ChipGroup label="Farm size" options={FARM_SIZES} value={farmSize} onChange={setFarmSize} error={errors.farmSize} />
      <ChipGroup label="Type of farm" options={FARM_TYPES} value={farmType} onChange={setFarmType} error={errors.farmType} />
    </ApplyStep>
  );
}

const styles = StyleSheet.create({ location: { gap: spacing.sm, alignItems: "flex-start" } });

