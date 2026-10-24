"use client";

// A-53 / A-54 Dispatch board, one stage at a time (tabs with counts, wide
// cards). Delivery orders arrive unpaid: once the farm
// accepts, staff assign and brief a rider and set the delivery price, which
// completes the shopper's bill. Paid orders then move to "Ready for a rider",
// on the road and delivered. Pickup orders wait at the farm for the shopper.
// The shopper and the farm are told at each step.
import { useMutation, useQuery } from "convex/react";
import { Bike, Clock, MapPin, Phone, Receipt, Store, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { koboFrom, NairaField, nairaText } from "@/components/admin/inputs";
import { LATE } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Notice, PageHeader, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Board, BoardRow } from "@/convex/returns/adminOps";
import { isoDayLabel } from "@/components/orders/format";
import { clock, dateTime, displayPhone, naira } from "@/lib/format";

type Step = "collected_from_farm" | "dropped_at_pickup_point" | "delivered" | "collected_by_consumer";
const STEP_LABEL: Record<Step, string> = {
  collected_from_farm: "Collected from the farm",
  dropped_at_pickup_point: "Dropped at the pickup point",
  delivered: "Delivered",
  collected_by_consumer: "Collected by the shopper",
};

type Rider = Board["riders"][number];
const riderLine = (r: Pick<Rider, "name" | "plateNumber" | "bikeModel">) =>
  [r.name, r.plateNumber, r.bikeModel].filter(Boolean).join(" · ");

/** Where a delivery order's bill stands, for the card's badge. */
function billBadge(row: BoardRow): { tone: string; text: string } | null {
  if (row.fulfilment !== "delivery" || row.paid) return null;
  const bill = row.bill;
  if (bill?.status === "awaiting_payment") return { tone: "b-pend", text: `Bill sent · pay by ${bill.payBy ? dateTime(bill.payBy) : "–"}` };
  if (row.deliveryPricedAt !== null) return { tone: "b-grey", text: `Priced ${naira(row.deliveryFeeKobo)} · waiting for other farms` };
  if (row.status === "placed") return { tone: "b-grey", text: "Waiting for the farm" };
  return row.rider ? { tone: "b-pend", text: "Set the delivery price" } : { tone: "b-pend", text: "Assign a rider" };
}

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

type StageKey = "price" | "ready" | "road" | "waiting" | "delivered";

const STAGES: { key: StageKey; title: string; hint: string; empty: string; rows: (b: Board) => BoardRow[] }[] = [
  {
    key: "price",
    title: "Price the delivery",
    hint: "Assign a rider, then set the delivery price. The shopper gets the bill once every farm in the order has answered.",
    empty: "No deliveries to price. New ones appear here when a farm accepts.",
    rows: (b) => b.awaitingBill,
  },
  { key: "ready", title: "Ready for a rider", hint: "Paid and waiting at the farm. Mark them collected when the rider has them.", empty: "Nothing paid and waiting at farms.", rows: (b) => b.readyForRider },
  { key: "road", title: "With a rider", hint: "On the road. Mark each one delivered when the shopper has it.", empty: "No one on the road.", rows: (b) => b.withRider },
  { key: "waiting", title: "Waiting for the shopper", hint: "Pickup orders waiting to be collected. Ask for the shopper's pickup code.", empty: "No pickup orders waiting at farms.", rows: (b) => b.atPickupPoint },
  { key: "delivered", title: "Delivered recently", hint: "Done. Kept here for a little while.", empty: "Nothing delivered yet.", rows: (b) => b.delivered },
];

