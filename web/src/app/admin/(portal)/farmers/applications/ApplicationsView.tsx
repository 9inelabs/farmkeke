"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { APPLICATION_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { ApplicationRow, ApplicationStatus } from "@/convex/returns/adminFarms";
import { dateTime } from "@/lib/format";

type Tab = Exclude<ApplicationStatus, "draft">;

const columns: Column<ApplicationRow>[] = [
  { key: "farm", label: "Farm", render: (r) => r.farmName ?? "Unnamed farm" },
  { key: "ref", label: "Reference", render: (r) => r.reference ?? "–" },
  { key: "where", label: "Location", render: (r) => [r.lga, r.state].filter(Boolean).join(", ") || "–" },
  { key: "status", label: "Status", render: (r) => <StatusBadge map={APPLICATION_STATUS} status={r.status} /> },
  { key: "sent", label: "Submitted", render: (r) => (r.submittedAt ? dateTime(r.submittedAt) : "–"), className: "whitespace-nowrap" },
];

export function ApplicationsView() {
  const [tab, setTab] = useState<Tab>("submitted");
  const counts = useQuery(admin.farmerRequests.counts, {}) as { submitted: number; more_info: number } | undefined;
  const { results, status, loadMore } = usePaginatedQuery(admin.farmerRequests.list, { status: tab }, { initialNumItems: 30 });
  return (
    <>
      <PageHeader
        title="Farmer applications"
        description="People apply to sell from the Farmkeke app. Check their details and documents, then approve, ask for more, or reject."
      />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "submitted", label: "Waiting for review", count: counts?.submitted },
          { key: "more_info", label: "More information asked", count: counts?.more_info },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Farmer applications"
            columns={columns}
            rows={results as ApplicationRow[]}
            rowKey={(r) => r._id}
            rowHref={(r) => adminRoutes.application(r._id)}
            empty={tab === "submitted" ? "No applications are waiting." : "Nothing here."}
          />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(30)} />
    </>
  );
}
