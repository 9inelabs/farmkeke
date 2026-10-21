"use client";

// W-54 Dispute detail: progress (reported → farm replied → under review →
// decision), the case thread with the farm and Farmkeke support, a reply box,
// and the case summary (disputes.forOrder, .sendMessage, .markRead).
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { dayLabel, weekdayTime } from "@/components/orders/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, type Id } from "@/convex/api";
import type { DisputeDetail } from "@/convex/returns/orders";
import { errorCode, useViewer } from "@/lib/auth";
import { initials, naira, plural } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { OrderSkeleton } from "../OrderView";

export function DisputeView({ orderId }: { orderId: string }) {
  const { isLoading } = useConvexAuth();
  const d = useQuery(api.disputes.forOrder, isLoading ? "skip" : { orderId: orderId as Id<"orders"> }) as
    | DisputeDetail
    | null
    | undefined;
  if (d === undefined) return <OrderSkeleton />;
  if (d === null)
    return (
      <div className="mx-auto max-w-[560px] px-5 pt-16 pb-24">
        <section className="card flex flex-col items-center gap-3 px-8 py-12 text-center m:px-5">
          <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold m:text-[22px] m:leading-7">No problem report found</h1>
          <p className="p">
            There&apos;s no report for this order, or it was made on another account or device.
          </p>
          <ButtonLink href={routes.order(orderId)} variant="ghost" className="mt-2">
            Back to order
          </ButtonLink>
        </section>
      </div>
    );
  return <Case d={d} />;
}

function outcomeText(d: DisputeDetail) {
  if (!d.decision) return null;
  const { outcome, refundKobo, releaseKobo } = d.decision;
  return outcome === "refunded"
    ? `Refunded ${naira(refundKobo)} to you`
    : outcome === "split"
      ? `${naira(refundKobo)} refunded, ${naira(releaseKobo)} to the farm`
      : "Released to the farm";
}

