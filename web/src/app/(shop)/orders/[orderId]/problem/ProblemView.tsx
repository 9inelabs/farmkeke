"use client";

// W-53 Report a problem (disputes.open). Only for a delivered or collected
// order, from the account or device that placed it. Photos upload through
// disputes.generateUploadUrl. Each choice is its own reason, and the units
// affected per item go as itemQuantities, so the amount at stake is the value
// of those units (never the delivery fee).
import { useMutation } from "convex/react";
import { Camera, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { capitalise, Thumb } from "@/components/cart/parts";
import { dayLabel } from "@/components/orders/format";
import { uploadError, uploadPhoto } from "@/components/orders/upload";
import { useOrder } from "@/components/orders/useOrder";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, type Id } from "@/convex/api";
import type { DisputeReason, OrderDetail } from "@/convex/returns/orders";
import { errorCode } from "@/lib/auth";
import { naira } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { OrderSkeleton } from "../OrderView";

const REASONS: Array<{ id: string; label: string; reason: DisputeReason }> = [
  { id: "missing", label: "Items missing", reason: "missing" },
  { id: "damaged", label: "Damaged or spoiled", reason: "damaged" },
  { id: "wrong", label: "Wrong item sent", reason: "wrong_item" },
  { id: "short", label: "Less than I ordered", reason: "short" },
  { id: "other", label: "Something else", reason: "other" },
];
const MAX_PHOTOS = 5;

export function ProblemView({ orderId }: { orderId: string }) {
  const access = useOrder(orderId);
  if (access.state === "loading") return <OrderSkeleton />;
  if (access.state === "missing" || access.order.viewOnly) return <CantReport orderId={orderId} why="other-device" />;
  const o = access.order;
  if (o.disputeId) return <CantReport orderId={orderId} why="reported" />;
  if (!o.canReport) return <CantReport orderId={orderId} why={o.status === "completed" ? "completed" : "not-yet"} />;
  return <Form order={o} />;
}

