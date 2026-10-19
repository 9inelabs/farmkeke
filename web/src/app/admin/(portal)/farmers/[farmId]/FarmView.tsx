"use client";

// A-31 to A-33: one farm. Staff with farmers.manage can edit its details,
// mark it trusted (its listings skip review), suspend or reactivate it, and
// review its documents.
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { DocumentGrid, History, HoursList } from "@/components/admin/FarmBits";
import { FormError } from "@/components/admin/errors";
import { DAYS, DOCUMENT_KIND, FARM_SIZE, FARM_TYPE, LISTING_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Facts, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { FarmDetail, FarmDocument, ListingRow } from "@/convex/returns/adminFarms";
import { dateTime, displayPhone } from "@/lib/format";

type Dialog = "edit" | "trust" | "suspend" | null;

export function FarmView({ farmId }: { farmId: string }) {
  const me = useStaff();
  const id = farmId as Id<"farms">;
  const data = useQuery(admin.farmers.get, { farmId: id }) as FarmDetail | null | undefined;
  const products = usePaginatedQuery(admin.listings.list, me.can("listings.view") ? { farmId: id, status: "live" } : "skip", {
    initialNumItems: 10,
  });
  const setSuspended = useMutation(admin.farmers.setSuspended);
  const setTrusted = useMutation(admin.farmers.setTrusted);
  const updateDetails = useMutation(admin.farmers.updateDetails);
  const reviewDocument = useMutation(admin.farmers.reviewDocument);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [docAction, setDocAction] = useState<{ doc: FarmDocument; status: "approved" | "rejected" | "expired" } | null>(null);
  const [docNote, setDocNote] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", state: "", lga: "", reason: "" });
  const [done, setDone] = useState<string | null>(null);

  if (data === undefined) return <TableSkeleton />;
  if (data === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.farms, label: "Farms" }} />
        <Notice tone="err">This farm no longer exists.</Notice>
      </>
    );
  }
  const farm = data.farm;
  const canManage = me.can("farmers.manage");
  const suspended = farm.status === "suspended";
  const openEdit = () => {
    setForm({ name: farm.name, phone: farm.phone, address: farm.address, state: farm.state, lga: farm.lga, reason: "" });
    setDialog("edit");
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        title={farm.name}
        description={`${farm.lga}, ${farm.state}`}
        back={{ href: adminRoutes.farms, label: "Farms" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            {suspended ? <span className="badge b-err">Suspended</span> : <span className="badge b-ok">Active</span>}
            {farm.trusted ? <span className="badge b-fresh">Trusted</span> : null}
            {farm.holidayMode ? <span className="badge b-grey">On holiday</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {suspended && farm.suspendedReason ? (
        <div className="mb-4">
          <Notice tone="err">Suspended: {farm.suspendedReason}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Owner">
            <Facts
              items={[
                { label: "Name", value: data.owner?.name ?? "–" },
                { label: "Email", value: data.owner?.email ?? "–" },
                { label: "Phone", value: data.owner?.phone ? displayPhone(data.owner.phone) : "–" },
                { label: "Approved", value: dateTime(farm._creationTime) },
              ]}
            />
          </Panel>
          <Panel title="Farm">
            <Facts
              items={[
                { label: "Farm phone", value: displayPhone(farm.phone) },
                { label: "Address", value: farm.address },
                { label: "Size", value: FARM_SIZE[farm.farmSize] ?? farm.farmSize },
                { label: "Type", value: FARM_TYPE[farm.farmType] ?? farm.farmType },
                { label: "Profile set up", value: farm.profileConfirmedAt ? dateTime(farm.profileConfirmedAt) : "Not yet" },
                { label: "Collection set up", value: farm.collectionConfirmedAt ? dateTime(farm.collectionConfirmedAt) : "Not yet" },
              ]}
            />
            {farm.description ? <p className="p mt-4">{farm.description}</p> : null}
          </Panel>
          <Panel title="Collection and availability">
            <Facts
              items={[
                { label: "Collection address", value: farm.collectionAddress },
                { label: "Notice needed", value: `${farm.leadTimeHours} hours` },
                { label: "Riders can collect", value: <HoursList hours={farm.collectionHours} /> },
                { label: "Open days", value: farm.openDays.map((d) => DAYS[d].slice(0, 3)).join(", ") || "None" },
              ]}
            />
          </Panel>
          <Panel title="Payout account">
            <Facts
              items={[
                { label: "Bank", value: farm.bankName },
                { label: "Account number", value: farm.accountNumber },
                { label: "Account name", value: farm.accountName },
              ]}
            />
          </Panel>
          <Panel title="Documents">
            <DocumentGrid
              documents={data.documents}
              actions={
                canManage
                  ? (d) => (
                      <div className="flex flex-wrap gap-2">
                        {d.status !== "approved" ? (
                          <Button size="sm" variant="ghost" onClick={() => setDocAction({ doc: d, status: "approved" })}>
                            Approve
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => setDocAction({ doc: d, status: "rejected" })}>
                          Ask for a new photo
                        </Button>
                        {d.status !== "expired" ? (
                          <Button size="sm" variant="ghost" onClick={() => setDocAction({ doc: d, status: "expired" })}>
                            Mark expired
                          </Button>
                        ) : null}
                      </div>
                    )
                  : undefined
              }
            />
          </Panel>
          {me.can("listings.view") ? (
            <Panel title="Live products" actions={<Link href={`${adminRoutes.products}?farm=${farm._id}`} className="text-sm font-semibold">See all</Link>}>
              {products.status === "LoadingFirstPage" ? (
                <p className="sm">Loading…</p>
              ) : products.results.length === 0 ? (
                <p className="sm">No live products.</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {(products.results as ListingRow[]).map((l) => (
                    <li key={l._id} className="flex min-h-11 items-center justify-between gap-3 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                      <Link href={adminRoutes.product(l._id)} className="font-semibold">
                        {l.name}
                      </Link>
                      {l.outOfStock ? <span className="badge b-grey">Sold out</span> : <StatusBadge map={LISTING_STATUS} status={l.status} />}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
          <Panel title="Activity">
            <History entries={data.activity} />
          </Panel>
        </div>

        <Panel title="Actions" className="self-start m:order-first">
          {canManage ? (
            <div className="flex flex-col gap-2.5">
              <Button variant="ghost" fullWidth onClick={openEdit}>
                Edit details
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setDialog("trust")}>
                {farm.trusted ? "Remove trusted" : "Mark as trusted"}
              </Button>
              <Button variant={suspended ? "dark" : "danger"} fullWidth onClick={() => setDialog("suspend")}>
                {suspended ? "Reactivate farm" : "Suspend farm"}
              </Button>
              <p className="sm mt-1">Trusted farms&apos; new products go live without review.</p>
            </div>
          ) : (
            <p className="sm">Your role can&apos;t change farms.</p>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        title="Edit farm details"
        description="Fix details on the farmer's behalf. They see the change in their app."
        confirmLabel="Save changes"
        width={600}
        onConfirm={async () => {
          if (!form.reason.trim()) throw new FormError("Add a reason. It's saved in the audit log.");
          await updateDetails({
            farmId: id,
            name: form.name,
            phone: form.phone !== farm.phone ? form.phone : undefined,
            address: form.address,
            state: form.state,
            lga: form.lga,
            reason: form.reason,
          });
          setDone("Farm details saved.");
        }}
      >
        <TextField label="Farm name" value={form.name} onChange={set("name")} />
        <TextField label="Farm phone" value={form.phone} onChange={set("phone")} hint="Also the number the farmer signs in with." />
        <TextField label="Address" value={form.address} onChange={set("address")} />
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="State" value={form.state} onChange={set("state")} />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} />
        </div>
        <TextArea label="Reason" hint="Saved in the audit log." rows={3} value={form.reason} onChange={set("reason")} className="[&_textarea]:h-auto [&_textarea]:py-3" />
      </ConfirmDialog>
      <ReasonDialog
        open={dialog === "trust"}
        onClose={() => setDialog(null)}
        title={farm.trusted ? "Remove trusted" : "Mark as trusted"}
        description={farm.trusted ? "Their new products will wait for review again." : "Their new products will go live without review."}
        confirmLabel={farm.trusted ? "Remove trusted" : "Mark as trusted"}
        onConfirm={async (reason) => {
          await setTrusted({ farmId: id, trusted: !farm.trusted, reason });
          setDone(farm.trusted ? "No longer trusted." : "Marked as trusted.");
        }}
      />
      <ReasonDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        title={suspended ? `Reactivate ${farm.name}` : `Suspend ${farm.name}`}
        description={
          suspended
            ? "Their products show in the shop again and they can take orders."
            : "Their products disappear from the shop and they can't take new orders. Orders already placed carry on."
        }
        hint={suspended ? "Saved in the audit log." : "Shown to the farmer in their app, and saved in the audit log."}
        confirmLabel={suspended ? "Reactivate" : "Suspend"}
        variant={suspended ? "dark" : "danger"}
        onConfirm={async (reason) => {
          await setSuspended({ farmId: id, suspended: !suspended, reason });
          setDone(suspended ? "Farm reactivated." : "Farm suspended.");
        }}
      />
      <ReasonDialog
        open={docAction !== null}
        onClose={() => {
          setDocAction(null);
          setDocNote("");
        }}
        title={
          docAction
            ? `${docAction.status === "approved" ? "Approve" : docAction.status === "rejected" ? "Ask for a new photo of" : "Mark expired:"} ${DOCUMENT_KIND[docAction.doc.kind].toLowerCase()}`
            : ""
        }
        description={docAction?.status === "approved" ? undefined : "The farmer sees your note in their app and uploads a new photo."}
        confirmLabel="Save"
        variant={docAction?.status === "approved" ? "lime" : "dark"}
        onConfirm={async (reason) => {
          if (!docAction) return;
          if (docAction.status !== "approved" && !docNote.trim()) throw new FormError("Tell the farmer what to fix.");
          await reviewDocument({ documentId: docAction.doc._id, status: docAction.status, note: docNote || undefined, reason });
          setDocNote("");
          setDone("Document updated.");
        }}
      >
        {docAction && docAction.status !== "approved" ? (
          <TextField label="Note to the farmer" value={docNote} onChange={(e) => setDocNote(e.target.value)} />
        ) : null}
      </ReasonDialog>
    </>
  );
}
