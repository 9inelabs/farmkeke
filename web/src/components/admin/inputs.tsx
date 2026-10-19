"use client";

// Form inputs the operations screens share: naira amounts (stored in kobo),
// opening hours, and photo uploads to Convex storage.
import { useMutation } from "convex/react";
import { Plus, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Hours } from "@/convex/returns/adminFarms";
import { DAYS } from "./labels";
import { Photo } from "./ui";

/** Naira text ("1,500") ↔ kobo (150000). Empty text is null. */
export const koboFrom = (text: string): number | null => {
  const clean = text.replace(/[,\s₦]/g, "");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
export const nairaText = (kobo: number) => (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });

export function NairaField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="lbl">
        {label}
      </label>
      <div className="flex gap-2">
        <span className="fin flex w-14 flex-none items-center justify-center bg-soft font-semibold" aria-hidden>
          ₦
        </span>
        <input id={id} className="fin" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      </div>
      {hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Opening hours: one row per day and time range. */
export function HoursEditor({ value, onChange, label = "Opening hours" }: { value: Hours[]; onChange: (h: Hours[]) => void; label?: string }) {
  const set = (i: number, patch: Partial<Hours>) => onChange(value.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="lbl">{label}</legend>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {value.map((h, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label={`Day ${i + 1}`} className="fin w-[150px] cursor-pointer" value={h.day} onChange={(e) => set(i, { day: Number(e.target.value) })}>
              {DAYS.map((d, n) => (
                <option key={d} value={n}>
                  {d}
                </option>
              ))}
            </select>
            <input aria-label={`Opens, row ${i + 1}`} type="time" className="fin w-[130px]" value={h.opens} onChange={(e) => set(i, { opens: e.target.value })} />
            <span className="text-sm text-muted">to</span>
            <input aria-label={`Closes, row ${i + 1}`} type="time" className="fin w-[130px]" value={h.closes} onChange={(e) => set(i, { closes: e.target.value })} />
            <Button size="sm" variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus aria-hidden className="size-4" />}
          onClick={() => onChange([...value, { day: value.length ? (value[value.length - 1].day + 1) % 7 : 1, opens: "08:00", closes: "18:00" }])}
        >
          Add a day
        </Button>
        {value.length === 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange([1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "18:00" })))}
          >
            Monday to Saturday, 8am to 6pm
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}

/** Uploads one image to Convex storage and returns its id. */
export function PhotoUpload({
  label,
  currentUrl,
  onUploaded,
}: {
  label: string;
  currentUrl: string | null;
  onUploaded: (storageId: Id<"_storage">, previewUrl: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const generate = useMutation(admin.uploads.generateUploadUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo (JPG or PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That photo is over 10 MB. Choose a smaller one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = (await generate({})) as string;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const local = URL.createObjectURL(file);
      setPreview(local);
      onUploaded(storageId, local);
    } catch {
      setError("The upload didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const shown = preview ?? currentUrl;
  return (
    <div>
      <span className="lbl" id={`${id}-label`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <Photo url={shown} alt={label} className="size-20 flex-none rounded-xl" />
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="ghost" icon={<Upload aria-hidden className="size-4" />} loading={busy} onClick={() => input.current?.click()} aria-describedby={`${id}-label`}>
            {shown ? "Replace photo" : "Upload photo"}
          </Button>
          {error ? (
            <span className="field-error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
