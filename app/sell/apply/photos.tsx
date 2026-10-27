// Farmer sign-up: farm photos (KYC, 27 Oct 2026). At least 3 clear photos of
// the farm, crops or animals, up to 10. Each one uploads as soon as it's
// picked; staff see them when they review the application, and a photo they
// reject shows here with their note so it can be replaced.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_FARM_PHOTOS, MIN_FARM_PHOTOS } from "@convex/lib/application";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Camera, Close, ImageAdd } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorMessage } from "@/lib/errors";
import { pickPhotos, preparePhoto, uploadFile, type PhotoSource } from "@/lib/upload";
import { colors, radii, spacing } from "@/theme/tokens";

export default function FarmPhotos() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const app = useEditableApplication();
  const generateUploadUrl = useMutation(api.farmerApplications.generateUploadUrl);
  const addDocument = useMutation(api.farmerApplications.addDocument);
  const removeDocument = useMutation(api.farmerApplications.removeDocument);
  // Photos still uploading, by their local address
  const [pending, setPending] = useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photos = (app?.documents ?? []).filter((d) => d.kind === "farm_photo" && d.status !== "expired");
  const rejected = photos.filter((d) => d.status === "rejected");
  const counted = photos.length - rejected.length;
  const room = MAX_FARM_PHOTOS - counted - pending.length;

  const add = async (source: PhotoSource) => {
    setError(null);
    const picked = (await pickPhotos(source, source === "library")).slice(0, Math.max(0, room));
    if (picked.length === 0) return;
    setPending((p) => [...p, ...picked]);
    let failed = 0;
    for (const uri of picked) {
      try {
        const id = await uploadFile(await generateUploadUrl({}), await preparePhoto(uri));
        await addDocument({ kind: "farm_photo", storageId: id as Id<"_storage"> });
      } catch (e) {
        if (errorCode(e) === "TOO_MANY_PHOTOS") setError(`You can add up to ${MAX_FARM_PHOTOS} photos.`);
        else failed++;
      } finally {
        setPending((p) => p.filter((u) => u !== uri));
      }
    }
    if (failed > 0) setError(failed === 1 ? "A photo didn't upload. Try it again." : `${failed} photos didn't upload. Try them again.`);
  };

  const remove = async (id: Id<"farmerDocuments">) => {
    setRemoving(id);
    setError(null);
    try {
      await removeDocument({ documentId: id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRemoving(null);
    }
  };

  const next = () => {
    if (pending.length > 0) return setError("Wait for your photos to finish uploading.");
    if (counted < MIN_FARM_PHOTOS) return setError(`Add at least ${MIN_FARM_PHOTOS} photos of your farm.`);
    if (from === "review") router.back();
    else router.push("/sell/apply/bank");
  };

  const status =
    counted >= MIN_FARM_PHOTOS
      ? `${counted} photos added. You can add up to ${MAX_FARM_PHOTOS}.`
      : `${counted} of ${MIN_FARM_PHOTOS} photos added`;

  return (
    <SellShell
      scene="profile"
      curve="left"
      sticker="center"
      footer={<Button label={from === "review" ? "Save changes" : "Set Bank Details"} variant="black" size="large" fullWidth loading={app === undefined} disabled={pending.length > 0} onPress={next} />}
    >
      <SellTitle title="Show us your" accent="Farm" note={`Add at least ${MIN_FARM_PHOTOS} clear photos of your farm, crops or animals. Only Farmkeke staff see them.`} />

      <View style={styles.grid}>
        {photos.map((d) => (
          <View key={d._id} style={[styles.tile, d.status === "rejected" && styles.tileRejected]}>
            {d.url ? <Image source={{ uri: d.url }} style={styles.image} contentFit="cover" /> : <View style={styles.image} />}
            {d.status === "rejected" ? (
              <View style={styles.rejectedBand}>
                <Text variant="small" color={colors.white} numberOfLines={2}>
                  Not accepted{d.note ? `: ${d.note}` : ""}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove this photo"
              hitSlop={8}
              disabled={removing !== null}
              onPress={() => void remove(d._id)}
              style={styles.remove}
            >
              {removing === d._id ? <ActivityIndicator size="small" color={colors.white} /> : <Close size={14} color={colors.white} />}
            </Pressable>
          </View>
        ))}
        {pending.map((uri) => (
          <View key={uri} style={styles.tile}>
            <Image source={{ uri }} style={styles.image} contentFit="cover" />
            <View style={styles.uploading}>
              <ActivityIndicator color={colors.white} />
            </View>
          </View>
        ))}
        {room > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Add photos from your gallery" onPress={() => void add("library")} style={[styles.tile, styles.addTile]}>
            <ImageAdd size={26} color={colors.forest} />
            <Text variant="small" color={colors.forest}>
              Add photos
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text variant="small" color={counted >= MIN_FARM_PHOTOS ? colors.forest : colors.inkSoft} align="center">
        {status}
      </Text>
      {rejected.length > 0 ? (
        <Text variant="small" color={colors.error} align="center">
          Remove the photos we couldn't accept and add new ones.
        </Text>
      ) : null}
      {room > 0 ? <Button label="Take a photo" icon={Camera} variant="primary" pill fullWidth onPress={() => void add("camera")} /> : null}
      {error ? (
        <Text variant="small" color={colors.error} align="center">
          {error}
        </Text>
      ) : null}
    </SellShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "31.5%", aspectRatio: 1, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.placeholder },
  tileRejected: { borderWidth: 2, borderColor: colors.error },
  image: { width: "100%", height: "100%", backgroundColor: colors.placeholder },
  addTile: { alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.white, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lime },
  remove: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  uploading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  rejectedBand: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: "rgba(198,40,40,0.85)" },
});
