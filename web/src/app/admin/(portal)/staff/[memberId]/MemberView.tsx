"use client";

// A-89 One applicant or staff member: their application, decisions and
// history. People with staff.manage approve (choosing the role), ask for more
// information, reject, change the role or remove access. Each is emailed to
// the person and saved in the audit log.
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { auditLabel } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, MemberBadge, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { MemberDetail, RoleRow } from "@/convex/returns/admin";
import { dateTime, displayPhone } from "@/lib/format";

type Dialog = "approve" | "info" | "reject" | "role" | "remove" | "restore" | null;

export function MemberView({ memberId }: { memberId: string }) {
  const me = useStaff();
  const id = memberId as Id<"staffMembers">;
  const member = useQuery(admin.staff.getMember, { memberId: id }) as MemberDetail | null | undefined;
  const canManage = me.can("staff.manage");
  const roles = useQuery(admin.staff.listRoles, canManage ? {} : "skip") as RoleRow[] | undefined;
  const approve = useMutation(admin.staff.approve);
  const reject = useMutation(admin.staff.reject);
  const requestInfo = useMutation(admin.staff.requestInfo);
  const changeRole = useMutation(admin.staff.changeRole);
  const setActive = useMutation(admin.staff.setActive);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [roleId, setRoleId] = useState("");
  const [done, setDone] = useState<string | null>(null);

  if (member === undefined) return <TableSkeleton />;
  if (member === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.staff, label: "Staff and applications" }} />
        <Notice tone="err">This application no longer exists.</Notice>
      </>
    );
  }

  const isSelf = member.userId === me.userId;
  const isFounder = member.role?.key === "founder";
  const assignable = (roles ?? []).filter(
    (r) =>
      r.key !== "founder" &&
      (me.isFounder || (!r.permissions.includes("staff.manage") && !r.permissions.includes("roles.manage"))),
  );
  const rolePicker = (
    <SelectField label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} hint="What this person can see and do.">
      <option value="">Choose a role</option>
      {assignable.map((r) => (
        <option key={r._id} value={r._id}>
          {r.name}: {r.description}
        </option>
      ))}
    </SelectField>
  );
  const open = (d: Dialog) => {
    setDone(null);
    setRoleId(d === "role" ? "" : (member.role?.id ?? ""));
    setDialog(d);
  };
  const needRole = () => {
    if (!roleId) throw new FormError("Choose a role first.");
    return roleId as Id<"staffRoles">;
  };
  const waiting = member.status === "pending" || member.status === "more_info";

  return (
    <>
      <PageHeader
        title={member.name}
        description={member.email}
        back={{ href: adminRoutes.staff, label: "Staff and applications" }}
        actions={<MemberBadge status={member.status} />}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_360px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title={member.status === "approved" || member.status === "deactivated" ? "Staff member" : "Application"}>
            <Facts
              items={[
                { label: "Job", value: member.jobTitle },
                { label: "Phone", value: member.phone ? displayPhone(member.phone) : "Not given" },
                { label: "Role", value: member.role?.name ?? "None yet" },
                { label: "Applied", value: dateTime(member.appliedAt) },
                { label: "Email confirmed", value: member.emailConfirmedAt ? dateTime(member.emailConfirmedAt) : "Not yet" },
                { label: "Last sign-in", value: member.lastSignInAt ? dateTime(member.lastSignInAt) : "Never" },
                ...(member.decidedAt
                  ? [{ label: "Decided", value: `${dateTime(member.decidedAt)}${member.decidedBy ? ` by ${member.decidedBy}` : ""}` }]
                  : []),
              ]}
            />
            {member.note ? (
              <div className="mt-5 rounded-xl border-l-4 border-lime bg-tint px-4 py-3">
                <p className="cap font-semibold">{member.name} wrote</p>
                <p className="mt-1 text-[15px] whitespace-pre-line text-ink">{member.note}</p>
              </div>
            ) : null}
            {member.decisionNote ? (
              <div className="mt-4">
                <Notice tone={member.status === "more_info" ? "pend" : member.status === "approved" ? "info" : "err"}>
                  {member.status === "more_info" ? "Question sent: " : "Note: "}
                  {member.decisionNote}
                </Notice>
              </div>
            ) : null}
            {member.invitePending ? (
              <div className="mt-4">
                <Notice tone="pend">They haven&apos;t made their password yet.</Notice>
              </div>
            ) : null}
          </Panel>
          <Panel title="History" description="Decisions about this person, newest first.">
            {member.history.length === 0 ? (
              <p className="sm">Nothing yet.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {member.history.map((h) => (
                  <li key={h._id} className="text-sm leading-5">
                    <p className="font-semibold text-ink">{auditLabel(h.action)}</p>
                    <p className="text-muted">
                      {h.by} · {dateTime(h.at)}
                    </p>
                    <p className="mt-0.5 text-ink-2">{h.reason}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <Panel title="Actions" className="self-start m:order-first">
          {!canManage ? (
            <p className="sm">Only people who can approve staff can change this.</p>
          ) : isSelf ? (
            <p className="sm">You can&apos;t change your own access or role.</p>
          ) : isFounder ? (
            <p className="sm">The Founder&apos;s access and role can&apos;t be changed.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {waiting ? (
                <>
                  <Button variant="lime" fullWidth onClick={() => open("approve")}>
                    Approve with a role
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => open("info")}>
                    Ask for more information
                  </Button>
                  <Button variant="danger" fullWidth onClick={() => open("reject")}>
                    Reject
                  </Button>
                </>
              ) : null}
              {member.status === "email_unconfirmed" ? (
                <>
                  <p className="sm mb-1">They haven&apos;t confirmed their email, so this isn&apos;t ready to review.</p>
                  <Button variant="ghost" fullWidth onClick={() => open("reject")}>
                    Close this application
                  </Button>
                </>
              ) : null}
              {member.status === "approved" ? (
                <>
                  <Button variant="dark" fullWidth onClick={() => open("role")}>
                    Change role
                  </Button>
                  <Button variant="danger" fullWidth onClick={() => open("remove")}>
                    Remove access
                  </Button>
                </>
              ) : null}
              {member.status === "deactivated" ? (
                <Button variant="dark" fullWidth onClick={() => open("restore")}>
                  Give access back
                </Button>
              ) : null}
              {member.status === "rejected" ? <p className="sm">Rejected. They can apply again from the portal.</p> : null}
            </div>
          )}
        </Panel>
      </div>

      <ReasonDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${member.name}`}
        description="They get an email with their role and can sign in straight away."
        label="Note"
        hint="Saved in the audit log."
        optional
        confirmLabel="Approve"
        variant="lime"
        onConfirm={async (note) => {
          await approve({ memberId: id, roleId: needRole(), note: note || undefined });
          setDone(`${member.name} is approved. We've emailed them.`);
        }}
      >
        {rolePicker}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "info"}
        onClose={() => setDialog(null)}
        title="Ask for more information"
        description="We email your question. They answer from the portal, and it comes back to you."
        label="Your question"
        hint="Emailed to them and saved in the audit log."
        confirmLabel="Send question"
        onConfirm={async (message) => {
          await requestInfo({ memberId: id, message });
          setDone("Question sent.");
        }}
      />
      <ReasonDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={`Reject ${member.name}`}
        description={member.status === "email_unconfirmed" ? undefined : "We email them the reason. They can apply again later."}
        hint={member.status === "email_unconfirmed" ? "Saved in the audit log." : "Emailed to them and saved in the audit log."}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={async (reason) => {
          await reject({ memberId: id, reason });
          setDone("Application rejected.");
        }}
      />
      <ReasonDialog
        open={dialog === "role"}
        onClose={() => setDialog(null)}
        title="Change role"
        description={`${member.name} is ${member.role?.name ?? "without a role"} now. We email them the change.`}
        hint="Emailed to them and saved in the audit log."
        confirmLabel="Change role"
        onConfirm={async (reason) => {
          await changeRole({ memberId: id, roleId: needRole(), reason });
          setDone("Role changed.");
        }}
      >
        {rolePicker}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={`Remove ${member.name}'s access`}
        description="They're signed out of the portal at once. Their shopping account still works."
        hint="Emailed to them and saved in the audit log."
        confirmLabel="Remove access"
        variant="danger"
        onConfirm={async (reason) => {
          await setActive({ memberId: id, active: false, reason });
          setDone("Access removed.");
        }}
      />
      <ReasonDialog
        open={dialog === "restore"}
        onClose={() => setDialog(null)}
        title={`Give ${member.name} access again`}
        description={`They get their ${member.role?.name ?? "previous"} role back.`}
        hint="Emailed to them and saved in the audit log."
        confirmLabel="Give access back"
        onConfirm={async (reason) => {
          await setActive({ memberId: id, active: true, reason });
          setDone("Access is back.");
        }}
      />
    </>
  );
}
