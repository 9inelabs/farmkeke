"use client";

// A-71 / A-72: one problem report. Staff read the shopper's report and the
// farm's reply, message each side separately (each sees only their own
// conversation with Farmkeke), keep internal notes, and decide the money:
// no refund, a full refund, or a part refund with the rest paid to the farm.
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { koboFrom, NairaField } from "@/components/admin/inputs";
import { DISPUTE_STATUS, OUTCOME } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { Composer, Thread, type ThreadMessage } from "@/components/admin/Thread";
import { ConfirmDialog, FilterTabs, Notice, PageHeader, Panel, Photo, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Assignable, DisputeDetail } from "@/convex/returns/adminCare";
import { dateTime, displayPhone, naira } from "@/lib/format";

type Outcome = "released" | "refunded" | "split";

export function DisputeView({ disputeId }: { disputeId: string }) {
  const me = useStaff();
  const id = disputeId as Id<"disputes">;
  const d = useQuery(admin.disputes.get, { disputeId: id }) as DisputeDetail | null | undefined;
  const staff = useQuery(admin.staff.assignable, { permission: "disputes.manage" }) as Assignable[] | undefined;
  const markRead = useMutation(admin.disputes.markRead);
  const sendMessage = useMutation(admin.disputes.sendMessage);
  const addNote = useMutation(admin.disputes.addNote);
  const assign = useMutation(admin.disputes.assign);
  const resolve = useMutation(admin.disputes.resolve);
  const [side, setSide] = useState<"consumer" | "farmer">("consumer");
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("refunded");
  const [refund, setRefund] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const loaded = d !== undefined && d !== null;
  useEffect(() => {
    if (loaded) void markRead({ disputeId: id }).catch(() => {});
  }, [loaded, id, markRead]);

  if (d === undefined) return <TableSkeleton />;
  if (d === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.disputes, label: "Problem reports" }} />
        <Notice tone="err">This problem report no longer exists.</Notice>
      </>
    );
  }
  const canManage = me.can("disputes.manage");
  const canDecide = me.can("disputes.decide") && d.status !== "resolved";
  const thread: ThreadMessage[] = d.messages
    .filter((m) => (side === "consumer" ? m.from === "consumer" || (m.from === "staff" && m.audience === "consumer") : m.from === "farmer" || (m.from === "staff" && m.audience === "farmer")))
    .map((m) => ({
      _id: m._id,
      who: m.from === "staff" ? (m.authorName ?? "Staff") : m.from === "consumer" ? d.consumer.name : d.farmName,
      staff: m.from === "staff",
      body: m.body,
      photos: m.photos,
      at: m.at,
    }));

  return (
    <>
      <PageHeader
        title={`Problem report ${d.number}`}
        description={`${d.reasonLabel} · order ${d.orderNumber} · reported ${dateTime(d.reportedAt)}`}
        back={{ href: adminRoutes.disputes, label: "Problem reports" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge map={DISPUTE_STATUS} status={d.status} />
            {d.farmReplyOverdue && d.status === "open" ? <span className="badge b-err">Farm reply overdue</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {d.decision ? (
        <div className="mb-4">
          <Notice tone="ok">
            Decided{d.decidedBy ? ` by ${d.decidedBy.name}` : ""}: {OUTCOME[d.decision.outcome]}
            {d.decision.refundKobo ? `, ${naira(d.decision.refundKobo)} refunded` : ""}
            {d.decision.releaseKobo ? `, ${naira(d.decision.releaseKobo)} to the farm` : ""}. {d.decision.note}
          </Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_340px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="What the shopper reported">
            <ul className="m-0 mb-4 list-none p-0 text-sm">
              {d.items.map((it) => (
                <li key={it.index} className="flex justify-between py-1">
                  <span>
                    {it.quantity} {it.unitLabel} · {it.name}
                  </span>
                  <span>{naira(it.lineTotalKobo)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-line-soft pt-2 font-semibold">
                <span>Amount reported</span>
                <span>{naira(d.amountKobo)}</span>
              </li>
            </ul>
            {d.note ? <p className="m-0 rounded-xl bg-soft px-4 py-3 text-[15px] whitespace-pre-line">{d.note}</p> : null}
            {d.photos.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.photos.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" aria-label="Open the shopper's photo (new tab)">
                    <Photo url={u} alt="Shopper's photo" className="size-28 rounded-xl" />
                  </a>
                ))}
              </div>
            ) : null}
          </Panel>
          <Panel title="The farm's reply">
            {d.farmResponse ? (
              <>
                <p className="sm m-0 mb-2">{dateTime(d.farmResponse.at)}</p>
                <p className="m-0 rounded-xl bg-soft px-4 py-3 text-[15px] whitespace-pre-line">{d.farmResponse.note || "No note."}</p>
                {d.farmResponse.photos.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.farmResponse.photos.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" aria-label="Open the farm's photo (new tab)">
                        <Photo url={u} alt="Farm's photo" className="size-28 rounded-xl" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="sm m-0">
                {d.farmReplyOverdue ? "The farm didn't reply in time. You can decide without it." : `The farm has until ${dateTime(d.farmReplyBy)} to reply.`}
              </p>
            )}
          </Panel>
          <Panel title="Messages" description="Each side only sees its own conversation with Farmkeke.">
            <FilterTabs
              label="Conversation"
              value={side}
              onChange={setSide}
              tabs={[
                { key: "consumer", label: `With ${d.consumer.name.split(/\s+/)[0] || "the shopper"}` },
                { key: "farmer", label: `With ${d.farmName}` },
              ]}
            />
            <Thread messages={thread} empty="No messages yet." />
            {canManage && d.status !== "resolved" ? (
              <div className="mt-5">
                <Composer
                  key={side}
                  label={side === "consumer" ? "Message the shopper" : "Message the farm"}
                  hint="They get a notification. Only they see it."
                  onSend={(body, photoIds) => sendMessage({ disputeId: id, audience: side, body, photoIds })}
                />
              </div>
            ) : null}
          </Panel>
          <Panel title="Staff notes" description="Only staff see these.">
            {d.notes.length > 0 ? (
              <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
                {d.notes.map((n) => (
                  <li key={n._id} className="rounded-xl bg-soft px-4 py-3 text-sm">
                    <p className="m-0 whitespace-pre-line">{n.body}</p>
                    <p className="m-0 mt-1 text-xs text-subtle">
                      {n.authorName} · {dateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {canManage ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  await addNote({ disputeId: id, body: note });
                  setNote("");
                }}
              >
                <TextArea label="Add a note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="[&_textarea]:h-auto [&_textarea]:py-3" />
                <div>
                  <Button type="submit" variant="ghost" size="sm">
                    Save note
                  </Button>
                </div>
              </form>
            ) : null}
          </Panel>
        </div>

        <div className="flex flex-col gap-6 self-start m:order-first">
          <Panel title="Decision">
            <Facts2
              rows={[
                ["Money held", naira(d.heldKobo)],
                ["Products", naira(d.itemsTotalKobo)],
                ["Delivery fee", naira(d.deliveryFeeKobo)],
                ["Decide by", dateTime(d.decideBy)],
              ]}
            />
            {d.escrowHold ? (
              <div className="mt-3">
                <Notice tone="pend">The order&apos;s money is on hold. Release the hold under Money before deciding.</Notice>
              </div>
            ) : null}
            {canDecide ? (
              <Button
                className="mt-4"
                variant="lime"
                fullWidth
                disabled={d.escrowHold}
                onClick={() => {
                  setOutcome("refunded");
                  setRefund("");
                  setDecisionNote("");
                  setReason("");
                  setDeciding(true);
                }}
              >
                Decide
              </Button>
            ) : d.status !== "resolved" ? (
              <p className="sm mt-3">Your role can&apos;t decide problem reports.</p>
            ) : null}
          </Panel>
          <Panel title="People">
            <Facts2
              rows={[
                ["Shopper", `${d.consumer.name}${d.consumer.isGuest ? " (guest)" : ""}`],
                ["Shopper phone", d.consumer.phone ? displayPhone(d.consumer.phone) : "–"],
                ["Farm", d.farm ? d.farm.name : d.farmName],
                ["Farm phone", d.farm ? displayPhone(d.farm.phone) : "–"],
              ]}
            />
            <div className="mt-3 flex flex-col gap-2">
              {me.can("orders.view") ? (
                <Link href={adminRoutes.order(d.orderId)} className="btn ghost sm w-full">
                  Open order {d.orderNumber}
                </Link>
              ) : null}
              {me.can("chat.view") ? (
                <Link href={adminRoutes.orderChat(d.orderId)} className="btn ghost sm w-full">
                  Read the order chat
                </Link>
              ) : null}
            </div>
          </Panel>
          <Panel title="Assigned to">
            {canManage ? (
              <select
                aria-label="Assigned to"
                className="fin cursor-pointer"
                value={d.assignee?._id ?? ""}
                onChange={(e) => void assign({ disputeId: id, ...(e.target.value ? { assigneeId: e.target.value as Id<"users"> } : {}) }).catch(() => {})}
              >
                <option value="">Nobody</option>
                {(staff ?? []).map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name}
                    {s.userId === me.userId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="m-0 text-[15px]">{d.assignee?.name ?? "Nobody"}</p>
            )}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={deciding}
        onClose={() => setDeciding(false)}
        title={`Decide ${d.number}`}
        description="This moves the money at once and can't be undone. Both the shopper and the farm are told."
        confirmLabel="Decide and move the money"
        variant="lime"
        width={560}
        onConfirm={async () => {
          if (!decisionNote.trim()) throw new FormError("Write the decision note both sides will see.");
          if (!reason.trim()) throw new FormError("Add the reason for the audit log.");
          let refundKobo: number | undefined;
          if (outcome === "split") {
            refundKobo = koboFrom(refund) ?? undefined;
            if (!refundKobo || refundKobo >= d.itemsTotalKobo) throw new FormError(`The part refund must be more than ₦0 and less than ${naira(d.itemsTotalKobo)}.`);
          }
          await resolve({
            disputeId: id,
            outcome,
            note: decisionNote,
            reason,
            ...(refundKobo ? { refundKobo, releaseKobo: d.itemsTotalKobo - refundKobo } : {}),
          });
          setDone("Decided. The money has moved and both sides have been told.");
        }}
      >
        <fieldset className="m-0 border-0 p-0">
          <legend className="lbl">Outcome</legend>
          {(
            [
              ["refunded", `Full refund: ${naira(d.heldKobo)} back to the shopper, delivery fee included`],
              ["split", "Part refund: some back to the shopper, the rest to the farm"],
              ["released", `No refund: ${naira(d.itemsTotalKobo)} paid to the farm`],
            ] as [Outcome, string][]
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px]">
              <input type="radio" name="outcome" className="size-5 accent-forest" checked={outcome === value} onChange={() => setOutcome(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        {outcome === "split" ? (
          <NairaField
            label="Refund to the shopper"
            value={refund}
            onChange={setRefund}
            hint={`From the products only (${naira(d.itemsTotalKobo)}). The farm gets the rest. The delivery fee isn't refunded.`}
          />
        ) : null}
        <TextArea
          label="Decision note"
          hint="Both the shopper and the farm see this."
          rows={3}
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
        <TextArea
          label="Reason"
          hint="For the audit log. Only staff see it."
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
      </ConfirmDialog>
    </>
  );
}

function Facts2({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 flex flex-col gap-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-muted">{k}</dt>
          <dd className="m-0 text-right font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
