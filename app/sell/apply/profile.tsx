// Farmer sign-up: "Let's get to know you!" The farmer's photo and full name,
// the farm's name, and where the farm is: chosen by hand (state, LGA and an
// address or landmark) or found from the phone's location.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Camera, ChevronDown, Pin } from "@/components/icons";
import { BottomSheet, Button, SelectField, Text, TextField } from "@/components/ui";
import { NIGERIAN_STATES } from "@/content/nigeria";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorMessage } from "@/lib/errors";
import { pickPhotos, preparePhoto, uploadFile } from "@/lib/upload";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const STATE_OPTIONS = NIGERIAN_STATES.map((s) => ({ value: s, label: s }));
type Place = { state?: string; lga: string; address: string; latitude?: number; longitude?: number };

// "Imo State" → "Imo", matched against the list of states
const matchState = (region?: string | null) => {
  const clean = (region ?? "").replace(/\s*state$/i, "").trim().toLowerCase();
  return NIGERIAN_STATES.find((s) => s.toLowerCase() === clean || (clean === "abuja" && s.startsWith("FCT")));
};

export default function Profile() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const app = useEditableApplication();
  const save = useMutation(api.farmerApplications.saveProfile);
  const generateUploadUrl = useMutation(api.farmerApplications.generateUploadUrl);

  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [place, setPlace] = useState<Place>({ lga: "", address: "" });
  const [photo, setPhoto] = useState<{ uri: string; id?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const appId = app?._id;
  useEffect(() => {
    if (!app) return;
    setFullName(app.fullName ?? "");
    setFarmName(app.farmName ?? "");
    setPlace({ state: app.state, lga: app.lga ?? "", address: app.address ?? "", latitude: app.latitude, longitude: app.longitude });
    if (app.photoUrl) setPhoto({ uri: app.photoUrl });
    // Load once per application, not on every live update
  }, [appId]);

  const choosePhoto = async () => {
    const [uri] = await pickPhotos("library");
    if (!uri) return;
    setPhoto({ uri });
    setUploading(true);
    try {
      const id = await uploadFile(await generateUploadUrl({}), await preparePhoto(uri));
      setPhoto({ uri, id });
      await save({ photoStorageId: id as Id<"_storage"> });
    } catch {
      setPhoto(null);
      setErrors((e) => ({ ...e, photo: "That photo didn't upload. Try again." }));
    } finally {
      setUploading(false);
    }
  };

  const findMe = async () => {
    setLocating(true);
    setErrors((e) => ({ ...e, place: "" }));
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setErrors((e) => ({ ...e, place: "Location is off for Farmkeke. Choose the location yourself instead." }));
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [found] = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude }).catch(() => []);
      const next: Place = {
        state: matchState(found?.region) ?? place.state,
        lga: found?.subregion ?? found?.district ?? found?.city ?? place.lga,
        address: [found?.streetNumber, found?.street ?? found?.name].filter(Boolean).join(" ") || place.address,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      setPlace(next);
      // Let the farmer check what was found, and add a landmark
      setSheet(true);
    } catch {
      setErrors((e) => ({ ...e, place: "We couldn't find your location. Choose it yourself instead." }));
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    const problems: Record<string, string> = {};
    if (!fullName.trim()) problems.fullName = "Enter your full name.";
    if (!farmName.trim()) problems.farmName = "Enter your farm's name.";
    if (!place.state || !place.lga.trim() || !place.address.trim()) problems.place = "Choose where your farm is.";
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await save({ fullName, farmName, state: place.state, lga: place.lga, address: place.address, latitude: place.latitude, longitude: place.longitude });
      if (from === "review") router.back();
      else router.push("/sell/apply/bank");
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const summary = place.state && place.lga ? `${place.address ? `${place.address}, ` : ""}${place.lga}, ${place.state}` : null;

  return (
    <SellShell
      curve="right"
      sticker="right"
      footer={<Button label={from === "review" ? "Save changes" : "Set Bank Details"} variant="black" size="large" fullWidth loading={busy || app === undefined} disabled={uploading} onPress={() => void submit()} />}
    >
      <SellTitle title="Let's get to know you!" note="Please fill in all details correctly" />

      <View style={styles.photoWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel="Set profile picture" onPress={() => void choosePhoto()} style={styles.ring}>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" /> : <View style={styles.photo} />}
          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
          <View style={styles.camera}>
            <Camera size={14} color={colors.forest} />
          </View>
        </Pressable>
        <Text style={styles.photoLabel}>{photo ? "Change Profile Picture" : "Set Profile Picture"}</Text>
        {errors.photo ? (
          <Text variant="small" color={colors.error}>
            {errors.photo}
          </Text>
        ) : null}
      </View>

      <TextField tone="lime" label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Okafor John" autoCapitalize="words" autoComplete="name" error={errors.fullName} />
      <TextField tone="lime" label="Name of Farm" value={farmName} onChangeText={setFarmName} placeholder="Okafor's Farm" autoCapitalize="words" error={errors.farmName} />

      <View style={styles.locationBlock}>
        <Pressable accessibilityRole="button" accessibilityLabel={summary ? `Farm location: ${summary}. Change` : "Select location"} onPress={() => setSheet(true)} style={[styles.select, errors.place ? styles.selectError : null]}>
          <Text variant="body" color={summary ? colors.ink : colors.inkMuted} numberOfLines={1} style={styles.flex}>
            {summary ?? "Select location"}
          </Text>
          <ChevronDown size={18} color={colors.inkMuted} />
        </Pressable>
        <Button label="Search location automatically" icon={Pin} variant="primary" pill fullWidth loading={locating} onPress={() => void findMe()} />
        <Text variant="small" color={colors.inkMuted} align="center">
          Only Farmkeke and your riders see the exact location
        </Text>
        {errors.place ? (
          <Text variant="small" color={colors.error} align="center">
            {errors.place}
          </Text>
        ) : null}
      </View>
      {errors.form ? (
        <Text variant="small" color={colors.error}>
          {errors.form}
        </Text>
      ) : null}

      <LocationSheet visible={sheet} place={place} onClose={() => setSheet(false)} onDone={(p) => { setPlace(p); setSheet(false); setErrors((e) => ({ ...e, place: "" })); }} />
    </SellShell>
  );
}

/** Where the farm is, by hand: state, LGA, and an address or landmark riders can find. */
function LocationSheet({ visible, place, onClose, onDone }: { visible: boolean; place: Place; onClose: () => void; onDone: (p: Place) => void }) {
  const [state, setState] = useState(place.state);
  const [lga, setLga] = useState(place.lga);
  const [address, setAddress] = useState(place.address);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setState(place.state);
      setLga(place.lga);
      setAddress(place.address);
      setError(null);
    }
  }, [visible, place]);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle} accessibilityRole="header">
        Where's your farm?
      </Text>
      <SelectField label="State" placeholder="Choose the state" options={STATE_OPTIONS} value={state} onChange={setState} searchable />
      <TextField label="LGA" value={lga} onChangeText={setLga} placeholder="e.g. Owerri North" />
      <TextField label="Address or landmark" value={address} onChangeText={setAddress} placeholder="Road, village or nearest landmark" />
      {error ? (
        <Text variant="small" color={colors.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label="Use this location"
        variant="black"
        size="large"
        fullWidth
        onPress={() => {
          if (!state || !lga.trim() || !address.trim()) return setError("Choose the state, and add the LGA and an address or landmark.");
          onDone({ ...place, state, lga: lga.trim(), address: address.trim() });
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photoWrap: { alignItems: "center", gap: spacing.sm },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: colors.lime, padding: 4 },
  photo: { flex: 1, borderRadius: 52, backgroundColor: colors.placeholder },
  uploading: { position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: 52, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  camera: { position: "absolute", right: 2, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  photoLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  locationBlock: { gap: spacing.md },
  select: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 56, borderRadius: radii.md + 2, borderWidth: 1, borderColor: "rgba(169,214,84,0.6)", backgroundColor: colors.white, paddingHorizontal: spacing.lg },
  selectError: { borderColor: colors.error },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, color: colors.ink, marginBottom: spacing.xs },
});
