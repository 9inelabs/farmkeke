"use client";

// W-57 Rate and review (reviews.forOrder / reviews.submit): stars, tags and an
// optional comment. Per-item stars are shown as in the design but aren't
// saved yet (reviews.submit has no field for them; see BUILD-STATUS).
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { Thumb } from "@/components/cart/parts";
import { FocusShell, FocusSkeleton } from "@/components/orders/FocusBits";
import { dayLabel, shortName } from "@/components/orders/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, type Id } from "@/convex/api";
import type { ReviewForOrder } from "@/convex/returns/orders";
import { errorCode, useViewer } from "@/lib/auth";
import { initials, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

const WORDS = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];
const TAGS = ["Fresh", "Well packed", "On time", "Good value", "Friendly farmer", "As described"];

export function ReviewView({ orderId }: { orderId: string }) {
  const { isLoading } = useConvexAuth();
  const data = useQuery(api.reviews.forOrder, isLoading ? "skip" : { orderId: orderId as Id<"orders"> }) as ReviewForOrder | undefined;
  if (data === undefined) return <FocusSkeleton orderId={orderId} width={640} />;
  return (
    <FocusShell orderId={orderId} width={640} className="px-5 pt-8 pb-16">
      <BackLink orderId={orderId} />
      {data === null ? (
        <Note title="We couldn't open this order" body="Only the account or device that placed an order can review it." />
      ) : data.review ? (
        <Note
          title={`You rated ${data.farmName} ${data.review.rating} out of 5`}
          body={data.review.comment ? `"${data.review.comment}"` : "Thanks for your review. It helps other shoppers."}
        />
      ) : !data.canReview ? (
        <Note title="You can review this order once it's complete" body="Confirm receipt first, then tell other shoppers how it went." />
      ) : (
        <Form data={data} />
      )}
    </FocusShell>
  );
}

function BackLink({ orderId }: { orderId: string }) {
  const { status } = useViewer();
  return (
    <Link href={status === "signed-in" ? routes.myOrders : routes.order(orderId)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
      <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
      {status === "signed-in" ? "My orders" : "Back to order"}
    </Link>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <section className="card mt-3.5 p-8 text-center m:p-5">
      <h1 className="m-0 font-display text-2xl leading-8 font-extrabold">{title}</h1>
      <p className="p mt-2">{body}</p>
      <ButtonLink href={routes.shop} variant="lime" className="mt-5">
        Shop again
      </ButtonLink>
    </section>
  );
}

function Stars({
  value,
  onChange,
  label,
  size,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  size: "lg" | "sm";
}) {
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, (value || 0) + step));
    onChange(next);
    (e.currentTarget.querySelectorAll("button")[next - 1] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className={`flex ${size === "lg" ? "gap-2" : "gap-0.5"}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            tabIndex={n === (value || 1) ? 0 : -1}
            onClick={() => onChange(n)}
            className={`flex cursor-pointer items-center justify-center border-0 p-0 ${
              size === "lg" ? "size-[52px] rounded-[14px] bg-soft" : "size-11 rounded-lg bg-transparent"
            }`}
          >
            <Star
              aria-hidden
              className={size === "lg" ? "size-7" : "size-[18px]"}
              strokeWidth={1.75}
              fill={on ? "#E6A23C" : "none"}
              stroke={on ? "#E6A23C" : "#C9CEC2"}
            />
          </button>
        );
      })}
    </div>
  );
}

function Form({ data }: { data: NonNullable<ReviewForOrder> }) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, viewer } = useViewer();
  const submit = useMutation(api.reviews.submit);
  const initial = Number(params.get("rating"));
  const [rating, setRating] = useState(initial >= 1 && initial <= 5 ? Math.round(initial) : 0);
  const [tags, setTags] = useState<string[]>([]);
  const [itemStars, setItemStars] = useState<number[]>(() => data.items.map(() => 0));
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = status === "signed-in" ? routes.myOrders : routes.order(data.orderId);
  const name = viewer?.name ? shortName(viewer.name) : null;

  const post = async () => {
    if (!rating) return setError("Choose from 1 to 5 stars first.");
    setBusy(true);
    setError(null);
    try {
      await submit({ orderId: data.orderId as Id<"orders">, rating, tags, comment: comment.trim() || undefined });
      router.push(done);
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      setError(
        code === "ALREADY_REVIEWED"
          ? "You've already reviewed this order."
          : code === "COMMENT_TOO_LONG"
            ? "Keep your comment under 1,000 characters."
            : "We couldn't post your review. Check your connection and try again.",
      );
    }
  };

  return (
    <section aria-labelledby="review-title" className="card mt-3.5 p-8 m:p-5">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-[52px] flex-none items-center justify-center rounded-full font-display text-base font-bold text-forest"
          style={{ background: tintFor(data.farmId) }}
        >
          {initials(data.farmName)}
        </span>
        <div>
          <div className="text-[13px] text-muted-2">
            Order {data.number}
            {data.deliveredAt ? ` · Delivered ${dayLabel(data.deliveredAt)}` : ""}
          </div>
          <h1 id="review-title" className="m-0 mt-0.5 font-display text-2xl leading-8 font-extrabold">
            How was {data.farmName}?
          </h1>
        </div>
      </div>
      <div className="mt-6">
        <Stars value={rating} onChange={(n) => (setRating(n), setError(null))} label="Rating" size="lg" />
        <div className="mt-2.5 min-h-5 text-[15px] font-semibold text-forest" aria-live="polite">
          {WORDS[rating]}
        </div>
      </div>
      <fieldset className="m-0 mt-6 border-0 p-0">
        <legend className="text-sm font-semibold">What stood out?</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 px-4 text-sm font-medium ${
                  on ? "bg-forest text-white" : "bg-surface text-ink shadow-[inset_0_0_0_1px_#DCE0D6]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-6">
        <div className="text-sm font-semibold">
          Rate each item <span className="font-medium text-subtle">(optional)</span>
        </div>
        <ul className="m-0 mt-1.5 list-none p-0">
          {data.items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex flex-wrap items-center gap-3 py-3 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
              <Thumb id={`${data.orderId}-${i}`} imageUrl={it.imageUrl} size={44} radius={10} />
              <span className="min-w-0 flex-1 text-sm font-semibold">{it.name}</span>
              <Stars
                value={itemStars[i] ?? 0}
                onChange={(n) => setItemStars((s) => s.map((v, j) => (j === i ? n : v)))}
                label={`Rating for ${it.name}`}
                size="sm"
              />
            </li>
          ))}
        </ul>
      </div>
      <label className="mt-[22px] block">
        <span className="mb-2 block text-sm font-semibold">
          Tell other shoppers more <span className="font-medium text-subtle">(optional)</span>
        </span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? What could be better?"
          className="fin min-h-24 resize-none"
        />
      </label>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <div className="mt-[22px] grid grid-cols-[1fr_2fr] gap-2.5">
        <ButtonLink href={done} variant="ghost" fullWidth className="min-h-[52px] rounded-[14px]">
          Not now
        </ButtonLink>
        <Button variant="lime" fullWidth loading={busy} onClick={post} className="min-h-[52px] rounded-[14px]">
          Post review
        </Button>
      </div>
      <p className="mt-3.5 text-center text-xs leading-[17px] text-subtle">
        Your review shows with your first name and initial, like &quot;{name ?? "Adaeze N."}&quot;
      </p>
    </section>
  );
}
