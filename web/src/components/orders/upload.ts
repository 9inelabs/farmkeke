"use client";

// Photo uploads for problem reports and chat (W-53, W-54, W-58): ask
// chat.generateUploadUrl for a one-time URL, POST the file, keep the storage id.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function uploadPhoto(getUrl: () => Promise<unknown>, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("NOT_IMAGE");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("TOO_LARGE");
  const raw = await getUrl();
  const url = typeof raw === "string" ? raw : (raw as { url?: string; uploadUrl?: string } | null)?.url ?? (raw as { uploadUrl?: string } | null)?.uploadUrl;
  if (!url) throw new Error("NO_URL");
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error("UPLOAD_FAILED");
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}

export function uploadError(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  return m === "NOT_IMAGE"
    ? "That file isn't a photo. Choose a JPG or PNG."
    : m === "TOO_LARGE"
      ? "That photo is over 10 MB. Choose a smaller one."
      : "We couldn't upload that photo. Check your connection and try again.";
}
