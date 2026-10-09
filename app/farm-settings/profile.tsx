// F-70 Business profile: what buyers see on the farm page.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Notice, Screen, ScreenHeader, Skeleton, Text, TextField } from "@/components/ui";
import { AddPhotoButtons, CameraPrimer, PendingTile } from "@/features/farmer/PhotoTiles";
import { useFarm } from "@/features/farmer/useFarm";
import { usePhotoUploads } from "@/features/farmer/usePhotoUploads";
import { errorMessage } from "@/lib/errors";
import { pickPhotos, shouldExplainCamera } from "@/lib/upload";
import { radii, spacing } from "@/theme/tokens";

export default function BusinessProfile() {
  const farm = useFarm();
  const update = useMutation(api.farms.updateProfile);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<{ storageId: Id<"_storage">; uri: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [primer, setPrimer] = useState(false);

  const farmId = farm?._id;
  useEffect(() => {
    if (!farm) return;
    setName(farm.name);
    setDescription(farm.description ?? "");
    setAddress(farm.address);
  }, [farmId]); // load once

  // The uploaded photo is attached to the farm when the profile is saved.
  const pickedUri = useRef<string | null>(null);
  const commit = useCallback(async (_slot: string, storageId: Id<"_storage">) => {
    setPhoto({ storageId, uri: pickedUri.current ?? "" });
  }, []);
  const uploads = usePhotoUploads(commit);

  const pick = async (source: "camera" | "library") => {
    const [uri] = await pickPhotos(source);
    if (uri) {
      pickedUri.current = uri;
      uploads.start("farm", [uri]);
    }
  };

  const save = async () => {
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = "Enter your farm's name.";
    if (!address.trim()) problems.address = "Enter the farm's address.";
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      await update({ name, description, address, photoStorageId: photo?.storageId });
      router.back();
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const uploading = uploads.pending.length > 0;
  const shownPhoto = photo?.uri || farm?.photoUrl;

  return (
    <Screen
      header={<ScreenHeader title="Business profile" />}
      footer={<Button label="Save profile" fullWidth loading={busy} disabled={farm === undefined || uploading} onPress={() => void save()} />}
    >
      {farm === undefined ? (
        <Skeleton height={300} radius={radii.lg} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {banner !== null && <Notice tone="error">{banner}</Notice>}
          {banner === null && uploads.error ? <Notice tone="error">{uploads.error}</Notice> : null}
          <View style={styles.photoRow}>
            {uploads.pending[0] ? (
              <PendingTile item={uploads.pending[0]} onRetry={() => uploads.retry(uploads.pending[0])} onDiscard={() => uploads.discard(uploads.pending[0].key)} />
            ) : shownPhoto ? (
              <Image source={{ uri: shownPhoto }} style={styles.photo} contentFit="cover" accessibilityLabel="Farm photo" />
            ) : (
              <Avatar name={name || farm.name} size={96} />
            )}
            <View style={styles.flex}>
              <Text variant="label">Farm photo</Text>
              <Text variant="small">A clear photo of your farm or your stall. Buyers see it on your farm page.</Text>
              <AddPhotoButtons
                compact
                onCamera={() => void shouldExplainCamera().then((explain) => (explain ? setPrimer(true) : void pick("camera")))}
                onLibrary={() => void pick("library")}
              />
            </View>
          </View>
          <TextField label="Farm name" value={name} onChangeText={setName} error={errors.name} />
          <TextField
            label="About your farm"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="e.g. A family farm on 6 hectares outside New Owerri, growing tomatoes and leafy greens without chemical sprays."
            helper={`${description.length}/600`}
            maxLength={600}
          />
          <TextField label="Farm address" value={address} onChangeText={setAddress} multiline error={errors.address} />
          <Text variant="small">
            Location: {farm.lga}, {farm.state}. To change the state or LGA, contact support.
          </Text>
        </ScrollView>
      )}
      <CameraPrimer
        visible={primer}
        onClose={() => setPrimer(false)}
        onAllow={() => {
          setPrimer(false);
          void pick("camera");
        }}
        onGallery={() => {
          setPrimer(false);
          void pick("library");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  photoRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  photo: { width: 96, height: 96, borderRadius: radii.md },
  flex: { flex: 1, gap: spacing.xs },
});
