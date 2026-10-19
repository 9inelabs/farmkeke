"use client";

// A-53 / A-54 Dispatch board: orders the farms have ready, on the road, at
// pickup points and just delivered. Staff give orders to riders and record
// each step; the shopper and the farm are told as it happens.
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { LATE } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Notice, PageHeader, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Board, BoardRow } from "@/convex/returns/adminOps";
import { isoDayLabel } from "@/components/orders/format";
import { clock, dateTime, displayPhone } from "@/lib/format";

type Step = "collected_from_farm" | "dropped_at_pickup_point" | "delivered" | "collected_by_consumer";
const STEP_LABEL: Record<Step, string> = {
  collected_from_farm: "Collected from the farm",
  dropped_at_pickup_point: "Dropped at the pickup point",
  delivered: "Delivered",
  collected_by_consumer: "Collected by the shopper",
};

/** "2026-10-20T09:30" in the browser's time, for datetime-local inputs. */
const localInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

function useNow(stepMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(t);
  }, [stepMs]);
  return now;
}

function Card({ row, actions }: { row: BoardRow; actions: React.ReactNode }) {
  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={adminRoutes.order(row.orderId)} className="font-display text-[15px] font-bold">
          {row.number}
        </Link>
        <span className="flex flex-wrap gap-1.5">
          <span className="badge b-grey">{row.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
          {row.late ? <span className="badge b-err">{LATE[row.late]}</span> : null}
        </span>
      </div>
      <dl className="m-0 grid gap-1.5 text-sm">
        <div>
          <dt className="cap inline">From </dt>
          <dd className="m-0 inline text-ink-2">
            {row.farm ? `${row.farm.name}, ${row.farm.collectionAddress}` : "–"}
            {row.farm ? <span className="text-subtle"> · {displayPhone(row.farm.phone)}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="cap inline">To </dt>
          <dd className="m-0 inline text-ink-2">
            {row.dropOff.kind === "address"
              ? `${row.dropOff.street}${row.dropOff.landmark ? ` (${row.dropOff.landmark})` : ""}, ${row.dropOff.area}`
              : `${row.dropOff.name} pickup point`}
          </dd>
        </div>
        <div>
          <dt className="cap inline">Shopper </dt>
          <dd className="m-0 inline text-ink-2">
            {row.consumer.name} · {displayPhone(row.consumer.phone)}
          </dd>
        </div>
        {row.window ? (
          <div>
            <dt className="cap inline">Window </dt>
            <dd className="m-0 inline text-ink-2">
              {isoDayLabel(row.window.day)}, {clock(row.window.from)} – {clock(row.window.to)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="cap inline">Rider </dt>
          <dd className="m-0 inline text-ink-2">
            {row.rider ? `${row.rider.name} · ${displayPhone(row.rider.phone)}` : "Not assigned"}
            {row.riderCollectAt ? <span className="text-subtle"> · collects {dateTime(row.riderCollectAt)}</span> : null}
          </dd>
        </div>
      </dl>
      {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
    </li>
  );
}

function Column({ title, rows, empty, actions }: { title: string; rows: BoardRow[]; empty: string; actions: (r: BoardRow) => React.ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3">
      <h2 className="h3 flex items-center gap-2">
        {title}
        <span className="rounded-full bg-sunk px-2 text-xs font-bold text-ink-3">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="sm rounded-2xl bg-soft p-4">{empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((r) => (
            <Card key={r.orderId} row={r} actions={actions(r)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function DispatchView() {
  const me = useStaff();
  const now = useNow();
  const board = useQuery(admin.dispatch.board, { now }) as Board | undefined;
  const assign = useMutation(admin.dispatch.assignRider);
  const recordStep = useMutation(admin.dispatch.recordStep);
  const [assigning, setAssigning] = useState<BoardRow | null>(null);
  const [stepping, setStepping] = useState<{ row: BoardRow; step: Step } | null>(null);
  const [riderId, setRiderId] = useState("");
  const [collectAt, setCollectAt] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const canDispatch = me.can("dispatch.manage");

  if (board === undefined) return <TableSkeleton />;
  const step = (row: BoardRow, s: Step) => {
    setNote("");
    setCode("");
    setStepping({ row, step: s });
  };
  const assignButton = (row: BoardRow) =>
    canDispatch ? (
      <Button
        size="sm"
        variant={row.rider ? "ghost" : "lime"}
        onClick={() => {
          setRiderId(row.rider?._id ?? "");
          setCollectAt(localInput(row.riderCollectAt ?? Date.now() + 60 * 60_000));
          setNote("");
          setAssigning(row);
        }}
      >
        {row.rider ? "Change rider" : "Assign rider"}
      </Button>
    ) : null;

  return (
    <>
      <PageHeader
        title="Dispatch"
        description={`Orders ready to move, on the road and at pickup points. ${board.riders.length} riders working. Updates live.`}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-4 gap-5 m:grid-cols-1">
        <Column
          title="Ready for a rider"
          rows={board.readyForRider}
          empty="Nothing waiting at farms."
          actions={(r) => (
            <>
              {assignButton(r)}
              {canDispatch && r.status === "ready_for_rider" && r.rider ? (
                <Button size="sm" variant="ghost" onClick={() => step(r, "collected_from_farm")}>
                  Collected
                </Button>
              ) : null}
            </>
          )}
        />
        <Column
          title="With a rider"
          rows={board.withRider}
          empty="No one on the road."
          actions={(r) =>
            canDispatch ? (
              <Button size="sm" variant="ghost" onClick={() => step(r, r.fulfilment === "delivery" ? "delivered" : "dropped_at_pickup_point")}>
                {r.fulfilment === "delivery" ? "Delivered" : "At pickup point"}
              </Button>
            ) : null
          }
        />
        <Column
          title="At pickup points"
          rows={board.atPickupPoint}
          empty="No orders waiting for collection."
          actions={(r) =>
            canDispatch ? (
              <Button size="sm" variant="ghost" onClick={() => step(r, "collected_by_consumer")}>
                Collected by shopper
              </Button>
            ) : null
          }
        />
        <Column title="Delivered recently" rows={board.delivered} empty="Nothing delivered yet." actions={() => null} />
      </div>

      <ConfirmDialog
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title={assigning ? `Rider for ${assigning.number}` : ""}
        description="The farm is told who's coming and when."
        confirmLabel="Assign rider"
        variant="lime"
        onConfirm={async () => {
          if (!assigning) return;
          if (!riderId) throw new FormError("Choose a rider.");
          const at = new Date(collectAt).getTime();
          if (!Number.isFinite(at)) throw new FormError("Choose when they'll collect it.");
          await assign({ orderId: assigning.orderId, riderId: riderId as Id<"riders">, collectAt: at, note: note || undefined });
          setDone(`Rider assigned to ${assigning.number}.`);
        }}
      >
        <SelectField label="Rider" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
          <option value="">Choose a rider</option>
          {board.riders.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name} · {r.jobs === 1 ? "1 job" : `${r.jobs} jobs`}
            </option>
          ))}
        </SelectField>
        <TextField label="Collects from the farm at" type="datetime-local" value={collectAt} onChange={(e) => setCollectAt(e.target.value)} />
        <TextField label="Note" labelNote="(optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </ConfirmDialog>
      <ConfirmDialog
        open={stepping !== null}
        onClose={() => setStepping(null)}
        title={stepping ? `${stepping.row.number}: ${STEP_LABEL[stepping.step]}` : ""}
        description={
          stepping?.step === "collected_by_consumer"
            ? "Ask for the shopper's pickup code and enter it."
            : stepping?.step === "delivered"
              ? "The shopper is asked to check their order and confirm receipt."
              : stepping?.step === "dropped_at_pickup_point"
                ? "The shopper gets their pickup code and the time they have to collect."
                : "The shopper is told their order is on its way."
        }
        confirmLabel="Save"
        variant="lime"
        onConfirm={async () => {
          if (!stepping) return;
          if (stepping.step === "collected_by_consumer" && code.replace(/\D/g, "").length === 0) throw new FormError("Enter the pickup code.");
          await recordStep({ orderId: stepping.row.orderId, step: stepping.step, note: note || undefined, pickupCode: code || undefined });
          setDone(`${stepping.row.number}: ${STEP_LABEL[stepping.step].toLowerCase()}.`);
        }}
      >
        {stepping?.step === "collected_by_consumer" ? (
          <TextField label="Pickup code" inputMode="numeric" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        ) : null}
        <TextField label="Note" labelNote="(optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </ConfirmDialog>
    </>
  );
}
