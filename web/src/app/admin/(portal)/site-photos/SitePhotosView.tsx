"use client";

// A-87 Site photos: staff upload, replace or remove the photo beside the
// website's sign-in and sign-up forms, and the header photo of each screen in
// the app's farmer sign-up. The website preview is the real panel, scaled
// down; the app preview is the top of the phone screen. Changes show
// straight away; without a photo the website panel is plain forest green and
// the app's header is plain lime.
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AuthPanel, type PanelPhoto } from "@/components/account/AuthLayouts";
import { useStaff } from "@/components/admin/context";
import { Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";

type WebSlot = "signin" | "signup";
type AppSlot = "farmer_intro" | "farmer_phone" | "farmer_code" | "farmer_pin" | "farmer_profile" | "farmer_bank" | "farmer_review" | "farmer_submitted" | "farmer_login";
type Slot = WebSlot | AppSlot;
type Focus = PanelPhoto["focus"];
type Row = {
  slot: Slot;
  photo: { url: string | null; focus: Focus; updatedAt: number; updatedByName: string | null } | null;
};

const SLOTS: Record<Slot, { title: string; where: string; heading?: [string, string] }> = {
  signin: { title: "Sign-in page", where: "Beside the sign-in form at /signin" },
  signup: { title: "Sign-up page", where: "Beside the create-account form at /signup" },
  // The app's farmer sign-up, in the order a farmer meets the screens
  farmer_intro: { title: "Sell on Farmkeke", where: "The first screen, before applying", heading: ["Sell Straight to", "Households"] },
  farmer_phone: { title: "Phone number", where: "Step 1: the farmer enters their number", heading: ["Input your Phone", "Number"] },
  farmer_code: { title: "Verification code", where: "Step 2: the code texted to them", heading: ["Enter Verification", "Code"] },
  farmer_pin: { title: "Create PIN", where: "Step 3: the 4-digit PIN for logging in", heading: ["Create your", "PIN"] },
  farmer_profile: { title: "About you", where: "Step 4: photo, name, farm and location", heading: ["Let's get to know you!", ""] },
  farmer_bank: { title: "Bank details", where: "Step 5: where earnings are paid", heading: ["Add your Bank", "Details"] },
  farmer_review: { title: "Review", where: "Step 6: check and submit", heading: ["Review your", "Profile"] },
  farmer_submitted: { title: "Application sent", where: "After submitting", heading: ["Application", "Sent"] },
  farmer_login: { title: "Farmer log in", where: "Logging in with phone and PIN", heading: ["Log in as a", "Farmer"] },
};
const isApp = (slot: Slot): slot is AppSlot => slot.startsWith("farmer_");
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
        description="The photos on the website's sign-in and sign-up pages, and at the top of each screen of the app's farmer sign-up. Changes show straight away."
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <h2 className="h3 mb-1">Website</h2>
      <p className="sm mb-4">Beside the sign-in and sign-up forms. Without a photo, the panel is plain green.</p>
      <div className="grid grid-cols-2 gap-5 max-[1100px]:grid-cols-1">
        {rows
          .filter((r) => !isApp(r.slot))
          .map((r) => (
            <SlotCard key={r.slot} row={r} onDone={setDone} />
          ))}
      </div>
      <p className="sm mt-5">
        Use a sharp photo at least 1200 pixels wide, as a JPG or PNG under 10 MB. Tall or square photos fit best. The
        headline sits at the top and short cards at the bottom, so photos with calm areas there read well. Only use
        photos you have the right to use, such as your own or ones from Unsplash.
      </p>

      <h2 className="h3 mt-10 mb-1">App: farmer sign-up</h2>
      <p className="sm mb-4">
        The photo across the top of each screen a farmer sees while signing up. Use a different farm scene for each.
        Without a photo, the top is plain lime. Wide photos fit best; the top part of the photo shows.
      </p>
      <div className="grid grid-cols-3 gap-5 max-[1300px]:grid-cols-2 max-[800px]:grid-cols-1">
        {rows
          .filter((r) => isApp(r.slot))
          .map((r) => (
            <SlotCard key={r.slot} row={r} onDone={setDone} />
          ))}
      </div>
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
        saved && !pending ? (
          <span className="badge b-ok">Photo on</span>
        ) : !saved && !pending ? (
          <span className="badge b-grey">{isApp(row.slot) ? "Plain lime" : "Plain green"}</span>
        ) : null
      }
    >
      {isApp(row.slot) ? (
        <AppHeaderPreview photo={preview} heading={SLOTS[row.slot].heading ?? ["", ""]} />
      ) : (
        // The real panel at a third of its size
        <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
          <div className="aspect-[4/5] w-full overflow-hidden">
            <div className="size-[300%] origin-top-left scale-[calc(1/3)]">
              <AuthPanel side={row.slot} photo={preview} className="size-full" />
            </div>
          </div>
        </div>
      )}
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
        description={isApp(row.slot) ? "It shows in the app straight away." : "It shows on the website straight away."}
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
        description={isApp(row.slot) ? "The top of the screen goes back to plain lime. The photo file is deleted." : "The panel goes back to plain green. The photo file is deleted."}
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

/**
 * The top of the app screen, at phone width: the photo band with its fade,
 * Back, the curved sheet and its sticker, and the screen's title.
 */
function AppHeaderPreview({ photo, heading }: { photo: PanelPhoto | null; heading: [string, string] }) {
  const position = photo?.focus === "left" ? "left top" : photo?.focus === "right" ? "right top" : "center top";
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[22px] bg-[#F8F8F8] shadow-[inset_0_0_0_1px_var(--color-line)]">
      <div className="relative h-[150px] bg-[#A9D654]">
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview or a Convex storage URL */}
            <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: position }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-transparent" />
          </>
        ) : null}
        <span className={`relative block px-4 pt-3 text-[13px] font-semibold ${photo ? "text-white" : "text-[#1A1A1A]"}`}>‹ Back</span>
      </div>
      <div className="relative -mt-[46px] rounded-tl-[46px] bg-[#F8F8F8] px-4 pb-5 pt-7 text-center">
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-[5deg] rounded-full bg-white px-2.5 py-0.5 text-[8px] font-bold shadow">
          Sell on farmkeke
        </span>
        <p className="text-[15px] font-bold leading-tight text-[#1A1A1A]">
          {heading[0]} <span className="text-[#5F5F5F]">{heading[1]}</span>
        </p>
        <div className="mx-auto mt-3 h-8 w-full rounded-lg border border-[#A9D654] bg-white" />
        <div className="mx-auto mt-2 h-8 w-full rounded-lg bg-[#1A1A1A]" />
      </div>
    </div>
  );
}
