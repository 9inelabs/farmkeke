"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, MemberBadge, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { MemberRow } from "@/convex/returns/admin";
import { dateTime } from "@/lib/format";

type Tab = "applications" | "team" | "ended";
const IN_TAB: Record<Tab, MemberRow["status"][]> = {
  applications: ["pending", "more_info"],
  team: ["approved"],
  ended: ["rejected", "deactivated", "email_unconfirmed"],
};

export function StaffView() {
  const rows = useQuery(admin.staff.listMembers, {}) as MemberRow[] | undefined;
  const [tab, setTab] = useState<Tab>("applications");
  const count = (t: Tab) => (rows ?? []).filter((r) => IN_TAB[t].includes(r.status)).length;
  const shown = (rows ?? []).filter((r) => IN_TAB[tab].includes(r.status));

  const columns: Column<MemberRow>[] = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <span className="flex flex-col">
          <span>{r.name}</span>
          <span className="text-xs font-normal text-subtle">{r.email}</span>
        </span>
      ),
    },
    { key: "job", label: "Job", render: (r) => r.jobTitle },
    { key: "role", label: "Role", render: (r) => r.role?.name ?? "–" },
    { key: "status", label: "Status", render: (r) => <MemberBadge status={r.status} /> },
    tab === "team"
      ? { key: "seen", label: "Last sign-in", render: (r) => (r.lastSignInAt ? dateTime(r.lastSignInAt) : "Never") }
      : { key: "applied", label: "Applied", render: (r) => dateTime(r.appliedAt) },
  ];

  return (
    <>
      <PageHeader
        title="Staff and applications"
        description="People apply from farmkeke.com/admin/apply. Approve them with a role, ask for more information, or reject them."
      />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "applications", label: "Applications", count: rows ? count("applications") : undefined },
          { key: "team", label: "Team", count: rows ? count("team") : undefined },
          { key: "ended", label: "Rejected and removed", count: rows ? count("ended") : undefined },
        ]}
      />
      <Panel padded={false}>
        {rows === undefined ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Staff"
            columns={columns}
            rows={shown}
            rowKey={(r) => r._id}
            rowHref={(r) => adminRoutes.member(r._id)}
            empty={tab === "applications" ? "No applications are waiting." : "Nobody here."}
          />
        )}
      </Panel>
    </>
  );
}
