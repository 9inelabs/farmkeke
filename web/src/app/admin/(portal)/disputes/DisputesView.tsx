"use client";

// A-70 Problem reports: shoppers report a problem before confirming receipt;
// the order's money stays held until staff decide.
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { DISPUTE_STATUS, OUTCOME } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { DisputeRow, DisputeStatus } from "@/convex/returns/adminCare";
import { dateTime, naira } from "@/lib/format";

const columns: Column<DisputeRow>[] = [
  {
    key: "n",
    label: "Report",
    render: (d) => (
      <span className="flex flex-col">
        <span>
          {d.number}
          {d.unread ? <span className="ml-2 badge b-err">New message</span> : null}
        </span>
        <span className="text-xs font-normal text-subtle">Order {d.orderNumber}</span>
      </span>
    ),
  },
  { key: "what", label: "Problem", render: (d) => d.reasonLabel },
  { key: "who", label: "Shopper and farm", render: (d) => `${d.consumerName} · ${d.farmName}` },
  { key: "amount", label: "Amount", render: (d) => naira(d.amountKobo) },
  {
    key: "status",
    label: "Status",
    render: (d) => (
      <span className="flex flex-wrap gap-1.5">
        <StatusBadge map={DISPUTE_STATUS} status={d.status} />
        {d.farmReplyOverdue && d.status === "open" ? <span className="badge b-err">Farm reply overdue</span> : null}
        {d.outcome ? <span className="badge b-grey">{OUTCOME[d.outcome]}</span> : null}
      </span>
    ),
  },
  { key: "who2", label: "Assigned", render: (d) => d.assignee?.name ?? "Nobody" },
  { key: "at", label: "Reported", render: (d) => dateTime(d.reportedAt), className: "whitespace-nowrap" },
];

export function DisputesView() {
  const [tab, setTab] = useState<DisputeStatus>("open");
  const { results, status, loadMore } = usePaginatedQuery(admin.disputes.list, { status: tab }, { initialNumItems: 30 });
  return (
    <>
      <PageHeader
        title="Problem reports"
        description="The money stays held until you decide. The farm has a set time to reply; you can decide without their reply once it's passed."
      />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "open", label: "Waiting for the farm" },
          { key: "farmer_responded", label: "Farm replied" },
          { key: "resolved", label: "Decided" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Problem reports"
            columns={columns}
            rows={results as DisputeRow[]}
            rowKey={(d) => d._id}
            rowHref={(d) => adminRoutes.dispute(d._id)}
            empty="No problem reports here."
          />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(30)} />
    </>
  );
}
