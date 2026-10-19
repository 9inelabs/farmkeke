"use client";

// A-83 Service areas: where Farmkeke delivers, and the delivery fee each
// farm charges there. Shoppers pick an area in the app and on the website;
// turned-off areas disappear from that list.
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { koboFrom, NairaField, nairaText } from "@/components/admin/inputs";
import { DataTable, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { ServiceArea } from "@/convex/returns/adminOps";
import { naira } from "@/lib/format";

type Form = { state: string; name: string; lga: string; fee: string; lat: string; lng: string; radius: string };
const EMPTY: Form = { state: "", name: "", lga: "", fee: "", lat: "", lng: "", radius: "" };
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

export function AreasView() {
  const me = useStaff();
  const canEdit = me.can("areas.manage");
  const areas = useQuery(admin.areas.listAllServiceAreas, {}) as ServiceArea[] | undefined;
  const create = useMutation(admin.areas.createServiceArea);
  const update = useMutation(admin.areas.updateServiceArea);
  const [dialog, setDialog] = useState<{ kind: "new" } | { kind: "edit" | "toggle"; area: ServiceArea } | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (areas === undefined) return <TableSkeleton />;
  const states = [...new Set(areas.map((a) => a.state))].sort();
  const columns: Column<ServiceArea>[] = [
    { key: "name", label: "Area", render: (a) => a.name },
    { key: "lga", label: "LGA", render: (a) => a.lga },
    { key: "fee", label: "Delivery fee", render: (a) => <strong>{naira(a.deliveryFeeKobo)}</strong> },
    { key: "map", label: "Map position", render: (a) => (a.latitude !== undefined && a.longitude !== undefined ? `Set${a.radiusKm ? `, ${a.radiusKm} km` : ""}` : "Not set") },
    { key: "status", label: "Status", render: (a) => (a.active ? <span className="badge b-ok">On</span> : <span className="badge b-grey">Off</span>) },
    ...(canEdit
      ? [
          {
            key: "edit",
            label: "Change",
            render: (a: ServiceArea) => (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForm({
                      state: a.state,
                      name: a.name,
                      lga: a.lga,
                      fee: nairaText(a.deliveryFeeKobo),
                      lat: a.latitude?.toString() ?? "",
                      lng: a.longitude?.toString() ?? "",
                      radius: a.radiusKm?.toString() ?? "",
                    });
                    setDialog({ kind: "edit", area: a });
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "toggle", area: a })}>
                  {a.active ? "Turn off" : "Turn on"}
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Areas and delivery fees"
        description="Where Farmkeke delivers. Shoppers choose their area, and each farm in their cart charges that area's delivery fee."
        actions={
          canEdit ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setForm(EMPTY);
                setDialog({ kind: "new" });
              }}
            >
              New area
            </Button>
          ) : null
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {states.length === 0 ? (
        <Notice tone="pend">No areas yet. Shoppers can&apos;t choose home delivery until you add one.</Notice>
      ) : (
        <div className="flex flex-col gap-6">
          {states.map((state) => (
            <Panel key={state} title={state} padded={false}>
              <DataTable
                caption={`Areas in ${state}`}
                columns={columns}
                rows={areas.filter((a) => a.state === state).sort((a, b) => a.sortOrder - b.sortOrder)}
                rowKey={(a) => a._id}
              />
            </Panel>
          ))}
        </div>
      )}

      <ReasonDialog
        open={dialog?.kind === "new" || dialog?.kind === "edit"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? `Edit ${dialog.area.name}` : "New area"}
        description="A new fee applies to orders placed from now on."
        confirmLabel={dialog?.kind === "edit" ? "Save" : "Create area"}
        variant="lime"
        onConfirm={async (reason) => {
          const fee = koboFrom(form.fee);
          if (fee === null) throw new FormError("Enter the delivery fee in naira.");
          const position = { latitude: num(form.lat), longitude: num(form.lng), radiusKm: num(form.radius) };
          if (dialog?.kind === "edit") {
            await update({ areaId: dialog.area._id, name: form.name, lga: form.lga, deliveryFeeKobo: fee, ...position, reason });
            setDone("Area saved.");
          } else {
            await create({ state: form.state, name: form.name, lga: form.lga, deliveryFeeKobo: fee, ...position, reason });
            setDone("Area created. Shoppers can choose it now.");
          }
        }}
      >
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="State" value={form.state} onChange={set("state")} disabled={dialog?.kind === "edit"} placeholder="Imo" />
          <TextField label="Area name" value={form.name} onChange={set("name")} placeholder="New Owerri" />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} placeholder="Owerri North" />
          <NairaField label="Delivery fee per farm" value={form.fee} onChange={(fee) => setForm((f) => ({ ...f, fee }))} />
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className="lbl">Map position (optional)</legend>
          <p className="sm m-0 mb-2">The app uses this to suggest the area from a shopper&apos;s location.</p>
          <div className="grid grid-cols-3 gap-3 m:grid-cols-1">
            <TextField label="Latitude" inputMode="decimal" value={form.lat} onChange={set("lat")} placeholder="5.4836" />
            <TextField label="Longitude" inputMode="decimal" value={form.lng} onChange={set("lng")} placeholder="7.0333" />
            <TextField label="Radius (km)" inputMode="decimal" value={form.radius} onChange={set("radius")} placeholder="5" />
          </div>
        </fieldset>
      </ReasonDialog>
      <ReasonDialog
        open={dialog?.kind === "toggle"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "toggle" ? `${dialog.area.active ? "Turn off" : "Turn on"} ${dialog.area.name}` : ""}
        description={
          dialog?.kind === "toggle" && dialog.area.active
            ? "Shoppers can't choose this area for delivery. Orders already placed carry on."
            : "Shoppers can choose this area again."
        }
        confirmLabel={dialog?.kind === "toggle" && dialog.area.active ? "Turn off" : "Turn on"}
        onConfirm={async (reason) => {
          if (dialog?.kind !== "toggle") return;
          await update({ areaId: dialog.area._id, active: !dialog.area.active, reason });
          setDone(dialog.area.active ? "Area turned off." : "Area turned on.");
        }}
      />
    </>
  );
}
