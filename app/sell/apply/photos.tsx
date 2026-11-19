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
import { ArrowRight, Camera, Close, Plus } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorMessage } from "@/lib/errors";
import { pickPhotos, preparePhoto, uploadFile, type PhotoSource } from "@/lib/upload";
import { borders, colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

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
      step={{ current: 3, progress: Math.min(1, Math.max(0.15, counted / MIN_FARM_PHOTOS)) }}
      footer={
        <Button
          label={from === "review" ? "Save changes" : "Next: bank account"}
          iconRight={from === "review" ? undefined : ArrowRight}
          variant="dark"
          size="hero"
          fullWidth
          loading={app === undefined}
          disabled={pending.length > 0}
          onPress={next}
        />
      }
    >
      <SellTitle title="Show us your farm" note={`Add at least ${MIN_FARM_PHOTOS} clear photos of your crops, land or animals. Only Farmkeke staff see them.`} />

      <View style={styles.grid}>
        {photos.map((d, i) => (
          <View key={d._id} style={[styles.tile, d.status === "rejected" && styles.tileRejected]}>
            {d.url ? <Image source={{ uri: d.url }} style={styles.image} contentFit="cover" transition={200} /> : <View style={styles.image} />}
            {i === 0 && d.status !== "rejected" ? (
              <View style={styles.cover}>
                <Text style={styles.coverText}>Cover</Text>
              </View>
            ) : null}
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
              {removing === d._id ? <ActivityIndicator size="small" color={colors.white} /> : <Close size={14} color={colors.white} strokeWidth={2} />}
            </Pressable>
          </View>
        ))}
        {pending.map((uri) => (
          <View key={uri} style={styles.tile}>
            <Image source={{ uri }} style={styles.image} contentFit="cover" />
            <View style={styles.uploading}>
              <ActivityIndicator color={colors.lime} />
              <Text style={styles.uploadingText}>Uploading</Text>
            </View>
          </View>
        ))}
        {room > 0 ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Take a photo" onPress={() => void add("camera")} style={({ pressed }) => [styles.tile, styles.addTile, styles.addStriped, pressed && styles.pressed]}>
              <View style={styles.addIconDark}>
                <Camera size={20} color={colors.lime} strokeWidth={1.8} />
              </View>
              <Text style={styles.addText}>Take a photo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Add photos from your gallery" onPress={() => void add("library")} style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.pressed]}>
              <View style={styles.addIcon}>
                <Plus size={20} color={colors.forest} strokeWidth={2} />
              </View>
              <Text style={styles.addText}>From gallery</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Text style={[styles.status, counted >= MIN_FARM_PHOTOS && styles.statusDone]}>{status}</Text>
      {rejected.length > 0 ? (
        <Text variant="small" color={colors.error}>
          Remove the photos we couldn't accept and add new ones.
        </Text>
      ) : null}
      {error ? (
        <Text variant="small" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </SellShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  tile: { width: "48.5%", aspectRatio: 1.15, borderRadius: 20, overflow: "hidden", backgroundColor: colors.placeholder },
  tileRejected: { borderWidth: 2, borderColor: colors.error },
  image: { width: "100%", height: "100%", backgroundColor: colors.placeholder },
  cover: { position: "absolute", left: 8, top: 8, height: 24, paddingHorizontal: 9, borderRadius: 99, backgroundColor: colors.lime, justifyContent: "center" },
  coverText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.forest },
  addTile: { alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.white, borderWidth: borders.strong, borderColor: "#C9D6B8" },
  addStriped: { backgroundColor: "#FAFCF6", borderStyle: "dashed" },
  addIconDark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  addIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  addText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.forest },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  remove: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(11,26,7,0.6)", alignItems: "center", justifyContent: "center" },
  uploading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11,26,7,0.55)", alignItems: "center", justifyContent: "center", gap: 6 },
  uploadingText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.white },
  rejectedBand: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: "rgba(198,40,40,0.85)" },
  status: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft },
  statusDone: { color: colors.forest, fontFamily: fonts.semibold },
});