function CantReport({ orderId, why }: { orderId: string; why: "other-device" | "reported" | "completed" | "not-yet" }) {
  const text = {
    "other-device": "Only the account or device that placed this order can report a problem with it. Contact support and we'll help.",
    reported: "You've already reported a problem with this order. Follow the case to see where it's up to.",
    completed: "You've confirmed this order, so the payment has gone to the farm. Contact support and we'll help.",
    "not-yet": "You can report a problem once your order has been delivered or collected.",
  }[why];
  return (
    <div className="mx-auto max-w-[560px] px-5 pt-16 pb-24">
      <section className="card flex flex-col items-center gap-3 px-8 py-12 text-center m:px-5">
        <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold">Report a problem</h1>
        <p className="p">{text}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          {why === "reported" ? (
            <ButtonLink href={routes.dispute(orderId)} variant="lime">
              Follow this case
            </ButtonLink>
          ) : why === "not-yet" ? null : (
            <ButtonLink href={routes.contact} variant="lime">
              Contact support
            </ButtonLink>
          )}
          <ButtonLink href={routes.order(orderId)} variant="ghost">
            Back to order
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

type Photo = { id: string; url: string };
type Errors = Partial<Record<"reason" | "items" | "note" | "photos" | "form", string>>;

function Form({ order: o }: { order: OrderDetail }) {
  const router = useRouter();
  const open = useMutation(api.disputes.open);
  const getUrl = useMutation(api.disputes.generateUploadUrl);
  const [choice, setChoice] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({}); // item index → units affected
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const reason = REASONS.find((r) => r.id === choice);

  const onKey = (e: KeyboardEvent) => {
    const i = REASONS.findIndex((r) => r.id === choice);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = REASONS[(Math.max(i, 0) + step + REASONS.length) % REASONS.length]!;
    setChoice(next.id);
    document.getElementById(`reason-${next.id}`)?.focus();
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setErrors((x) => ({ ...x, photos: undefined }));
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        const id = await uploadPhoto(() => getUrl({}), file);
        setPhotos((p) => [...p, { id, url: URL.createObjectURL(file) }]);
      }
    } catch (e) {
      setErrors((x) => ({ ...x, photos: uploadError(e) }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const indexes = Object.keys(picked).map(Number);
    const n: Errors = {};
    if (!reason) n.reason = "Choose what went wrong.";
    if (indexes.length === 0) n.items = "Tick the items affected.";
    if (!note.trim()) n.note = "Tell us what happened, in a sentence or two.";
    setErrors(n);
    if (n.reason) return document.getElementById(`reason-${REASONS[0]!.id}`)?.focus();
    if (n.items) return document.getElementById(`item-${o.items[0]?.index}`)?.focus();
    if (n.note) return noteRef.current?.focus();
    setBusy(true);
    try {
      await open({
        orderId: o._id as Id<"orders">,
        reason: reason!.reason,
        itemIndexes: indexes,
        itemQuantities: indexes.map((i) => picked[i]!),
        note: note.trim(),
        photoIds: photos.map((p) => p.id as Id<"_storage">),
      });
      router.push(routes.problemReported(o._id));
    } catch (err) {
      setBusy(false);
      const code = errorCode(err);
      setErrors({
        form:
          code === "ALREADY_REPORTED"
            ? "You've already reported a problem with this order."
            : code === "ALREADY_CONFIRMED"
              ? "This order is already confirmed, so the payment has gone to the farm. Contact support and we'll help."
              : code === "NOTE_TOO_LONG"
                ? "That's a bit long. Keep it under 2,000 characters."
                : "We couldn't send your report. Check your connection and try again.",
      });
    }
  };

  return (
    <Reveal className="wrap pt-7 pb-24">
      <Link href={routes.order(o._id)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
        Back to order
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="h1">Report a problem</h1>
        <p className="p mt-1">
          {o.number} · {o.farmName}
          {o.deliveredAt ? ` · ${o.fulfilment === "pickup" ? "Collected" : "Delivered"} ${dayLabel(o.deliveredAt)}` : ""}
        </p>
      </div>
      <form noValidate onSubmit={submit} className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-6 m:grid-cols-1">
        <div className="card">
          <Question n={1} title="What went wrong?" id="q-reason">
            <div role="radiogroup" aria-labelledby="q-reason" onKeyDown={onKey} className="mt-3.5 grid grid-cols-2 gap-2.5 m:grid-cols-1">
              {REASONS.map((r, i) => {
                const on = choice === r.id;
                return (
                  <button
                    key={r.id}
                    id={`reason-${r.id}`}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on || (!choice && i === 0) ? 0 : -1}
                    onClick={() => {
                      setChoice(r.id);
                      setErrors((x) => ({ ...x, reason: undefined }));
                    }}
                    className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[14px] border-0 p-3.5 text-left text-sm font-semibold text-ink ${
                      on ? "bg-[#F7FAF1] shadow-[inset_0_0_0_2px_var(--color-forest)]" : "bg-surface shadow-[inset_0_0_0_1px_#DCE0D6]"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {errors.reason ? (
              <span role="alert" className="field-error">
                {errors.reason}
              </span>
            ) : null}
          </Question>

          <Question n={2} title="Which items are affected?" id="q-items">
            <ul className="m-0 mt-2.5 list-none p-0" aria-labelledby="q-items">
              {o.items.map((it) => {
                const on = picked[it.index] !== undefined;
                return (
                  <li key={it.index} className="flex flex-wrap items-center gap-3 py-3 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        id={`item-${it.index}`}
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          setPicked((p) => {
                            const next = { ...p };
                            if (e.target.checked) next[it.index] = it.quantity;
                            else delete next[it.index];
                            return next;
                          });
                          setErrors((x) => ({ ...x, items: undefined }));
                        }}
                        className="m-0 size-5 flex-none accent-forest"
                      />
                      <Thumb id={it.listingId} imageUrl={it.imageUrl} size={44} radius={10} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">{it.name}</span>
                        <span className="block text-xs text-subtle">
                          {capitalise(it.unitSingular)} × {it.quantity} · {naira(it.lineTotalKobo)}
                        </span>
                      </span>
                    </label>
                    {on && it.quantity > 1 ? (
                      <select
                        aria-label={`How many ${it.unitPlural} of ${it.name}`}
                        value={picked[it.index]}
                        onChange={(e) => setPicked((p) => ({ ...p, [it.index]: Number(e.target.value) }))}
                        className="h-11 cursor-pointer rounded-[10px] border-0 bg-surface px-2.5 text-[13px] shadow-[inset_0_0_0_1px_#DCE0D6]"
                      >
                        {Array.from({ length: it.quantity }, (_, k) => k + 1).map((k) => (
                          <option key={k} value={k}>
                            {k} of {it.quantity} {it.unitPlural}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {errors.items ? (
              <span role="alert" className="field-error">
                {errors.items}
              </span>
            ) : null}
          </Question>

          <Question n={3} title="Add photos" id="q-photos">
            <p className="cap mt-1.5">Clear photos help us resolve this faster. Up to 5.</p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {photos.map((p, i) => (
                <div key={p.id} className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an upload */}
                  <img src={p.url} alt={`Photo ${i + 1}`} className="size-24 rounded-[14px] object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
                    className="min-h-11 cursor-pointer border-0 bg-transparent text-xs font-semibold text-err"
                  >
                    Remove<span className="sr-only"> photo {i + 1}</span>
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    id="photo-input"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                  <label
                    htmlFor="photo-input"
                    aria-busy={uploading || undefined}
                    className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] bg-soft text-xs font-semibold text-forest shadow-[inset_0_0_0_1.5px_#C9CEC2]"
                  >
                    <Camera aria-hidden className="size-[22px]" strokeWidth={1.75} />
                    {uploading ? "Uploading…" : "Add photo"}
                  </label>
                </>
              ) : null}
            </div>
            {errors.photos ? (
              <span role="alert" className="field-error">
                {errors.photos}
              </span>
            ) : null}
          </Question>

          <Question n={4} title="Tell us what happened" id="q-note">
            <textarea
              ref={noteRef}
              rows={3}
              aria-labelledby="q-note"
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? "note-error" : undefined}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors((x) => ({ ...x, note: undefined }));
              }}
              placeholder="For example: one basket of tomatoes was soft and some had burst."
              className="fin mt-3.5 min-h-24 resize-none"
            />
            {errors.note ? (
              <span id="note-error" role="alert" className="field-error">
                {errors.note}
              </span>
            ) : null}
          </Question>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="card flex items-start gap-3 p-[22px]">
            <span aria-hidden className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-tint text-forest">
              <ShieldCheck className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <div className="text-[15px] font-bold">Your {naira(o.totalKobo)} stays held</div>
              <p className="mt-1 text-[13px] leading-[19px] text-muted">Nothing is paid to the farm until this is resolved.</p>
            </div>
          </section>
          <section aria-labelledby="next-title" className="card p-[22px]">
            <h2 id="next-title" className="h3 text-base">
              What happens next
            </h2>
            <ol className="m-0 mt-3.5 flex list-none flex-col gap-3.5 p-0 text-sm leading-5">
              {[
                `${o.farmName} sees your report and can reply within 12 hours`,
                "Our team reviews the photos and both sides",
                "We decide: a full or part refund to you, or release to the farm",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="flex size-6 flex-none items-center justify-center rounded-full bg-lime-soft text-xs font-bold text-forest">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            {errors.form ? (
              <p role="alert" className="field-error mt-4">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" variant="lime" fullWidth loading={busy} disabled={uploading} className="mt-5 min-h-[52px] rounded-[14px]">
              Submit report
            </Button>
            <p className="cap mt-2.5 text-center">We&apos;ll update you by SMS and email</p>
          </section>
        </aside>
      </form>
    </Reveal>
  );
}

function Question({ n, title, id, children }: { n: number; title: string; id: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-6 [&+&]:shadow-[inset_0_1px_0_#EEF0EB] m:px-4">
      <legend className="contents">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="flex size-[26px] flex-none items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
            {n}
          </span>
          <h2 id={id} className="h3">
            {title}
          </h2>
        </span>
      </legend>
      {children}
    </fieldset>
  );
}