function Case({ d }: { d: DisputeDetail }) {
  const { viewer } = useViewer();
  const markRead = useMutation(api.disputes.markRead);
  const send = useMutation(api.disputes.sendMessage);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (d.unread) void markRead({ as: "consumer", disputeId: d._id as Id<"disputes"> }).catch(() => undefined);
  }, [d.unread, d._id, markRead]);

  const replied = d.farmResponse !== null || d.status !== "open";
  const resolved = d.status === "resolved";
  const badge = resolved
    ? { label: d.decision?.outcome === "released" ? "Released to the farm" : "Resolved", cls: d.decision?.outcome === "released" ? "b-grey" : "b-ok" }
    : replied
      ? { label: "Farmkeke is reviewing", cls: "b-pend" }
      : { label: "Waiting for the farm", cls: "b-pend" };
  const steps = [
    { label: "Reported", sub: dayLabel(d.reportedAt), state: "done" },
    {
      label: "Farm replied",
      sub: d.farmResponse ? dayLabel(d.farmResponse.at) : now > d.farmReplyBy ? "No reply" : `By ${weekdayTime(d.farmReplyBy)}`,
      state: replied ? "done" : "cur",
    },
    { label: "Under review", sub: resolved ? "Done" : replied ? "Now" : "Next", state: resolved ? "done" : replied ? "cur" : "todo" },
    {
      label: "Decision",
      sub: d.decision?.at ? dayLabel(d.decision.at) : `By ${dayLabel(d.decideBy)}`,
      state: resolved ? "done" : "todo",
    },
  ];
  const me = viewer?.name || d.consumerFirstName || "You";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await send({ as: "consumer", disputeId: d._id as Id<"disputes">, body: body.trim(), photoIds: [] });
      setBody("");
    } catch (err) {
      setError(errorCode(err) === "RATE_LIMITED" ? "You're sending a lot quickly. Wait a moment." : "We couldn't send that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal className="wrap pt-7 pb-24">
      <Link href={viewer ? routes.myOrders : routes.order(d.orderId)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
        {viewer ? "My orders" : "Back to order"}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Case {d.number}</h1>
          <p className="p mt-1">
            {d.reasonLabel} · Order {d.orderNumber} · {d.farmName}
          </p>
        </div>
        <span className={`badge h-[26px] rounded-lg px-2.5 ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-6 m:grid-cols-1 m:gap-3">
        <div className="flex flex-col gap-5">
          <section aria-label="Case progress" className="card p-[22px] m:px-4">
            <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
              {steps.map((s) => (
                <li
                  key={s.label}
                  aria-current={s.state === "cur" ? "step" : undefined}
                  className={`flex flex-col gap-2 text-[13px] font-semibold ${s.state === "todo" ? "text-[#9A9E95]" : "text-ink"}`}
                >
                  <span aria-hidden className={`h-1.5 rounded-md ${s.state === "done" ? "bg-forest" : s.state === "cur" ? "bg-lime" : "bg-line"}`} />
                  <span>
                    {s.label}
                    <span className="sr-only">{s.state === "done" ? " (done)" : s.state === "cur" ? " (now)" : " (to come)"}</span>
                  </span>
                  <span className="cap font-medium">{s.sub}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Messages about this case" className="card px-[22px] pt-2 pb-[22px] m:px-4">
            <ul className="m-0 list-none p-0">
              {d.messages.map((m) => {
                const who = m.from === "staff" ? "Farmkeke support" : m.mine ? "You" : d.farmName;
                const av =
                  m.from === "staff"
                    ? { text: "FK", cls: "bg-forest text-lime" }
                    : m.mine
                      ? { text: initials(me), cls: "bg-lime-soft text-forest" }
                      : { text: initials(d.farmName), cls: "bg-[#F4EEDD] text-forest" };
                return (
                  <li key={m._id} className="flex gap-3 py-4 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
                    <span aria-hidden className={`flex size-9 flex-none items-center justify-center rounded-full text-xs font-bold ${av.cls}`}>
                      {av.text}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <span className="text-sm font-semibold">{who}</span>
                        <span className="cap">{weekdayTime(m.at)}</span>
                      </div>
                      {m.body ? <p className="mt-1 text-sm leading-[21px] whitespace-pre-line text-ink-2">{m.body}</p> : null}
                      {m.photos.length ? (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {m.photos.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, any size */}
                              <img src={url} alt={`Photo ${i + 1} from ${who}`} className="size-16 rounded-[10px] object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {d.canMessage ? (
              <form onSubmit={submit} className="mt-2 flex gap-2.5">
                <label className="flex-1">
                  <span className="sr-only">Add a message</span>
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Add a message or more details"
                    className="h-[46px] w-full rounded-xl border-0 px-3.5 text-sm shadow-[inset_0_0_0_1px_#DCE0D6]"
                  />
                </label>
                <Button type="submit" variant="dark" className="text-sm" loading={busy} disabled={!body.trim()}>
                  Send
                </Button>
              </form>
            ) : null}
            {error ? (
              <p role="alert" className="field-error">
                {error}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <section aria-labelledby="summary-title" className="card p-[22px]">
            <h2 id="summary-title" className="h3 text-base">
              Case summary
            </h2>
            <dl className="m-0 mt-2">
              <Kv label="Problem" value={d.reasonLabel} />
              <Kv
                label="Affected"
                value={d.items
                  .map((it) => {
                    // W-54 "Fresh tomatoes · 1 of 2 baskets" when only some units were affected
                    const some = it.affectedQuantity ?? it.quantity;
                    return some < it.quantity
                      ? `${it.name} · ${some} of ${it.quantity} ${it.unitLabel}`
                      : `${it.name} · ${plural(it.quantity, it.unitLabel, it.unitLabel)}`;
                  })
                  .join(", ")}
              />
              <Kv label="Amount in question" value={naira(d.amountKobo)} />
              <Kv
                label="Farm's response"
                value={
                  d.farmResponse
                    ? (d.farmResponse.stanceLabel ?? "Replied")
                    : now > d.farmReplyBy
                      ? "No reply in time"
                      : "Waiting for a reply"
                }
              />
              {d.decision ? <Kv label="Decision" value={outcomeText(d)!} /> : null}
            </dl>
          </section>
          <section className="card flex gap-3 p-[22px]">
            <span aria-hidden className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-tint text-forest">
              <ShieldCheck className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              {resolved ? (
                <>
                  <div className="text-[15px] font-bold">{outcomeText(d)}</div>
                  <p className="mt-1 text-[13px] leading-[19px] text-muted">
                    {d.decision?.note || "Any refund goes back to how you paid, and the rest is released to the farm."}
                  </p>
                  {d.decision && d.decision.refundKobo > 0 ? (
                    <Link href={routes.refund(d.orderId)} className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold">
                      View refund
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="text-[15px] font-bold">{naira(d.heldKobo || d.itemsTotalKobo + d.deliveryFeeKobo)} still held</div>
                  <p className="mt-1 text-[13px] leading-[19px] text-muted">
                    After the decision, any refund goes back to how you paid, and the rest is released to the farm.
                  </p>
                </>
              )}
            </div>
          </section>
          <p className="cap m-0 text-center">
            Questions about this case?{" "}
            <Link href={routes.contact} className="font-semibold">
              Chat with support
            </Link>
          </p>
        </aside>
      </div>
    </Reveal>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 text-sm [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
      <dt className="text-muted-2">{label}</dt>
      <dd className="m-0 text-right font-semibold">{value}</dd>
    </div>
  );
}
