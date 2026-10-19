"use client";

// Message threads (problem reports, support, order chats) and the reply box.
import { useMutation } from "convex/react";
import { ImagePlus, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import { dateTime } from "@/lib/format";
import { adminError } from "./errors";
import { Notice, Photo } from "./ui";

export type ThreadMessage = {
  _id: string;
  /** Who sent it, as shown above the bubble */
  who: string;
  /** Staff messages sit on the right */
  staff: boolean;
  body: string;
  photos: string[];
  at: number;
  /** Extra tag, e.g. "To the farm" */
  tag?: string;
};

export function Thread({ messages, empty }: { messages: ThreadMessage[]; empty: ReactNode }) {
  if (messages.length === 0) return <p className="sm rounded-2xl bg-soft p-4">{empty}</p>;
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {messages.map((m) => (
        <li key={m._id} className={`flex flex-col ${m.staff ? "items-end" : "items-start"}`}>
          <span className="mb-1 text-xs text-subtle">
            <strong className="font-semibold text-ink-3">{m.who}</strong> · {dateTime(m.at)}
            {m.tag ? ` · ${m.tag}` : ""}
          </span>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-[22px] ${m.staff ? "bg-tint text-ink" : "bg-soft text-ink shadow-[inset_0_0_0_1px_var(--color-line)]"}`}>
            {m.body ? <p className="m-0 whitespace-pre-line">{m.body}</p> : null}
            {m.photos.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.photos.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" aria-label="Open photo full size (new tab)">
                    <Photo url={u} alt="Photo in the message" className="size-24 rounded-xl" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Reply box with up to `maxPhotos` photos. */
export function Composer({
  label,
  hint,
  maxPhotos = 4,
  onSend,
}: {
  label: string;
  hint?: string;
  maxPhotos?: number;
  onSend: (body: string, photoIds: Id<"_storage">[]) => Promise<unknown>;
}) {
  const id = useId();
  const file = useRef<HTMLInputElement>(null);
  const generate = useMutation(admin.uploads.generateUploadUrl);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<{ id: Id<"_storage">; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async (f: File) => {
    if (!f.type.startsWith("image/")) return setError("Choose a photo (JPG or PNG).");
    setBusy(true);
    setError(null);
    try {
      const url = (await generate({})) as string;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": f.type }, body: f });
      if (!res.ok) throw new Error("upload");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      setPhotos((p) => [...p, { id: storageId, url: URL.createObjectURL(f) }]);
    } catch {
      setError("The photo didn't upload. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim() && photos.length === 0) return;
        setBusy(true);
        setError(null);
        try {
          await onSend(body.trim(), photos.map((p) => p.id));
          setBody("");
          setPhotos([]);
        } catch (err) {
          setError(adminError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={id} className="lbl m-0">
        {label}
      </label>
      <textarea id={id} className="fin h-auto py-3" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
      {hint ? <span className="hint -mt-2">{hint}</span> : null}
      {photos.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              <Photo url={p.url} alt="Photo to send" className="size-20 rounded-xl" />
              <button
                type="button"
                onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
                className="absolute -top-2 -right-2 flex min-h-8 cursor-pointer items-center gap-1 rounded-full bg-ink px-2 text-xs font-semibold text-white"
              >
                <X aria-hidden className="size-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <Notice tone="err">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="dark" loading={busy}>
          Send
        </Button>
        {photos.length < maxPhotos ? (
          <Button variant="ghost" icon={<ImagePlus aria-hidden className="size-[18px]" />} onClick={() => file.current?.click()} disabled={busy}>
            Add photo
          </Button>
        ) : null}
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void add(f);
            e.target.value = "";
          }}
        />
      </div>
    </form>
  );
}
