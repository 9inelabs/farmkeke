// F-21 Add listing: photos (and F-27 edit). Up to 6; the first is the cover.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_LISTING_PHOTOS } from "@convex/lib/listing";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight, Lightbulb, Star, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Notice, Text } from "@/components/ui";
import { AddPhotoButtons, CameraPrimer, PendingTile } from "@/features/farmer/PhotoTiles";
import { usePhotoUploads } from "@/features/farmer/usePhotoUploads";
import { ListingStep } from "@/features/listings/ListingStep";
import { useListing } from "@/features/listings/useListing";
import { errorMessage } from "@/lib/errors";
import { pickPhotos, shouldExplainCamera } from "@/lib/upload";
import { colors, radii, spacing } from "@/theme/tokens";

type Photo = { storageId: Id<"_storage">; url: string | null };

export default function ListingPhotos() {
  const { listingId, listing, editing } = useListing();
  const save = useMutation(api.listings.savePhotos);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [primer, setPrimer] = useState(false);

  const loadedId = listing?._id;
  useEffect(() => {
    if (listing) setPhotos(listing.photos);
  }, [loadedId]); // load once

  // Each upload's slot is its local file, so the finished photo keeps its preview.
  const commit = useCallback(async (slot: string, storageId: Id<"_storage">) => {
    setPhotos((list) => [...list, { storageId, url: slot }]);
  }, []);
  const uploads = usePhotoUploads(commit);
  const room = MAX_LISTING_PHOTOS - photos.length - uploads.pending.length;

  const pick = async (source: "camera" | "library") => {
    const uris = (await pickPhotos(source, true)).slice(0, Math.max(room, 0));
    for (const uri of uris) uploads.start(uri, [uri]);
  };

  const move = (from: number, to: number) =>
    setPhotos((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const onSave = async (mode: "continue" | "draft") => {
    if (uploads.pending.some((p) => !p.failed)) {
      setBanner("Wait for your photos to finish uploading.");
      return false;
    }
    if (mode === "continue" && photos.length === 0) {
      setBanner("Add at least one photo of the produce.");
      return false;
    }
    setBusy(true);
    setBanner(null);
    try {
      await save({ listingId, photoIds: photos.map((p) => p.storageId) });
      return true;
    } catch (e) {
      setBanner(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListingStep
      stepKey="photos"
      listingId={listingId}
      editing={editing}
      intro="Buyers decide from photos. Show the produce as it will arrive."
      loading={listing === undefined}
      banner={banner ?? uploads.error}
      staffNote={listing?.status === "needs_changes" ? listing.reviewNote : null}
      busy={busy}
      onSave={onSave}
    >
      <Notice icon={Lightbulb}>
        Shoot in daylight. Fill the frame with the produce, show the basket or bag you sell it in, and add a close-up.
      </Notice>

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.storageId} style={styles.tile}>
            {photo.url ? <Image source={{ uri: photo.url }} style={styles.image} contentFit="cover" accessibilityLabel={`Photo ${index + 1}`} /> : null}
            {index === 0 ? (
              <View style={styles.cover}>
                <Star size={10} color={colors.forest} fill={colors.forest} />
                <Text variant="small" color={colors.forest}>
                  Cover
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
              hitSlop={8}
              onPress={() => setPhotos((list) => list.filter((p) => p.storageId !== photo.storageId))}
              style={styles.remove}
            >
              <X size={14} color={colors.white} strokeWidth={3} />
            </Pressable>
            <View style={styles.moveRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Move photo ${index + 1} earlier`} disabled={index === 0} onPress={() => move(index, index - 1)} style={[styles.move, index === 0 && styles.hidden]}>
                <ChevronLeft size={16} color={colors.ink} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Move photo ${index + 1} later`}
                disabled={index === photos.length - 1}
                onPress={() => move(index, index + 1)}
                style={[styles.move, index === photos.length - 1 && styles.hidden]}
              >
                <ChevronRight size={16} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        ))}
        {uploads.pending.map((p) => (
          <PendingTile key={p.key} item={p} onRetry={() => uploads.retry(p)} onDiscard={() => uploads.discard(p.key)} />
        ))}
      </View>

      <Text variant="small">
        {photos.length} of {MAX_LISTING_PHOTOS} photos · use the arrows to change the order; the first is the cover.
      </Text>
      {room > 0 && (
        <AddPhotoButtons
          onCamera={() => void shouldExplainCamera().then((explain) => (explain ? setPrimer(true) : void pick("camera")))}
          onLibrary={() => void pick("library")}
        />
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
    </ListingStep>
  );
}

const SIZE = 104;

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: SIZE, height: SIZE, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.placeholder },
  image: { width: "100%", height: "100%" },
  cover: {
    position: "absolute",
    top: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.lime,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  remove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(26,26,26,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  moveRow: { position: "absolute", bottom: 4, left: 4, right: 4, flexDirection: "row", justifyContent: "space-between" },
  move: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  hidden: { opacity: 0 },
});
