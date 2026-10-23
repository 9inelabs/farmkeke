// F-06 Apply: documents (step 4 of 6), with F-06a camera primer.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { CheckCircle, Info } from "@/components/icons";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Notice, Text } from "@/components/ui";
import { ApplyStep } from "@/features/farmer/ApplyStep";
import { DOCUMENTS, type DocumentKind } from "@/features/farmer/constants";
import { AddPhotoButtons, CameraPrimer, PendingTile, UploadedTile } from "@/features/farmer/PhotoTiles";
import { StepFooter } from "@/features/farmer/StepFooter";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { usePhotoUploads } from "@/features/farmer/usePhotoUploads";
import { errorMessage } from "@/lib/errors";
import { pickPhotos, shouldExplainCamera } from "@/lib/upload";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const ORDER: DocumentKind[] = ["government_id", "farm_photo", "proof_of_address", "association_letter"];
const MIN_FARM_PHOTOS = 3;

export default function Documents() {
  const app = useEditableApplication();
  const addDocument = useMutation(api.farmerApplications.addDocument);
  const removeDocument = useMutation(api.farmerApplications.removeDocument);
  const commit = useCallback(
    (slot: string, storageId: Id<"_storage">) => addDocument({ kind: slot as DocumentKind, storageId }),
    [addDocument],
  );
  const uploads = usePhotoUploads(commit);
  const [primerFor, setPrimerFor] = useState<DocumentKind | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const pick = async (kind: DocumentKind, source: "camera" | "library") => {
    const uris = await pickPhotos(source, kind === "farm_photo");
    if (uris.length > 0) uploads.start(kind, uris);
  };
  const takePhoto = async (kind: DocumentKind) => {
    if (await shouldExplainCamera()) setPrimerFor(kind);
    else void pick(kind, "camera");
  };

  const docs = app?.documents ?? [];
  const uploading = uploads.pending.some((p) => !p.failed);
  const missing = app?.problems.documents ?? [];

  const next = () => {
    if (uploading) {
      setBanner("Wait for your photos to finish uploading.");
      return;
    }
    if (missing.length > 0) {
      setBanner(missing.join(". ") + ".");
      return;
    }
    router.push("/sell/apply/payout");
  };

  return (
    <ApplyStep
      step={4}
      intro="Clear photos of each document. Make sure the writing is readable and nothing is cut off."
      loading={app === undefined}
      banner={banner ?? uploads.error}
      adminNote={app?.status === "more_info" && app.moreInfo?.sections.includes("documents") ? app.moreInfo.note : null}
      footer={<StepFooter busy={false} onContinue={next} onSaveLater={async () => !uploading} />}
    >
      {ORDER.map((kind) => {
        const meta = DOCUMENTS[kind];
        const mine = docs.filter((d) => d.kind === kind);
        const accepted = mine.filter((d) => d.status !== "rejected");
        const rejected = mine.find((d) => d.status === "rejected");
        const pending = uploads.pending.filter((p) => p.slot === kind);
        const multiple = kind === "farm_photo";
        const done = multiple ? accepted.length >= MIN_FARM_PHOTOS : accepted.length > 0;
        return (
          <View key={kind} style={[styles.card, rejected && !done && styles.cardFlagged]}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{meta.title}</Text>
                <Text variant="small">{meta.detail}</Text>
              </View>
              {done ? <CheckCircle size={20} color={colors.success} /> : null}
            </View>
            {rejected && !done ? (
              <Notice tone="error" icon={Info}>
                {`Needs a new photo${rejected.note ? `: ${rejected.note}` : "."}`}
              </Notice>
            ) : null}
            {(accepted.length > 0 || pending.length > 0) && (
              <View style={styles.tiles}>
                {accepted.map((d) => (
                  <UploadedTile
                    key={d._id}
                    url={d.url}
                    label={meta.title}
                    onRemove={() =>
                      void removeDocument({ documentId: d._id }).catch((e: unknown) => setBanner(errorMessage(e)))
                    }
                  />
                ))}
                {pending.map((p) => (
                  <PendingTile key={p.key} item={p} onRetry={() => uploads.retry(p)} onDiscard={() => uploads.discard(p.key)} />
                ))}
              </View>
            )}
            {multiple && (
              <Text variant="small" color={done ? colors.success : colors.inkMuted}>
                {accepted.length} of at least {MIN_FARM_PHOTOS} photos
              </Text>
            )}
            {/* Single documents: a new photo replaces the old one. */}
            <AddPhotoButtons compact onCamera={() => void takePhoto(kind)} onLibrary={() => void pick(kind, "library")} />
          </View>
        );
      })}

      <CameraPrimer
        visible={primerFor !== null}
        onClose={() => setPrimerFor(null)}
        onAllow={() => {
          const kind = primerFor;
          setPrimerFor(null);
          if (kind) void pick(kind, "camera");
        }}
        onGallery={() => {
          const kind = primerFor;
          setPrimerFor(null);
          if (kind) void pick(kind, "library");
        }}
      />
    </ApplyStep>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardFlagged: { borderColor: colors.error, borderWidth: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
