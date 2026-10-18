"use client";

// W-58 Order chat with the farm (chat.thread / .messages / .send / .markRead).
// Photos upload through chat.generateUploadUrl. Messages are newest-first
// from the server and shown oldest-first with day separators.
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { BadgeCheck, Camera, ChevronLeft, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Thumb } from "@/components/cart/parts";
import { FocusMissing, FocusShell, FocusSkeleton } from "@/components/orders/FocusBits";
import { chatDay, hm } from "@/components/orders/format";
import { uploadError, uploadPhoto } from "@/components/orders/upload";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, type Id } from "@/convex/api";
import type { ChatMessageRow, ChatThread } from "@/convex/returns/orders";
import { stageOf, statusBadge } from "@/convex/returns/orders";
import { errorCode } from "@/lib/auth";
import { initials, naira, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

export function ChatView({ orderId }: { orderId: string }) {
  const { isLoading } = useConvexAuth();
  const thread = useQuery(api.chat.thread, isLoading ? "skip" : { orderId: orderId as Id<"orders"> }) as ChatThread | undefined;
  if (thread === undefined) return <FocusSkeleton orderId={orderId} />;
  if (thread === null) return <FocusMissing orderId={orderId} />;
  return <Chat orderId={orderId} thread={thread} />;
}

function Chat({ orderId, thread: t }: { orderId: string; thread: NonNullable<ChatThread> }) {
  const id = orderId as Id<"orders">;
  const { results, status, loadMore } = usePaginatedQuery(api.chat.messages, { orderId: id }, { initialNumItems: 40 });
  const send = useMutation(api.chat.send);
  const markRead = useMutation(api.chat.markRead);
  const getUrl = useMutation(api.chat.generateUploadUrl);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = [...(results as ChatMessageRow[])].reverse();
  const badge = statusBadge({ stage: stageOf(t.order.status), fulfilment: t.order.fulfilment });
  const lastId = messages[messages.length - 1]?._id;

  useEffect(() => {
    if (t.unread > 0) void markRead({ orderId: id }).catch(() => undefined);
  }, [t.unread, lastId, id, markRead]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  const deliver = async (text: string, photoIds: Id<"_storage">[]) => {
    setBusy(true);
    setError(null);
    try {
      await send({ orderId: id, body: text, photoIds });
      setBody("");
    } catch (e) {
      const code = errorCode(e);
      setError(
        code === "RATE_LIMITED"
          ? "You're sending a lot quickly. Wait a moment, then try again."
          : code === "CHAT_CLOSED"
            ? "Chat is closed for this order."
            : "We couldn't send that. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (body.trim()) void deliver(body.trim(), []);
  };

  const sendPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const storageId = await uploadPhoto(() => getUrl({}), file);
      await deliver(body.trim(), [storageId as Id<"_storage">]);
    } catch (e) {
      setBusy(false);
      setError(uploadError(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  let lastDay = "";
  return (
    <FocusShell
      orderId={orderId}
      width={1440}
      className="grid min-h-[calc(100dvh-76px)] grid-cols-[340px_minmax(0,1fr)] gap-6 px-[120px] py-6 max-[1200px]:px-8 m:flex m:flex-col m:gap-4 m:px-4 m:py-4"
    >
      <aside className="flex flex-col gap-4">
        <Link href={routes.order(orderId)} className="inline-flex min-h-11 w-max items-center gap-1 text-sm font-semibold">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
          Back to order
        </Link>
        <section aria-label="About this order" className="card p-5">
          <div className="cap">About this order</div>
          <div className="mt-1 font-display text-[17px] font-bold">{t.order.number}</div>
          <span className={`badge mt-2 ${badge.cls}`}>{badge.label}</span>
          <div className="mt-3.5 flex items-center gap-3 pt-3.5 shadow-[inset_0_1px_0_#EEF0EB]">
            <Thumb id={t.order._id} imageUrl={t.order.imageUrl} size={44} radius={10} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t.order.summary || "Your order"}</div>
              {t.order.itemCount > 1 ? <div className="cap">+ {t.order.itemCount - 1} more</div> : null}
            </div>
            <span className="text-sm font-semibold">{naira(t.order.totalKobo)}</span>
          </div>
          <ButtonLink href={routes.order(orderId)} variant="ghost" fullWidth className="mt-3.5 text-sm">
            Track order
          </ButtonLink>
        </section>
        <div className="flex gap-2.5 rounded-[14px] bg-pend-bg px-4 py-3.5 text-[13px] leading-[19px] text-[#5E3E08]">
          <ShieldAlert aria-hidden className="size-[18px] flex-none text-pend" strokeWidth={1.75} />
          <span>Keep payments on Farmkeke. Never send money directly to a farmer, or your order isn&apos;t protected.</span>
        </div>
      </aside>

      <section aria-label={`Chat with ${t.counterpart.name}`} className="card flex min-h-[70dvh] min-w-0 flex-col overflow-hidden d:min-h-0">
        <div className="flex items-center gap-3 px-[22px] py-4 shadow-[inset_0_-1px_0_#EEF0EB] m:px-4">
          <span
            aria-hidden
            className="flex size-11 flex-none items-center justify-center rounded-full font-display text-sm font-bold text-forest"
            style={{ background: tintFor(t.counterpart.name) }}
          >
            {initials(t.counterpart.name)}
          </span>
          <div className="flex-1">
            <h1 className="m-0 flex items-center gap-1.5 text-[15px] font-bold">
              {t.counterpart.name}
              <BadgeCheck aria-label="Verified farm" role="img" className="size-4 text-forest" strokeWidth={1.75} />
            </h1>
            {t.replyNote ? <div className="cap">{t.replyNote}</div> : null}
          </div>
        </div>

        <div role="log" aria-live="polite" aria-label="Messages" className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-[22px] m:p-4">
          {status === "CanLoadMore" ? (
            <button type="button" onClick={() => loadMore(40)} className="min-h-11 cursor-pointer self-center border-0 bg-transparent text-[13px] font-semibold text-forest">
              Show earlier messages
            </button>
          ) : null}
          {status === "LoadingFirstPage" ? (
            <>
              <Skeleton className="h-12 w-2/3 self-end" rounded={16} />
              <Skeleton className="h-16 w-2/3" rounded={16} />
            </>
          ) : messages.length === 0 ? (
            <p className="sm m-auto max-w-[360px] text-center">
              Ask {t.counterpart.name} about your order: freshness, packing or timing. They&apos;ll get a message straight away.
            </p>
          ) : (
            messages.map((m) => {
              const day = chatDay(m.at, now);
              const sep = day !== lastDay;
              lastDay = day;
              return (
                <div key={m._id} className="contents">
                  {sep ? <div className="self-center rounded-full bg-canvas px-3 py-1 text-xs text-subtle">{day}</div> : null}
                  <div
                    className={`max-w-[70%] text-sm leading-[21px] m:max-w-[85%] ${
                      m.mine
                        ? "self-end rounded-[16px_16px_4px_16px] bg-forest text-white"
                        : "self-start rounded-[16px_16px_16px_4px] bg-canvas text-ink"
                    } ${m.photos.length && !m.body ? "p-1.5" : "px-3.5 py-2.5"}`}
                  >
                    <span className="sr-only">{m.mine ? "You: " : `${t.counterpart.name}: `}</span>
                    {m.photos.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, any size */}
                        <img src={url} alt={`Photo ${i + 1}`} className="max-h-[220px] w-[220px] max-w-full rounded-xl object-cover" />
                      </a>
                    ))}
                    {m.body ? <span className={`whitespace-pre-line ${m.photos.length ? "mt-1.5 block px-2" : ""}`}>{m.body}</span> : null}
                    <div className={`mt-1 text-[11px] ${m.mine ? "text-[#A9C4A0]" : "text-[#9A9E95]"} ${m.photos.length && !m.body ? "px-2 pb-0.5" : ""}`}>
                      {hm(m.at)}
                      {m.mine && m.read ? " · Read" : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {t.canSend ? (
          <form onSubmit={submit} className="flex items-center gap-2.5 px-[18px] py-3.5 shadow-[inset_0_1px_0_#EEF0EB] m:px-3">
            <input ref={fileRef} id="chat-photo" type="file" accept="image/*" className="sr-only" onChange={(e) => sendPhoto(e.target.files)} />
            <label
              htmlFor="chat-photo"
              className="flex h-11 flex-none cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-canvas px-3.5 text-[13px] font-semibold text-forest"
            >
              Photo
              <Camera aria-hidden className="size-[18px]" strokeWidth={1.75} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Message</span>
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a message"
                maxLength={2000}
                className="h-[46px] w-full rounded-xl border-0 px-3.5 text-[15px] shadow-[inset_0_0_0_1px_#DCE0D6]"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              aria-busy={busy || undefined}
              className="flex h-[46px] flex-none cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-lime px-[18px] text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
              <Send aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          </form>
        ) : (
          <p className="sm m-0 px-[22px] py-4 shadow-[inset_0_1px_0_#EEF0EB]">Chat is closed for this order.</p>
        )}
        {error ? (
          <p role="alert" className="field-error m-0 px-[22px] pb-3">
            {error}
          </p>
        ) : null}
      </section>
    </FocusShell>
  );
}
