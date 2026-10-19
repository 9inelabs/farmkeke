"use client";

// A-51 / A-52: one order, its money and its full history. Staff can add
// notes; with orders.manage they can cancel it (full refund), give the farm
// more time to accept, or change the rider.
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { ESCROW, eventLabel, ORDER_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { isoDayLabel } from "@/components/orders/format";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { OrderDetail, RiderRow } from "@/convex/returns/adminOps";
import { clock, dateTime, displayPhone, naira } from "@/lib/format";

const CANCELLABLE = ["awaiting_payment", "paid", "accepted", "preparing", "ready_for_rider", "out_for_delivery", "with_rider", "at_pickup_point"];
const ACTOR: Record<string, string> = { consumer: "shopper", farm: "farm", staff: "staff", system: "automatic" };
const RIDER_STAGES = ["accepted", "preparing", "ready_for_rider", "out_for_delivery", "with_rider"];

export function OrderView({ orderId }: { orderId: string }) {
  const me = useStaff();
  const id = orderId as Id<"orders">;
  const o = useQuery(admin.orders.get, { orderId: id }) as OrderDetail | null | undefined;
  const canManage = me.can("orders.manage");
  const [dayStart] = useState(() => new Date().setHours(0, 0, 0, 0));
  const riders = useQuery(admin.riders.list, canManage && me.can("riders.view") ? { dayStart } : "skip") as RiderRow[] | undefined;
  const addNote = useMutation(admin.orders.addNote);
  const cancel = useMutation(admin.orders.cancel);
  const extend = useMutation(admin.orders.extendDeadline);
  const reassign = useMutation(admin.orders.reassignRider);
  const [dialog, setDialog] = useState<"cancel" | "extend" | "rider" | null>(null);
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(12);
  const [riderId, setRiderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (o === undefined) return <TableSkeleton />;
  if (o === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.orders, label: "Orders" }} />
        <Notice tone="err">This order no longer exists.</Notice>
      </>
    );
  }
  const working = (riders ?? []).filter((r) => r.active && r.reviewStatus === "approved");

  return (
    <>
      <PageHeader
        title={`Order ${o.number}`}
        description={`Placed ${dateTime(o.placedAt)} · ${o.fulfilment === "delivery" ? "Home delivery" : "Pickup"}`}
        back={{ href: adminRoutes.orders, label: "Orders" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge map={ORDER_STATUS} status={o.status} />
            {o.escrowHold ? <span className="badge b-err">Money on hold</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {o.cancelReason || o.declineReason ? (
        <div className="mb-4">
          <Notice tone="err">{o.cancelReason ? `Cancelled: ${o.cancelReason}` : `Declined by the farm: ${o.declineReason}`}</Notice>
        </div>
      ) : null}
      {o.escrowHold && o.holdReason ? (
        <div className="mb-4">
          <Notice tone="pend">Money on hold: {o.holdReason}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Items" padded={false}>
            <ul className="m-0 list-none p-0">
              {o.items.map((it) => (
                <li key={it.index} className="flex justify-between gap-3 px-6 py-3 text-sm shadow-[inset_0_-1px_0_var(--color-line-soft)] m:px-4">
                  <span>
                    {it.quantity} {it.unitLabel} · <strong>{it.name}</strong>
                    <span className="block text-xs text-subtle">{naira(it.priceKobo)} each</span>
                  </span>
                  <strong>{naira(it.lineTotalKobo)}</strong>
                </li>
              ))}
              {[
                ["Products", o.itemsTotalKobo],
                ["Delivery", o.deliveryFeeKobo],
              ].map(([label, kobo]) => (
                <li key={label as string} className="flex justify-between px-6 py-2 text-sm text-muted m:px-4">
                  <span>{label}</span>
                  <span>{naira(kobo as number)}</span>
                </li>
              ))}
              <li className="flex justify-between px-6 pt-2 pb-4 text-[15px] font-bold text-ink m:px-4">
                <span>Total</span>
                <span>{naira(o.totalKobo)}</span>
              </li>
            </ul>
          </Panel>
          <Panel title="People">
            <Facts
              items={[
                { label: "Shopper", value: `${o.consumer.name}${o.consumer.isGuest ? " (guest)" : ""}` },
                { label: "Shopper contact", value: `${displayPhone(o.contact.phone)}${o.contact.email ? ` · ${o.contact.email}` : ""}` },
                {
                  label: "Farm",
                  value: o.farmDetail ? (
                    <Link href={adminRoutes.farm(o.farmDetail._id)} className="font-semibold">
                      {o.farmDetail.name}
                    </Link>
                  ) : (
                    o.farmName
                  ),
                },
                { label: "Farm phone", value: o.farmDetail ? displayPhone(o.farmDetail.phone) : "–" },
                {
                  label: "Rider",
                  value: o.riderDetail ? (
                    <Link href={adminRoutes.rider(o.riderDetail._id)} className="font-semibold">
                      {o.riderDetail.name} · {displayPhone(o.riderDetail.phone)}
                    </Link>
                  ) : (
                    "None"
                  ),
                },
                { label: "Rider collects", value: o.riderCollectAt ? dateTime(o.riderCollectAt) : "–" },
              ]}
            />
          </Panel>
          <Panel title={o.fulfilment === "delivery" ? "Delivery" : "Pickup"}>
            <Facts
              items={
                o.fulfilment === "delivery"
                  ? [
                      { label: "Address", value: o.address ? `${o.address.street}, ${o.address.areaName}, ${o.address.lga}` : "–" },
                      { label: "Landmark", value: o.address?.landmark || "–" },
                      { label: "Window", value: o.window ? `${isoDayLabel(o.window.day)}, ${clock(o.window.from)} – ${clock(o.window.to)}` : "–" },
                      { label: "Delivered", value: o.deliveredAt ? dateTime(o.deliveredAt) : "Not yet" },
                    ]
                  : [
                      { label: "Pickup point", value: o.pickupPoint ? `${o.pickupPoint.name}, ${o.pickupPoint.address}` : "–" },
                      { label: "Pickup code", value: o.pickupCode ?? "–" },
                      { label: "Collected", value: o.deliveredAt ? dateTime(o.deliveredAt) : "Not yet" },
                    ]
              }
            />
          </Panel>
          <Panel title="Money">
            <Facts
              items={[
                { label: "Where the money is", value: ESCROW[o.escrow] ?? o.escrow },
                { label: "Paid", value: o.paidAt ? dateTime(o.paidAt) : "Not paid" },
                { label: "Payment reference", value: o.payment?.reference ?? o.payment?.checkoutReference ?? "–" },
                { label: "Paid to the farm", value: o.releasedAt ? dateTime(o.releasedAt) : "Not yet" },
              ]}
            />
            {o.refunds.length > 0 ? (
              <ul className="m-0 mt-4 list-none p-0">
                {o.refunds.map((r) => (
                  <li key={r._id} className="text-sm">
                    Refund {naira(r.amountKobo)} ({r.kind}, {r.status}) · {r.reason} · {dateTime(r.at)}
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <Panel title="Timeline">
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {o.timeline.map((e) => (
                <li key={e._id} className="text-sm leading-5">
                  <span className="font-semibold text-ink">{eventLabel(e.kind)}</span>
                  <span className="text-muted">
                    {" "}
                    · {dateTime(e.at)}
                    {e.actorName ? ` · ${e.actorName}` : e.actorKind ? ` · ${ACTOR[e.actorKind] ?? e.actorKind}` : ""}
                  </span>
                  {e.note ? <span className="block text-ink-2">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Staff notes" description="Only staff see these.">
            {o.notes.length > 0 ? (
              <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
                {o.notes.map((n) => (
                  <li key={n._id} className="rounded-xl bg-soft px-4 py-3 text-sm">
                    <p className="m-0 whitespace-pre-line text-ink">{n.note}</p>
                    <p className="m-0 mt-1 text-xs text-subtle">
                      {n.authorName ?? "Staff"} · {dateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                setBusy(true);
                try {
                  await addNote({ orderId: id, note });
                  setNote("");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <TextArea label="Add a note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="[&_textarea]:h-auto [&_textarea]:py-3" />
              <div>
                <Button type="submit" variant="ghost" size="sm" loading={busy}>
                  Save note
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <Panel title="Actions" className="self-start m:order-first">
          <div className="flex flex-col gap-2.5">
            {o.disputeId ? (
              <Link href={`/admin/disputes/${o.disputeId}`} className="btn ghost w-full">
                Open the problem report
              </Link>
            ) : null}
            {o.conversationId && me.can("chat.view") ? (
              <Link href={`/admin/chats/${o.conversationId}`} className="btn ghost w-full">
                Read the order chat
              </Link>
            ) : null}
            {canManage && o.status === "paid" ? (
              <Button variant="ghost" fullWidth onClick={() => setDialog("extend")}>
                Give the farm more time
              </Button>
            ) : null}
            {canManage && RIDER_STAGES.includes(o.status) && me.can("riders.view") ? (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setRiderId(o.riderDetail?._id ?? "");
                  setDialog("rider");
                }}
              >
                {o.riderDetail ? "Change rider" : "Assign a rider"}
              </Button>
            ) : null}
            {canManage && CANCELLABLE.includes(o.status) ? (
              <Button variant="danger" fullWidth onClick={() => setDialog("cancel")}>
                Cancel order
              </Button>
            ) : null}
            {!canManage ? <p className="sm">Your role can see this order but not change it.</p> : null}
          </div>
        </Panel>
      </div>

      <ReasonDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        title={`Cancel ${o.number}`}
        description="The shopper gets a full refund, delivery fee included. The shopper and the farm are told why."
        hint="Shown to the farm and saved in the audit log."
        confirmLabel="Cancel and refund"
        variant="danger"
        onConfirm={async (reason) => {
          await cancel({ orderId: id, reason });
          setDone("Order cancelled. The refund is on its way.");
        }}
      />
      <ReasonDialog
        open={dialog === "extend"}
        onClose={() => setDialog(null)}
        title="Give the farm more time"
        description="The farm is told how long they now have to accept or decline."
        confirmLabel="Give more time"
        onConfirm={async (reason) => {
          await extend({ orderId: id, hours, reason });
          setDone(`The farm has ${hours} more hours.`);
        }}
      >
        <SelectField label="Extra time" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {[2, 6, 12, 24, 48].map((h) => (
            <option key={h} value={h}>
              {h} hours
            </option>
          ))}
        </SelectField>
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "rider"}
        onClose={() => setDialog(null)}
        title={o.riderDetail ? "Change rider" : "Assign a rider"}
        confirmLabel="Save rider"
        onConfirm={async (reason) => {
          if (!riderId) throw new FormError("Choose a rider.");
          await reassign({ orderId: id, riderId: riderId as Id<"riders">, reason });
          setDone("Rider saved.");
        }}
      >
        <SelectField label="Rider" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
          <option value="">Choose a rider</option>
          {working.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name} · {r.serviceAreas.map((a) => a.name).join(", ") || "no areas"}
            </option>
          ))}
        </SelectField>
      </ReasonDialog>
    </>
  );
}
