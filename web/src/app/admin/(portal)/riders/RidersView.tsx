"use client";

// A-55 Riders: Farmkeke's own riders. New riders are added here with a
// profile and reviewed before they can be given deliveries.
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { RIDER_REVIEW, VEHICLE } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, PageHeader, Panel, Photo, ReasonDialog, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { RiderRow, ServiceArea, Vehicle } from "@/convex/returns/adminOps";
import { displayPhone } from "@/lib/format";
import { AreaChecklist } from "./AreaChecklist";

type Tab = "pending" | "active" | "off" | "rejected";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const columns: Column<RiderRow>[] = [
  {
    key: "name",
    label: "Rider",
    render: (r) => (
      <span className="flex items-center gap-3">
        <Photo url={r.photoUrl} alt="" className="size-10 flex-none rounded-full" />
        <span>
          <span className="block">{r.name}</span>
          <span className="block text-xs font-normal text-subtle">{displayPhone(r.phone)}</span>
        </span>
      </span>
    ),
  },
  {
    key: "vehicle",
    label: "Vehicle",
    render: (r) =>
      r.vehicleType ? (
        <span>
          <span className="block">{VEHICLE[r.vehicleType]}</span>
          <span className="block text-xs text-subtle">{[r.plateNumber, r.bikeModel].filter(Boolean).join(" · ") || "No plate yet"}</span>
        </span>
      ) : (
        "–"
      ),
  },
  { key: "areas", label: "Areas", render: (r) => r.serviceAreas.map((a) => a.name).join(", ") || "None" },
  { key: "jobs", label: "On the road", render: (r) => String(r.activeJobs) },
  { key: "today", label: "Delivered today", render: (r) => String(r.deliveriesToday) },
  { key: "review", label: "Profile", render: (r) => <StatusBadge map={RIDER_REVIEW} status={r.reviewStatus} /> },
];

export function RidersView() {
  const me = useStaff();
  const router = useRouter();
  const [dayStart] = useState(startOfToday);
  const riders = useQuery(admin.riders.list, { dayStart }) as RiderRow[] | undefined;
  const areas = useQuery(admin.areas.listAllServiceAreas, {}) as ServiceArea[] | undefined;
  const create = useMutation(admin.riders.create);
  const [tab, setTab] = useState<Tab>("active");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [areaIds, setAreaIds] = useState<Id<"serviceAreas">[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle>("motorbike");
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");

  const inTab = (r: RiderRow, t: Tab) =>
    t === "pending" ? r.reviewStatus === "pending" : t === "rejected" ? r.reviewStatus === "rejected" : r.reviewStatus === "approved" && r.active === (t === "active");
  const rows = (riders ?? []).filter((r) => inTab(r, tab));
  const count = (t: Tab) => (riders ?? []).filter((r) => inTab(r, t)).length;

  return (
    <>
      <PageHeader
        title="Riders"
        description="Farmkeke's own riders. Add a rider with their profile; once it's checked and approved, they can be given deliveries."
        actions={
          me.can("riders.manage") ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setName("");
                setPhone("");
                setAreaIds([]);
                setVehicle("motorbike");
                setPlate("");
                setModel("");
                setAdding(true);
              }}
            >
              Add rider
            </Button>
          ) : null
        }
      />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "active", label: "Working", count: riders ? count("active") : undefined },
          { key: "pending", label: "Waiting for review", count: riders ? count("pending") : undefined },
          { key: "off", label: "Switched off", count: riders ? count("off") : undefined },
          { key: "rejected", label: "Not approved", count: riders ? count("rejected") : undefined },
        ]}
      />
      <Panel padded={false}>
        {riders === undefined ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Riders" columns={columns} rows={rows} rowKey={(r) => r._id} rowHref={(r) => adminRoutes.rider(r._id)} empty="No riders here." />
        )}
      </Panel>
      <ReasonDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a rider"
        description="Name, phone, vehicle and the areas they work in are what's needed. Photo, ID, guarantor and bank details can be added on the next page. They can take deliveries once the profile is approved."
        label="Note"
        optional
        confirmLabel="Add and continue"
        variant="lime"
        onConfirm={async (reason) => {
          if (!name.trim()) throw new FormError("Add the rider's name.");
          if (areaIds.length === 0) throw new FormError("Choose at least one area they work in.");
          const id = (await create({
            name,
            phone,
            serviceAreaIds: areaIds,
            pendingReview: true,
            vehicleType: vehicle,
            plateNumber: plate || undefined,
            bikeModel: model || undefined,
            reason: reason || "New rider",
          })) as Id<"riders">;
          router.push(adminRoutes.rider(id));
        }}
      >
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />
        <SelectField label="Vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value as Vehicle)}>
          {(Object.keys(VEHICLE) as Vehicle[]).map((v) => (
            <option key={v} value={v}>
              {VEHICLE[v]}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="Plate number" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="OWR-123-AA" />
          <TextField label="Bike model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Bajaj Boxer 150" />
        </div>
        <AreaChecklist areas={areas ?? []} value={areaIds} onChange={setAreaIds} />
      </ReasonDialog>
    </>
  );
}
