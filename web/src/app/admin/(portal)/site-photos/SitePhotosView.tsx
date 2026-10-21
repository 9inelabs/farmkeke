"use client";

// A-87 Site photos: staff upload, replace or remove the photo beside the
// website's sign-in and sign-up forms. The preview is the real panel, scaled
// down, so what you see here is what shoppers see. Changes show on the site
// straight away; without a photo the panel is plain forest green.
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AuthPanel, type PanelPhoto } from "@/components/account/AuthLayouts";
import { useStaff } from "@/components/admin/context";
import { Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";

type Slot = "signin" | "signup";
type Focus = PanelPhoto["focus"];
type Row = {
  slot: Slot;
  photo: { url: string | null; focus: Focus; updatedAt: number; updatedByName: string | null } | null;
};

const SLOTS: Record<Slot, { title: string; where: string }> = {
  signin: { title: "Sign-in page", where: "Beside the sign-in form at /signin" },
  signup: { title: "Sign-up page", where: "Beside the create-account form at /signup" },
};
const FOCUS: Array<[Focus, string]> = [
  ["left", "Left"],
  ["center", "Middle"],
  ["right", "Right"],
];
const MAX_BYTES = 10 * 1024 * 1024;

const when = (ms: number) =>
  new Date(ms).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function SitePhotosView() {
  const rows = useQuery(admin.sitePhotos.list, {}) as Row[] | undefined;
  const [done, setDone] = useState<string | null>(null);
  if (rows === undefined) return <TableSkeleton />;
  return (
    <>
      <PageHeader
        title="Site photos"
        description="The photos beside the sign-in and sign-up forms on the website. Changes show on the site straight away. Without a photo, the panel is plain green."
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-5 max-[1100px]:grid-cols-1">
        {rows.map((r) => (
          <SlotCard key={r.slot} row={r} onDone={setDone} />
        ))}
      </div>
      <p className="sm mt-5">
        Use a sharp photo at least 1200 pixels wide, as a JPG or PNG under 10 MB. Tall or square photos fit best. The
        headline sits at the top and short cards at the bottom, so photos with calm areas there read well. Only use
        photos you have the right to use, such as your own or ones from Unsplash.
      </p>
    </>
  );
}

function SlotCard({ row, onDone }: { row: Row; onDone: (msg: string) => void }) {
  const me = useStaff();
  const canEdit = me.can("content.manage");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const generate = useMutation(admin.uploads.generateUploadUrl);
  const save = useMutation(admin.sitePhotos.set);
  const remove = useMutation(admin.sitePhotos.remove);
  const { title, where } = SLOTS[row.slot];
  const saved = row.photo;

  // An uploaded photo waiting to be saved, and the focus being chosen
  const [pending, setPending] = useState<{ storageId: Id<"_storage">; preview: string } | null>(null);
  const [focusChoice, setFocus] = useState<Focus | null>(null);
  const focus = focusChoice ?? saved?.focus ?? "center";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"save" | "remove" | null>(null);

  useEffect(() => () => (pending ? URL.revokeObjectURL(pending.preview) : undefined), [pending]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG or PNG).");
    if (file.size > MAX_BYTES) return setError("That photo is over 10 MB. Choose a smaller one.");
    setBusy(true);
    setError(null);
    try {
      const url = (await generate({})) as string;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      setPending({ storageId, preview: URL.createObjectURL(file) });
    } catch {
      setError("The upload didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const shownUrl = pending?.preview ?? saved?.url ?? null;
  const preview: PanelPhoto | null = shownUrl ? { url: shownUrl, focus } : null;
  const changed = pending !== null || (saved !== null && focus !== saved.focus);

  return (
    <Panel
      title={title}
      description={where}
      actions={
        saved && !pending ? <span className="badge b-ok">Photo on</span> : !saved && !pending ? <span className="badge b-grey">Plain green</span> : null
      }
    >
      {/* The real panel at a third of its size */}
      <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        <div className="aspect-[4/5] w-full overflow-hidden">
          <div className="size-[300%] origin-top-left scale-[calc(1/3)]">
            <AuthPanel side={row.slot} photo={preview} className="size-full" />
          </div>
        </div>
      </div>
      {pending ? <p className="sm mt-3 text-center">Preview. Save to put it on the site.</p> : null}
      {saved && !pending ? (
        <p className="sm mt-3 text-center">
          Changed {when(saved.updatedAt)}
          {saved.updatedByName ? ` by ${saved.updatedByName}` : ""}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-4">
          {preview ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="lbl">Keep in view when cropped</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="Keep in view when cropped">
                {FOCUS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={focus === value}
                    className={`chip ${focus === value ? "on" : ""}`}
                    onClick={() => setFocus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant={changed ? "ghost" : "lime"}
              icon={<Upload aria-hidden className="size-4" />}
              loading={busy}
              onClick={() => input.current?.click()}
              aria-describedby={`${id}-err`}
            >
              {shownUrl ? "Choose another photo" : "Upload a photo"}
            </Button>
            {changed ? (
              <Button variant="lime" icon={<ImagePlus aria-hidden className="size-4" />} onClick={() => setDialog("save")}>
                Save
              </Button>
            ) : null}
            {pending ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setPending(null);
                  setFocus(null);
                }}
              >
                Cancel
              </Button>
            ) : null}
            {saved && !pending ? (
              <Button variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setDialog("remove")}>
                Remove photo
              </Button>
            ) : null}
          </div>
          <span id={`${id}-err`} role={error ? "alert" : undefined} className={error ? "field-error -mt-2" : "sr-only"}>
            {error ?? ""}
          </span>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
      ) : null}

      <ReasonDialog
        open={dialog === "save"}
        onClose={() => setDialog(null)}
        title={`Save the ${title.toLowerCase()} photo?`}
        description="It shows on the website straight away."
        label="Note"
        optional
        confirmLabel="Save photo"
        variant="lime"
        onConfirm={async (reason) => {
          await save({
            slot: row.slot,
            ...(pending ? { storageId: pending.storageId } : {}),
            focus,
            reason: reason || (pending ? "New photo" : "Changed what stays in view"),
          });
          setPending(null);
          setFocus(null);
          onDone(`${title} photo saved.`);
        }}
      />
      <ReasonDialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={`Remove the ${title.toLowerCase()} photo?`}
        description="The panel goes back to plain green. The photo file is deleted."
        confirmLabel="Remove photo"
        variant="danger"
        onConfirm={async (reason) => {
          await remove({ slot: row.slot, reason });
          setFocus(null);
          onDone(`${title} photo removed.`);
        }}
      />
    </Panel>
  );
}
