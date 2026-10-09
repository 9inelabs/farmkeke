import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { preparePhoto, uploadFile } from "@/lib/upload";

export type PendingUpload = {
  key: string;
  /** Which slot it belongs to (document kind, or a document id being replaced). */
  slot: string;
  uri: string;
  progress: number;
  failed: boolean;
};

/**
 * Uploads photos with progress and retry. `commit` attaches the uploaded file
 * (addDocument, replaceDocument, farm photo…) and may throw to fail the upload.
 */
export function usePhotoUploads(commit: (slot: string, storageId: Id<"_storage">) => Promise<unknown>) {
  const generateUploadUrl = useMutation(api.farmerApplications.generateUploadUrl);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, change: Partial<PendingUpload>) =>
    setPending((list) => list.map((p) => (p.key === key ? { ...p, ...change } : p)));

  const run = useCallback(
    async (item: PendingUpload) => {
      update(item.key, { failed: false, progress: 0 });
      try {
        const prepared = await preparePhoto(item.uri);
        const url = await generateUploadUrl({});
        const storageId = await uploadFile(url, prepared, (progress) => update(item.key, { progress }));
        await commit(item.slot, storageId as Id<"_storage">);
        setPending((list) => list.filter((p) => p.key !== item.key));
      } catch (e) {
        update(item.key, { failed: true });
        setError(e instanceof Error && /network/i.test(e.message) ? "Upload failed. Check your connection and try again." : "That photo didn't upload. Try again.");
      }
    },
    [commit, generateUploadUrl],
  );

  const start = useCallback(
    (slot: string, uris: string[]) => {
      setError(null);
      const items = uris.map((uri, i) => ({ key: `${Date.now()}-${i}`, slot, uri, progress: 0, failed: false }));
      setPending((list) => [...list, ...items]);
      // Upload one after another so slow connections aren't overwhelmed.
      void items.reduce((chain, item) => chain.then(() => run(item)), Promise.resolve());
    },
    [run],
  );

  const retry = useCallback((item: PendingUpload) => void run(item), [run]);
  const discard = useCallback((key: string) => setPending((list) => list.filter((p) => p.key !== key)), []);

  return { pending, error, start, retry, discard };
}
