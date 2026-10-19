"use client";

// A-82 Pickup points: Farmkeke-run places where shoppers collect orders
// with their pickup code. Shown at checkout, on /pickup-locations and in the
// app.
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { HoursList, MapLink } from "@/components/admin/FarmBits";
import { HoursEditor, PhotoUpload } from "@/components/admin/inputs";
import { Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Hours } from "@/convex/returns/adminFarms";
import type { PickupPoint, Rules } from "@/convex/returns/adminOps";
import { displayPhone, plural } from "@/lib/format";

type Form = {
  name: string;
  address: string;
  state: string;
  lga: string;
  lat: string;
  lng: string;
  phone: string;
  days: string;
  hours: Hours[];
  photo?: Id<"_storage">;
  photoUrl?: string | null;
};
const EMPTY: Form = { name: "", address: "", state: "", lga: "", lat: "", lng: "", phone: "", days: "3", hours: [] };

export function PickupPointsView() {
  const me = useStaff();
  const canEdit = me.can("areas.manage");
  const points = useQuery(admin.areas.listAllPickupPoints, {}) as PickupPoint[] | undefined;
  const rules = useQuery(admin.fees.get, {}) as Rules | undefined;
  const create = useMutation(admin.areas.createPickupPoint);
  const update = useMutation(admin.areas.updatePickupPoint);
  const [dialog, setDialog] = useState<{ kind: "new" } | { kind: "edit" | "toggle"; point: PickupPoint } | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (points === undefined) return <TableSkeleton />;
  const hold = rules?.pickupHoldDays ?? 3;

  return (
    <>
      <PageHeader
        title="Pickup points"
        description={`Where shoppers collect orders with their pickup code. Orders wait at least ${plural(hold, "day")} (set in Fees and rules), or longer if the point says so.`}
        actions={
          canEdit ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setForm({ ...EMPTY, days: String(hold) });
                setDialog({ kind: "new" });
              }}
            >
              New pickup point
            </Button>
          ) : null
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {points.length === 0 ? (
        <Notice tone="pend">No pickup points yet. Shoppers can only choose home delivery.</Notice>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 m:grid-cols-1">
          {points.map((p) => (
            <li key={p._id}>
              <Panel
                title={p.name}
                description={`${p.address} · ${p.lga}, ${p.state}`}
                actions={p.active ? <span className="badge b-ok">Open</span> : <span className="badge b-grey">Closed</span>}
                className="h-full"
              >
                <dl className="m-0 grid grid-cols-2 gap-3 text-sm m:grid-cols-1">
                  <div>
                    <dt className="cap">Phone</dt>
                    <dd className="m-0">{displayPhone(p.phone)}</dd>
                  </div>
                  <div>
                    <dt className="cap">Orders wait</dt>
                    <dd className="m-0">{plural(Math.max(hold, p.collectWithinDays), "day")}</dd>
                  </div>
                  <div>
                    <dt className="cap">Hours</dt>
                    <dd className="m-0">
                      <HoursList hours={p.hours} />
                    </dd>
                  </div>
                  <div>
                    <dt className="cap">Location</dt>
                    <dd className="m-0">
                      <MapLink lat={p.latitude} lng={p.longitude} />
                    </dd>
                  </div>
                </dl>
                {canEdit ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          name: p.name,
                          address: p.address,
                          state: p.state,
                          lga: p.lga,
                          lat: String(p.latitude),
                          lng: String(p.longitude),
                          phone: p.phone,
                          days: String(p.collectWithinDays),
                          hours: p.hours,
                          photoUrl: p.photoUrl,
                        });
                        setDialog({ kind: "edit", point: p });
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "toggle", point: p })}>
                      {p.active ? "Close it" : "Open it"}
                    </Button>
                  </div>
                ) : null}
              </Panel>
            </li>
          ))}
        </ul>
      )}

      <ReasonDialog
        open={dialog?.kind === "new" || dialog?.kind === "edit"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? `Edit ${dialog.point.name}` : "New pickup point"}
        confirmLabel={dialog?.kind === "edit" ? "Save" : "Create pickup point"}
        variant="lime"
        onConfirm={async (reason) => {
          const lat = Number(form.lat);
          const lng = Number(form.lng);
          const days = Number(form.days);
          if (!form.lat || !form.lng || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new FormError("Add the map position (latitude and longitude).");
          if (!Number.isInteger(days) || days < 1 || days > 14) throw new FormError("Orders can wait 1 to 14 days.");
          if (form.hours.length === 0) throw new FormError("Add the opening hours.");
          const fields = {
            name: form.name,
            address: form.address,
            state: form.state,
            lga: form.lga,
            latitude: lat,
            longitude: lng,
            hours: form.hours,
            phone: form.phone,
            collectWithinDays: days,
          };
          if (dialog?.kind === "edit") {
            await update({ pointId: dialog.point._id, ...fields, ...(form.photo ? { photoStorageId: form.photo } : {}), reason });
            setDone("Pickup point saved.");
          } else {
            const id = (await create({ ...fields, reason })) as Id<"pickupPoints">;
            if (form.photo) await update({ pointId: id, photoStorageId: form.photo, reason });
            setDone("Pickup point created. Shoppers can choose it now.");
          }
        }}
      >
        <TextField label="Name" value={form.name} onChange={set("name")} placeholder="Ikenegbu Pickup Point" />
        <TextField label="Address" value={form.address} onChange={set("address")} />
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="State" value={form.state} onChange={set("state")} />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} />
          <TextField label="Latitude" inputMode="decimal" value={form.lat} onChange={set("lat")} placeholder="5.4836" />
          <TextField label="Longitude" inputMode="decimal" value={form.lng} onChange={set("lng")} placeholder="7.0333" />
          <TextField label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
          <TextField label="Orders wait (days)" inputMode="numeric" value={form.days} onChange={set("days")} hint={`At least ${hold} (the platform rule).`} />
        </div>
        <HoursEditor value={form.hours} onChange={(hours) => setForm((f) => ({ ...f, hours }))} />
        <PhotoUpload label="Photo (optional)" currentUrl={form.photoUrl ?? null} onUploaded={(photo) => setForm((f) => ({ ...f, photo }))} />
      </ReasonDialog>
      <ReasonDialog
        open={dialog?.kind === "toggle"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "toggle" ? `${dialog.point.active ? "Close" : "Open"} ${dialog.point.name}` : ""}
        description={
          dialog?.kind === "toggle" && dialog.point.active
            ? "Shoppers can't choose it at checkout. Orders already there can still be collected."
            : "Shoppers can choose it at checkout again."
        }
        confirmLabel={dialog?.kind === "toggle" && dialog.point.active ? "Close it" : "Open it"}
        onConfirm={async (reason) => {
          if (dialog?.kind !== "toggle") return;
          await update({ pointId: dialog.point._id, active: !dialog.point.active, reason });
          setDone(dialog.point.active ? "Pickup point closed." : "Pickup point open.");
        }}
      />
    </>
  );
}
