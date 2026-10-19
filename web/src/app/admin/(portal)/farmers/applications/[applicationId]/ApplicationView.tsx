"use client";

// A-21 to A-25: one farmer application. Staff with farmers.approve approve it
// (which creates the farm and opens farmer mode in the app), ask for more on
// chosen sections and documents, or reject it with a date they can reapply.
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { DocumentGrid, History, HoursList, MapLink } from "@/components/admin/FarmBits";
import { FormError } from "@/components/admin/errors";
import { APPLICATION_STATUS, DOCUMENT_KIND, FARM_SIZE, FARM_TYPE, SEASON, SECTION } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Facts, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { ApplicationDetail, ApplicationSection } from "@/convex/returns/adminFarms";
import { dateTime, dayMonth, displayPhone } from "@/lib/format";

const SECTIONS: ApplicationSection[] = ["farm", "produce", "collection", "documents", "payout"];
const REAPPLY = [
  { days: 0, label: "Straight away" },
  { days: 7, label: "In 1 week" },
  { days: 30, label: "In 30 days" },
  { days: 90, label: "In 90 days" },
];

export function ApplicationView({ applicationId }: { applicationId: string }) {
  const me = useStaff();
  const id = applicationId as Id<"farmerApplications">;
  const data = useQuery(admin.farmerRequests.get, { applicationId: id }) as ApplicationDetail | null | undefined;
  const approve = useMutation(admin.farmerRequests.approve);
  const moreInfo = useMutation(admin.farmerRequests.requestMoreInfo);
  const reject = useMutation(admin.farmerRequests.reject);
  const [dialog, setDialog] = useState<"approve" | "info" | "reject" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // More information form
  const [sections, setSections] = useState<Set<ApplicationSection>>(new Set());
  const [redo, setRedo] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  // Reject form
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [reapply, setReapply] = useState(30);

  if (data === undefined) return <TableSkeleton />;
  if (data === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.applications, label: "Farmer applications" }} />
        <Notice tone="err">This application no longer exists.</Notice>
      </>
    );
  }
  const app = data.application;
  const canDecide = me.can("farmers.approve") && app.status === "submitted";
  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <>
      <PageHeader
        title={app.farmName ?? "Unnamed farm"}
        description={app.reference ? `Reference ${app.reference}` : undefined}
        back={{ href: adminRoutes.applications, label: "Farmer applications" }}
        actions={<StatusBadge map={APPLICATION_STATUS} status={app.status} />}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {app.moreInfo && app.status === "more_info" ? (
        <div className="mb-4">
          <Notice tone="pend">
            Asked for more on {app.moreInfo.sections.map((s) => SECTION[s]).join(", ")}: {app.moreInfo.note}
          </Notice>
        </div>
      ) : null}
      {app.rejection && app.status === "rejected" ? (
        <div className="mb-4">
          <Notice tone="err">
            Rejected: {app.rejection.reason}
            {app.rejection.note ? `. ${app.rejection.note}` : ""}. They can apply again from {dayMonth(app.rejection.reapplyAfter)}.
          </Notice>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Applicant">
            <Facts
              items={[
                { label: "Name", value: data.applicant?.name ?? "–" },
                { label: "Email", value: data.applicant?.email ?? "–" },
                { label: "Account phone", value: data.applicant?.phone ? displayPhone(data.applicant.phone) : "–" },
                { label: "Submitted", value: app.submittedAt ? dateTime(app.submittedAt) : "Not yet" },
              ]}
            />
          </Panel>
          <Panel title={SECTION.farm}>
            <Facts
              items={[
                { label: "Farm name", value: app.farmName ?? "–" },
                { label: "Farm phone", value: app.phone ? displayPhone(app.phone) : "–" },
                { label: "State and LGA", value: [app.lga, app.state].filter(Boolean).join(", ") || "–" },
                { label: "Address", value: app.address ?? "–" },
                { label: "Size", value: app.farmSize ? FARM_SIZE[app.farmSize] : "–" },
                { label: "Type", value: app.farmType ? FARM_TYPE[app.farmType] : "–" },
                { label: "Location", value: <MapLink lat={app.latitude} lng={app.longitude} /> },
              ]}
            />
          </Panel>
          <Panel title={SECTION.produce}>
            <Facts
              items={[
                { label: "Categories", value: data.categories.join(", ") || "–" },
                { label: "Main crops", value: app.mainCrops ?? "–" },
                { label: "Typical volume", value: app.typicalVolume ?? "–" },
                { label: "Seasons", value: app.seasons.map((s) => SEASON[s] ?? s).join(", ") || "–" },
              ]}
            />
          </Panel>
          <Panel title={SECTION.collection}>
            <Facts
              items={[
                { label: "Collection address", value: app.collectionAddress ?? "–" },
                { label: "Notice needed", value: app.leadTimeHours !== undefined ? `${app.leadTimeHours} hours` : "–" },
                { label: "Riders can collect", value: <HoursList hours={app.collectionHours} /> },
              ]}
            />
          </Panel>
          <Panel title={SECTION.payout}>
            <Facts
              items={[
                { label: "Bank", value: app.bankName ?? "–" },
                { label: "Account number", value: app.accountNumber ?? "–" },
                { label: "Account name", value: app.accountName ?? "–" },
              ]}
            />
          </Panel>
          <Panel title={SECTION.documents} description="Open each photo to check it at full size.">
            <DocumentGrid documents={data.documents} />
          </Panel>
          <Panel title="History">
            <History entries={data.history} />
          </Panel>
        </div>

        <Panel title="Decision" className="self-start m:order-first">
          {canDecide ? (
            <div className="flex flex-col gap-2.5">
              <Button variant="lime" fullWidth onClick={() => setDialog("approve")}>
                Approve
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setDialog("info")}>
                Ask for more
              </Button>
              <Button variant="danger" fullWidth onClick={() => setDialog("reject")}>
                Reject
              </Button>
              <p className="sm mt-1">Approving creates the farm. Farmer mode opens in their app, and they get a push and an email.</p>
            </div>
          ) : (
            <p className="sm">
              {app.status === "submitted"
                ? "Your role can't decide farmer applications."
                : app.status === "more_info"
                  ? "Waiting for the farmer to update and resubmit."
                  : `This application is ${APPLICATION_STATUS[app.status]?.[1].toLowerCase() ?? app.status}.`}
            </p>
          )}
        </Panel>
      </div>

      <ReasonDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${app.farmName ?? "this farm"}`}
        description="Check every section and document first. This can't be undone, but you can suspend a farm later."
        label="Why it's approved"
        confirmLabel="Approve"
        variant="lime"
        onConfirm={async (reason) => {
          await approve({ applicationId: id, reason });
          setDone("Approved. The farm is created and the farmer has been told.");
        }}
      />
      <ConfirmDialog
        open={dialog === "info"}
        onClose={() => setDialog(null)}
        title="Ask for more"
        description="The farmer sees which sections to fix and your note, then resubmits."
        confirmLabel="Send to the farmer"
        width={600}
        onConfirm={async () => {
          if (sections.size === 0) throw new FormError("Choose at least one section.");
          if (!note.trim()) throw new FormError("Add a note saying what to fix.");
          await moreInfo({
            applicationId: id,
            sections: [...sections],
            note,
            rejectDocumentIds: [...redo] as Id<"farmerDocuments">[],
          });
          setDone("Sent. The farmer will update their application.");
        }}
      >
        <fieldset className="m-0 border-0 p-0">
          <legend className="lbl">Sections to fix</legend>
          <div className="flex flex-col">
            {SECTIONS.map((s) => (
              <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input type="checkbox" className="size-5 accent-forest" checked={sections.has(s)} onChange={() => setSections(toggle(sections, s))} />
                {SECTION[s]}
              </label>
            ))}
          </div>
        </fieldset>
        {data.documents.length > 0 ? (
          <fieldset className="m-0 border-0 p-0">
            <legend className="lbl">Documents that need a new photo</legend>
            <div className="flex flex-col">
              {data.documents.map((d) => (
                <label key={d._id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" className="size-5 accent-forest" checked={redo.has(d._id)} onChange={() => setRedo(toggle(redo, d._id))} />
                  {DOCUMENT_KIND[d.kind]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <TextArea
          label="Note to the farmer"
          hint="Shown in their app and emailed. Saved in the audit log."
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={`Reject ${app.farmName ?? "this application"}`}
        description="The farmer is told why and when they can apply again. Their bank details are kept."
        confirmLabel="Reject"
        variant="danger"
        onConfirm={async () => {
          if (!rejectReason.trim()) throw new FormError("Add the reason.");
          await reject({ applicationId: id, reason: rejectReason, note: rejectNote, reapplyAfterDays: reapply });
          setDone("Rejected. The farmer has been told.");
        }}
      >
        <TextField label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} hint="One line, shown to the farmer." />
        <TextArea
          label="Note"
          labelNote="(optional)"
          rows={3}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
        <SelectField label="They can apply again" value={reapply} onChange={(e) => setReapply(Number(e.target.value))}>
          {REAPPLY.map((r) => (
            <option key={r.days} value={r.days}>
              {r.label}
            </option>
          ))}
        </SelectField>
      </ConfirmDialog>
    </>
  );
}