/** The five stages as a row of tabs, each with its count. */
function StageTabs({ board, value, onChange }: { board: Board; value: StageKey; onChange: (k: StageKey) => void }) {
  return (
    <div role="tablist" aria-label="Dispatch stages" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
      {STAGES.map((stage, i) => {
        const on = stage.key === value;
        const count = stage.rows(board).length;
        return (
          <button
            key={stage.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(stage.key)}
            className={`flex min-w-[170px] flex-1 flex-col items-start gap-2 rounded-2xl px-4 py-3.5 text-left transition-colors ${
              on ? "bg-forest text-white" : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-soft"
            }`}
          >
            <span className={`text-xs font-semibold ${on ? "text-white/70" : "text-subtle"}`}>Step {i + 1}</span>
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-[15px] font-semibold leading-5">{stage.title}</span>
              <span
                className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-bold ${
                  on ? "bg-lime text-forest" : count > 0 ? "bg-tint text-forest" : "bg-sunk text-subtle"
                }`}
              >
                {count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A label above its value, for the card's details. */
function Detail({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-soft text-muted">
        <Icon size={15} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="cap">{label}</div>
        <div className="text-[14px] leading-5 text-ink">{children}</div>
      </div>
    </div>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`} className="text-muted underline-offset-2 hover:underline">
      {displayPhone(phone)}
    </a>
  );
}

function Card({ row, riders, actions }: { row: BoardRow; riders: Rider[]; actions: React.ReactNode }) {
  const bill = billBadge(row);
  const rider = row.rider ? (riders.find((r) => r._id === row.rider!._id) ?? null) : null;
  const dropOff =
    row.dropOff.kind === "address"
      ? `${row.dropOff.street}${row.dropOff.landmark ? ` (${row.dropOff.landmark})` : ""}, ${row.dropOff.area}`
      : row.dropOff.kind === "farm"
        ? "The shopper collects at the farm"
        : `${row.dropOff.name} pickup point`;
  return (
    <li className="card flex flex-col">
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={adminRoutes.order(row.orderId)} className="font-display text-lg font-bold hover:underline">
            {row.number}
          </Link>
          <span className="flex flex-wrap gap-1.5">
            <span className="badge b-grey">{row.fulfilment === "delivery" ? "Delivery" : "Pickup at farm"}</span>
            {row.fulfilment === "delivery" && !row.paid ? <span className="badge b-err">Not paid</span> : null}
            {row.late ? <span className="badge b-err">{LATE[row.late]}</span> : null}
          </span>
        </div>
        {bill ? <span className={`badge ${bill.tone} self-start`}>{bill.text}</span> : null}
      </div>

      {/* The route: farm to drop-off */}
      <ol className="mx-5 mb-4 flex list-none flex-col gap-0 rounded-2xl bg-soft p-4">
        <li className="relative flex gap-3 pb-4">
          <span className="absolute top-6 left-[11px] h-[calc(100%-20px)] w-px bg-line" aria-hidden />
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tint text-forest">
            <Store size={13} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="cap">Collect from</div>
            {row.farm ? (
              <>
                <div className="text-[14px] font-semibold leading-5 text-ink">{row.farm.name}</div>
                <div className="text-[13px] leading-5 text-ink-2">{row.farm.collectionAddress}</div>
                <div className="text-[13px] leading-5">
                  <PhoneLink phone={row.farm.phone} />
                </div>
              </>
            ) : (
              <div className="text-[14px] text-ink-2">–</div>
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest text-lime">
            <MapPin size={13} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="cap">{row.dropOff.kind === "address" ? "Deliver to" : "Hand over"}</div>
            <div className="text-[14px] leading-5 text-ink">{dropOff}</div>
            {row.dropOff.kind === "address" && row.dropOff.note ? <div className="mt-1 text-[13px] leading-5 text-ink-2">“{row.dropOff.note}”</div> : null}
          </div>
        </li>
      </ol>

      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Detail icon={User} label="Shopper">
          <div>{row.consumer.name}</div>
          <PhoneLink phone={row.consumer.phone} />
        </Detail>
        {row.fulfilment === "delivery" ? (
          <Detail icon={Receipt} label="Products">
            <div>{naira(row.itemsTotalKobo)}</div>
            {row.deliveryPricedAt !== null ? <div className="text-muted">+ {naira(row.deliveryFeeKobo)} delivery</div> : null}
          </Detail>
        ) : null}
        {row.window ? (
          <Detail icon={Clock} label="Window">
            {isoDayLabel(row.window.day)}, {clock(row.window.from)} – {clock(row.window.to)}
          </Detail>
        ) : null}
        <Detail icon={Bike} label="Rider">
          {row.rider ? (
            <>
              <div>{rider ? riderLine(rider) : row.rider.name}</div>
              <PhoneLink phone={row.rider.phone} />
              {row.riderCollectAt ? <div className="text-muted">Collects {dateTime(row.riderCollectAt)}</div> : null}
            </>
          ) : (
            <span className="text-subtle">Not assigned yet</span>
          )}
        </Detail>
      </div>

      {actions ? <div className="mt-auto flex flex-wrap gap-2 border-t border-line px-5 py-4">{actions}</div> : null}
    </li>
  );
}

export function DispatchView() {
  const me = useStaff();
  const now = useNow();
  const board = useQuery(admin.dispatch.board, { now }) as Board | undefined;
  const assign = useMutation(admin.dispatch.assignRider);
  const recordStep = useMutation(admin.dispatch.recordStep);
  const setPrice = useMutation(admin.dispatch.setDeliveryPrice);
  const [assigning, setAssigning] = useState<BoardRow | null>(null);
  const [pricing, setPricing] = useState<BoardRow | null>(null);
  const [fee, setFee] = useState("");
  const [stepping, setStepping] = useState<{ row: BoardRow; step: Step } | null>(null);
  const [riderId, setRiderId] = useState("");
  const [collectAt, setCollectAt] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const canDispatch = me.can("dispatch.manage");
  const [stage, setStage] = useState<StageKey | null>(null);

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
  const priceButton = (row: BoardRow) =>
    canDispatch && row.canPrice && row.rider ? (
      <Button
        size="sm"
        variant={row.deliveryPricedAt === null ? "lime" : "ghost"}
        onClick={() => {
          setFee(row.deliveryPricedAt === null ? "" : nairaText(row.deliveryFeeKobo));
          setNote("");
          setPricing(row);
        }}
      >
        {row.deliveryPricedAt === null ? "Set price" : "Change price"}
      </Button>
    ) : null;
  const riders = board.riders;
  const actionsFor: Record<StageKey, (r: BoardRow) => React.ReactNode> = {
    price: (r) =>
      r.canPrice ? (
        <>
          {assignButton(r)}
          {priceButton(r)}
        </>
      ) : null,
    ready: (r) => (
      <>
        {assignButton(r)}
        {canDispatch && r.status === "ready_for_rider" && r.rider ? (
          <Button size="sm" variant="ghost" onClick={() => step(r, "collected_from_farm")}>
            Collected
          </Button>
        ) : null}
      </>
    ),
    road: (r) =>
      canDispatch ? (
        <Button size="sm" variant="ghost" onClick={() => step(r, r.fulfilment === "delivery" ? "delivered" : "dropped_at_pickup_point")}>
          {r.fulfilment === "delivery" ? "Delivered" : "At pickup point"}
        </Button>
      ) : null,
    waiting: (r) =>
      canDispatch ? (
        <Button size="sm" variant="ghost" onClick={() => step(r, "collected_by_consumer")}>
          Collected by shopper
        </Button>
      ) : null,
    delivered: () => null,
  };
  // Until a stage is picked: the first one with work in it
  const current = STAGES.find((x) => x.key === stage) ?? STAGES.find((x) => x.key !== "delivered" && x.rows(board).length > 0) ?? STAGES[0]!;
  const currentRows = current.rows(board);

  return (
    <>
      <PageHeader
        title="Dispatch"
        description={`Price new deliveries, then send paid orders on their way. ${board.riders.length} riders working. Updates live.`}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <StageTabs board={board} value={current.key} onChange={setStage} />
      <section role="tabpanel" aria-label={current.title}>
        <p className="sm mb-4 max-w-2xl">{current.hint}</p>
        {currentRows.length === 0 ? (
          <div className="rounded-2xl bg-soft px-6 py-10 text-center text-[15px] text-muted">{current.empty}</div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 min-[900px]:grid-cols-2 min-[1500px]:grid-cols-3">
            {currentRows.map((r) => (
              <Card key={r.orderId} row={r} riders={riders} actions={actionsFor[current.key](r)} />
            ))}
          </ul>
        )}
      </section>

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
              {riderLine(r)} · {r.jobs === 1 ? "1 job" : `${r.jobs} jobs`}
            </option>
          ))}
        </SelectField>
        <TextField label="Collects from the farm at" type="datetime-local" value={collectAt} onChange={(e) => setCollectAt(e.target.value)} />
        <TextField label="Note" labelNote="(optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </ConfirmDialog>
      <ConfirmDialog
        open={pricing !== null}
        onClose={() => setPricing(null)}
        title={pricing ? `Delivery price for ${pricing.number}` : ""}
        description={
          pricing
            ? `Brief ${pricing.rider?.name ?? "the rider"} on where it's going first. When every farm in the order has answered, the shopper gets the bill by email, text and in the app, and has 12 hours to pay.`
            : ""
        }
        confirmLabel="Save price"
        variant="lime"
        onConfirm={async () => {
          if (!pricing) return;
          const kobo = koboFrom(fee);
          if (kobo === null) throw new FormError("Enter the delivery price in naira.");
          const { billSent } = (await setPrice({ orderId: pricing.orderId, feeKobo: kobo, note: note || undefined })) as { billSent: boolean };
          setDone(
            billSent
              ? `Bill sent for ${pricing.number}. The shopper has 12 hours to pay.`
              : `Price saved for ${pricing.number}. The bill goes out once the other farms in the order have answered.`,
          );
        }}
      >
        {pricing ? (
          <dl className="m-0 grid gap-1 text-sm">
            <div>
              <dt className="cap inline">Products </dt>
              <dd className="m-0 inline">{naira(pricing.itemsTotalKobo)}</dd>
            </div>
            {pricing.dropOff.kind === "address" ? (
              <div>
                <dt className="cap inline">To </dt>
                <dd className="m-0 inline">
                  {pricing.dropOff.street}, {pricing.dropOff.area} ({pricing.dropOff.lga})
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <NairaField label="Delivery price" value={fee} onChange={setFee} hint="What the shopper pays for this farm's delivery." />
        <TextField label="Note" labelNote="(optional)" placeholder="e.g. 8 km, after 4pm" value={note} onChange={(e) => setNote(e.target.value)} />
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
