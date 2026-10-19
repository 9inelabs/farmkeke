"use client";

// A-55 Rider profile: photo, ID, vehicle, guarantor and bank account, then a
// review. Approved riders can be switched on and off for dispatch.
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { History } from "@/components/admin/FarmBits";
import { PhotoUpload } from "@/components/admin/inputs";
import { ID_TYPE, ORDER_STATUS, RIDER_REVIEW, VEHICLE } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, Notice, PageHeader, Panel, Photo, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { IdType, RiderDetail, ServiceArea, Vehicle } from "@/convex/returns/adminOps";
import { dateTime, displayPhone } from "@/lib/format";
import { AreaChecklist } from "../AreaChecklist";

type Form = {
  name: string;
  phone: string;
  homeAddress: string;
  areaIds: Id<"serviceAreas">[];
  photo?: Id<"_storage">;
  idType: IdType | "";
  idNumber: string;
  idPhoto?: Id<"_storage">;
  vehicleType: Vehicle | "";
  plateNumber: string;
  gName: string;
  gPhone: string;
  gAddress: string;
  gRelationship: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export function RiderView({ riderId }: { riderId: string }) {
  const me = useStaff();
  const id = riderId as Id<"riders">;
  const r = useQuery(admin.riders.get, { riderId: id }) as RiderDetail | null | undefined;
  const areas = useQuery(admin.areas.listAllServiceAreas, {}) as ServiceArea[] | undefined;
  const banks = useQuery(admin.riders.banks, {}) as { code: string; name: string }[] | undefined;
  const saveProfile = useMutation(admin.riders.saveProfile);
  const update = useMutation(admin.riders.update);
  const review = useMutation(admin.riders.review);
  const setActive = useMutation(admin.riders.setActive);
  const [dialog, setDialog] = useState<"edit" | "approve" | "reject" | "toggle" | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (r === undefined) return <TableSkeleton />;
  if (r === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.riders, label: "Riders" }} />
        <Notice tone="err">This rider no longer exists.</Notice>
      </>
    );
  }
  const canManage = me.can("riders.manage");
  const openEdit = () => {
    setForm({
      name: r.name,
      phone: r.phone,
      homeAddress: r.homeAddress ?? "",
      areaIds: r.serviceAreas.map((a) => a._id),
      idType: r.idType ?? "",
      idNumber: r.idNumber ?? "",
      vehicleType: r.vehicleType ?? "",
      plateNumber: r.plateNumber ?? "",
      gName: r.guarantor?.name ?? "",
      gPhone: r.guarantor?.phone ?? "",
      gAddress: r.guarantor?.address ?? "",
      gRelationship: r.guarantor?.relationship ?? "",
      bankCode: r.bankCode ?? "",
      accountNumber: r.accountNumber ?? "",
      accountName: r.accountName ?? "",
    });
    setDialog("edit");
  };
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <PageHeader
        title={r.name}
        description={displayPhone(r.phone)}
        back={{ href: adminRoutes.riders, label: "Riders" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge map={RIDER_REVIEW} status={r.reviewStatus} />
            {r.reviewStatus === "approved" ? r.active ? <span className="badge b-ok">Working</span> : <span className="badge b-grey">Switched off</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {r.reviewNote ? (
        <div className="mb-4">
          <Notice tone={r.reviewStatus === "rejected" ? "err" : "info"}>
            Review note{r.reviewedBy ? ` from ${r.reviewedBy}` : ""}: {r.reviewNote}
          </Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Rider" actions={canManage ? <Button size="sm" variant="ghost" onClick={openEdit}>Edit profile</Button> : null}>
            <div className="flex flex-wrap items-start gap-5">
              <Photo url={r.photoUrl} alt={`${r.name}'s photo`} className="size-28 flex-none rounded-2xl" />
              <div className="min-w-[240px] flex-1">
                <Facts
                  items={[
                    { label: "Phone", value: displayPhone(r.phone) },
                    { label: "Home address", value: r.homeAddress ?? "Not added" },
                    { label: "Areas", value: r.serviceAreas.map((a) => a.name).join(", ") || "None" },
                    { label: "Added", value: dateTime(r._creationTime) },
                  ]}
                />
              </div>
            </div>
          </Panel>
          <Panel title="ID">
            <div className="flex flex-wrap items-start gap-5">
              {r.idPhotoUrl ? (
                <a href={r.idPhotoUrl} target="_blank" rel="noreferrer" aria-label="Open ID photo full size (new tab)">
                  <Photo url={r.idPhotoUrl} alt="ID document" className="h-28 w-44 flex-none rounded-xl" />
                </a>
              ) : (
                <Photo url={null} alt="" className="h-28 w-44 flex-none rounded-xl" />
              )}
              <div className="min-w-[240px] flex-1">
                <Facts
                  items={[
                    { label: "Type", value: r.idType ? ID_TYPE[r.idType] : "Not added" },
                    { label: "Number", value: r.idNumber ?? "Not added" },
                  ]}
                />
              </div>
            </div>
          </Panel>
          <Panel title="Vehicle">
            <Facts
              items={[
                { label: "Type", value: r.vehicleType ? VEHICLE[r.vehicleType] : "Not added" },
                { label: "Plate number", value: r.plateNumber ?? (r.vehicleType === "bicycle" ? "Not needed" : "Not added") },
              ]}
            />
          </Panel>
          <Panel title="Guarantor">
            {r.guarantor ? (
              <Facts
                items={[
                  { label: "Name", value: r.guarantor.name },
                  { label: "Phone", value: displayPhone(r.guarantor.phone) },
                  { label: "Relationship", value: r.guarantor.relationship || "–" },
                  { label: "Address", value: r.guarantor.address || "–" },
                ]}
              />
            ) : (
              <p className="sm">Not added.</p>
            )}
          </Panel>
          <Panel title="Bank account" description="Where the rider is paid. Check the name matches the rider or their guarantor.">
            <Facts
              items={[
                { label: "Bank", value: r.bankName ?? "Not added" },
                { label: "Account number", value: r.accountNumber ?? "–" },
                { label: "Account name", value: r.accountName ?? "–" },
              ]}
            />
          </Panel>
          <Panel title="Recent deliveries">
            {r.recentOrders.length === 0 ? (
              <p className="sm">None yet.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {r.recentOrders.map((o) => (
                  <li key={o._id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                    {me.can("orders.view") ? (
                      <Link href={adminRoutes.order(o._id)} className="font-semibold">
                        {o.number}
                      </Link>
                    ) : (
                      <span className="font-semibold">{o.number}</span>
                    )}
                    <span className="flex items-center gap-2 text-sm text-muted">
                      <StatusBadge map={ORDER_STATUS} status={o.status} />
                      {dateTime(o.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="History">
            <History entries={r.history} />
          </Panel>
        </div>

        <Panel title="Review" className="self-start m:order-first">
          {r.missing.length > 0 ? (
            <div className="mb-4">
              <Notice tone="pend">Still missing: {r.missing.join(", ")}.</Notice>
            </div>
          ) : null}
          {!canManage ? (
            <p className="sm">Your role can&apos;t review riders.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {r.reviewStatus !== "approved" ? (
                <Button variant="lime" fullWidth onClick={() => setDialog("approve")}>
                  Approve rider
                </Button>
              ) : (
                <Button variant={r.active ? "danger" : "dark"} fullWidth onClick={() => setDialog("toggle")}>
                  {r.active ? "Switch off" : "Switch on"}
                </Button>
              )}
              {r.reviewStatus !== "rejected" ? (
                <Button variant="ghost" fullWidth onClick={() => setDialog("reject")}>
                  {r.reviewStatus === "approved" ? "Withdraw approval" : "Don't approve"}
                </Button>
              ) : null}
              <Button variant="ghost" fullWidth onClick={openEdit}>
                Edit profile
              </Button>
            </div>
          )}
        </Panel>
      </div>

      {form ? (
        <ReasonDialog
          open={dialog === "edit"}
          onClose={() => setDialog(null)}
          title={`Edit ${r.name}`}
          label="Note"
          optional
          confirmLabel="Save profile"
          variant="lime"
          onConfirm={async (reason) => {
            const why = reason || "Profile updated";
            if (form.vehicleType && form.vehicleType !== "bicycle" && !form.plateNumber.trim()) throw new FormError("Add the plate number.");
            const guarantorStarted = form.gName || form.gPhone || form.gAddress || form.gRelationship;
            if (guarantorStarted && (!form.gName.trim() || !form.gPhone.trim())) throw new FormError("Add the guarantor's name and phone.");
            const bankStarted = form.bankCode || form.accountNumber || form.accountName;
            if (bankStarted && (!form.bankCode || form.accountNumber.replace(/\D/g, "").length !== 10 || !form.accountName.trim()))
              throw new FormError("Choose the bank and add the 10-digit account number and the account name.");
            await update({ riderId: id, name: form.name, phone: form.phone, serviceAreaIds: form.areaIds, reason: why });
            await saveProfile({
              riderId: id,
              homeAddress: form.homeAddress,
              ...(form.photo ? { photoStorageId: form.photo } : {}),
              ...(form.idPhoto ? { idPhotoStorageId: form.idPhoto } : {}),
              ...(form.idType ? { idType: form.idType } : {}),
              idNumber: form.idNumber,
              ...(form.vehicleType ? { vehicleType: form.vehicleType } : {}),
              plateNumber: form.plateNumber,
              ...(guarantorStarted
                ? { guarantor: { name: form.gName, phone: form.gPhone, address: form.gAddress, relationship: form.gRelationship } }
                : {}),
              ...(bankStarted ? { bankCode: form.bankCode, accountNumber: form.accountNumber, accountName: form.accountName } : {}),
              reason: why,
            });
            setDone("Profile saved.");
          }}
        >
          <h3 className="h3 m-0">Rider</h3>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <TextField label="Full name" value={form.name} onChange={set("name")} />
            <TextField label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <TextField label="Home address" value={form.homeAddress} onChange={set("homeAddress")} />
          <PhotoUpload label="Rider photo" currentUrl={r.photoUrl} onUploaded={(photo) => setForm((f) => (f ? { ...f, photo } : f))} />
          <AreaChecklist areas={areas ?? []} value={form.areaIds} onChange={(areaIds) => setForm((f) => (f ? { ...f, areaIds } : f))} />

          <h3 className="h3 m-0 mt-2">ID</h3>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <SelectField label="ID type" value={form.idType} onChange={set("idType")}>
              <option value="">Choose</option>
              {Object.entries(ID_TYPE).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField label="ID number" value={form.idNumber} onChange={set("idNumber")} />
          </div>
          <PhotoUpload label="Photo of the ID" currentUrl={r.idPhotoUrl} onUploaded={(idPhoto) => setForm((f) => (f ? { ...f, idPhoto } : f))} />

          <h3 className="h3 m-0 mt-2">Vehicle</h3>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <SelectField label="Vehicle" value={form.vehicleType} onChange={set("vehicleType")}>
              <option value="">Choose</option>
              {Object.entries(VEHICLE).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField label="Plate number" value={form.plateNumber} onChange={set("plateNumber")} hint="Not needed for bicycles." />
          </div>

          <h3 className="h3 m-0 mt-2">Guarantor</h3>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <TextField label="Name" value={form.gName} onChange={set("gName")} />
            <TextField label="Phone" type="tel" value={form.gPhone} onChange={set("gPhone")} />
            <TextField label="Relationship" value={form.gRelationship} onChange={set("gRelationship")} placeholder="Uncle, employer…" />
            <TextField label="Address" value={form.gAddress} onChange={set("gAddress")} />
          </div>

          <h3 className="h3 m-0 mt-2">Bank account</h3>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <SelectField label="Bank" value={form.bankCode} onChange={set("bankCode")}>
              <option value="">Choose a bank</option>
              {(banks ?? []).map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Account number" inputMode="numeric" value={form.accountNumber} onChange={set("accountNumber")} maxLength={10} />
          </div>
          <TextField label="Account name" value={form.accountName} onChange={set("accountName")} />
        </ReasonDialog>
      ) : null}
      <ReasonDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${r.name}`}
        description="Check the photo, ID and guarantor first. Once approved, the rider can be given deliveries."
        label="Note"
        optional
        confirmLabel="Approve rider"
        variant="lime"
        onConfirm={async (note) => {
          await review({ riderId: id, approve: true, note });
          setDone("Rider approved and switched on.");
        }}
      />
      <ReasonDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={r.reviewStatus === "approved" ? `Withdraw ${r.name}'s approval` : `Don't approve ${r.name}`}
        description="They can't be given deliveries. You can approve them later if things change."
        confirmLabel={r.reviewStatus === "approved" ? "Withdraw approval" : "Don't approve"}
        variant="danger"
        onConfirm={async (note) => {
          await review({ riderId: id, approve: false, note });
          setDone("Saved. The rider can't be given deliveries.");
        }}
      />
      <ReasonDialog
        open={dialog === "toggle"}
        onClose={() => setDialog(null)}
        title={r.active ? `Switch off ${r.name}` : `Switch on ${r.name}`}
        description={r.active ? "They won't show on the dispatch board. Deliveries they already have carry on." : "They show on the dispatch board again."}
        confirmLabel={r.active ? "Switch off" : "Switch on"}
        variant={r.active ? "danger" : "dark"}
        onConfirm={async (reason) => {
          await setActive({ riderId: id, active: !r.active, reason });
          setDone(r.active ? "Rider switched off." : "Rider switched on.");
        }}
      />
    </>
  );
}
