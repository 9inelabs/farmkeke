// F-73 Verification and documents: status of each document, re-upload when
// staff mark one as needing a new photo or it expires.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Notice, Screen, ScreenHeader, Skeleton, StatusBadge, Text, type BadgeTone } from "@/components/ui";
import { DOCUMENTS, type DocumentKind } from "@/features/farmer/constants";
import { AddPhotoButtons, CameraPrimer, PendingTile, UploadedTile } from "@/features/farmer/PhotoTiles";
import { usePhotoUploads } from "@/features/farmer/usePhotoUploads";
import { pickPhotos, shouldExplainCamera } from "@/lib/upload";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "Being checked", tone: "pending" },
  rejected: { label: "Needs a new photo", tone: "error" },
  expired: { label: "Expired", tone: "error" },
};

export default function VerificationDocuments() {
  const docs = useQuery(api.farms.myDocuments);
  const replace = useMutation(api.farms.replaceDocument);
  const commit = useCallback(
    (slot: string, storageId: Id<"_storage">) => replace({ documentId: slot as Id<"farmerDocuments">, storageId }),
    [replace],
  );
  const uploads = usePhotoUploads(commit);
  const [primerFor, setPrimerFor] = useState<string | null>(null);

  const pick = async (documentId: string, source: "camera" | "library") => {
    const [uri] = await pickPhotos(source);
    if (uri) uploads.start(documentId, [uri]);
  };

  const kinds = Object.keys(DOCUMENTS) as DocumentKind[];

  return (
    <Screen header={<ScreenHeader title="Verification and documents" />}>
      <ScrollView contentContainerStyle={styles.body}>
        {uploads.error ? <Notice tone="error">{uploads.error}</Notice> : null}
        {docs === undefined ? (
          <Skeleton height={300} radius={radii.lg} />
        ) : (
          kinds.map((kind) => {
            const ofKind = docs.filter((d) => d.kind === kind);
            if (ofKind.length === 0) return null;
            return (
              <View key={kind} style={styles.card}>
                <Text variant="bodyMedium">{DOCUMENTS[kind].title}</Text>
                {ofKind.map((d) => {
                  const status = STATUS[d.status];
                  const needsNew = d.status === "rejected" || d.status === "expired";
                  const pending = uploads.pending.find((p) => p.slot === d._id);
                  return (
                    <View key={d._id} style={styles.doc}>
                      {pending ? (
                        <PendingTile item={pending} onRetry={() => uploads.retry(pending)} onDiscard={() => uploads.discard(pending.key)} />
                      ) : (
                        <UploadedTile url={d.url} label={DOCUMENTS[kind].title} flagged={needsNew} />
                      )}
                      <View style={styles.flex}>
                        <StatusBadge label={status.label} tone={status.tone} />
                        {d.note ? <Text variant="small">{d.note}</Text> : null}
                        {needsNew && !pending && (
                          <AddPhotoButtons
                            compact
                            onCamera={() =>
                              void shouldExplainCamera().then((explain) => (explain ? setPrimerFor(d._id) : void pick(d._id, "camera")))
                            }
                            onLibrary={() => void pick(d._id, "library")}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
        <Text variant="small" color={colors.inkMuted}>
          Farmkeke checks new photos within 2 working days. Selling isn't affected while we check.
        </Text>
      </ScrollView>
      <CameraPrimer
        visible={primerFor !== null}
        onClose={() => setPrimerFor(null)}
        onAllow={() => {
          const id = primerFor;
          setPrimerFor(null);
          if (id) void pick(id, "camera");
        }}
        onGallery={() => {
          const id = primerFor;
          setPrimerFor(null);
          if (id) void pick(id, "library");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime, padding: spacing.md, gap: spacing.md },
  doc: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1, gap: spacing.sm, alignItems: "flex-start" },
});
