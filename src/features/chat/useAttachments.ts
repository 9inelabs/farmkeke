// Photos attached to a message or report: picked, shrunk, uploaded straight
// away (with progress), and sent as storage ids once all are up.
import type { Id } from "@convex/_generated/dataModel";
import { useCallback, useState } from "react";
import { pickPhotos, preparePhoto, uploadFile } from "@/lib/upload";

export type Attachment = { key: string; uri: string; storageId: Id<"_storage"> | null; progress: number; failed: boolean };

export function useAttachments(generateUploadUrl: () => Promise<string>, max: number) {
  const [items, setItems] = useState<Attachment[]>([]);
  const update = (key: string, change: Partial<Attachment>) => setItems((list) => list.map((a) => (a.key === key ? { ...a, ...change } : a)));

  const upload = useCallback(
    async (a: Attachment) => {
      update(a.key, { failed: false, progress: 0 });
      try {
        const prepared = await preparePhoto(a.uri);
        const url = await generateUploadUrl();
        const storageId = await uploadFile(url, prepared, (progress) => update(a.key, { progress }));
        update(a.key, { storageId: storageId as Id<"_storage">, progress: 1 });
      } catch {
        update(a.key, { failed: true });
      }
    },
    [generateUploadUrl],
  );

  const add = useCallback(async () => {
    const room = max - items.length;
    if (room <= 0) return;
    const uris = (await pickPhotos("library", room > 1)).slice(0, room);
    const added = uris.map((uri, i) => ({ key: `${Date.now()}-${i}`, uri, storageId: null, progress: 0, failed: false }));
    setItems((list) => [...list, ...added]);
    for (const a of added) await upload(a);
  }, [items.length, max, upload]);

  const remove = useCallback((key: string) => setItems((list) => list.filter((a) => a.key !== key)), []);
  const retry = useCallback((a: Attachment) => void upload(a), [upload]);
  const clear = useCallback(() => setItems([]), []);

  const uploading = items.some((a) => a.storageId === null && !a.failed);
  const failed = items.some((a) => a.failed);
  const ids = items.flatMap((a) => (a.storageId ? [a.storageId] : []));
  return { items, add, remove, retry, clear, uploading, failed, ids, full: items.length >= max };
}
