"use client";

import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { auditLabel, TARGETS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { AuditRow } from "@/convex/returns/admin";
import { dateTime } from "@/lib/format";

const target = (r: AuditRow) => {
  const name = TARGETS[r.targetTable] ?? r.targetTable;
  if (r.targetTable === "staffMembers") return <Link href={adminRoutes.member(r.targetId)}>{name}</Link>;
  if (r.targetTable === "staffRoles") return <Link href={adminRoutes.role(r.targetId)}>{name}</Link>;
  return name;
};

const columns: Column<AuditRow>[] = [
  { key: "what", label: "What", render: (r) => auditLabel(r.action) },
  { key: "who", label: "Who", render: (r) => r.actor },
  { key: "on", label: "On", render: target },
  {
    key: "reason",
    label: "Reason",
    className: "min-w-[240px]",
    render: (r) => (
      <span className="block">
        {r.reason}
        {r.details && r.details !== "{}" ? (
          <details className="mt-1 text-xs text-subtle">
            <summary className="cursor-pointer">Details</summary>
            <code className="mt-1 block font-mono break-all whitespace-pre-wrap">{r.details}</code>
          </details>
        ) : null}
      </span>
    ),
  },
  { key: "when", label: "When", render: (r) => dateTime(r.at), className: "whitespace-nowrap" },
];

export function AuditView() {
  const { results, status, loadMore } = usePaginatedQuery(admin.staff.listAuditLog, {}, { initialNumItems: 30 });
  const rows = results as AuditRow[];
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every sensitive action on the portal, with who did it and why. Entries can't be edited or deleted."
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Audit log" columns={columns} rows={rows} rowKey={(r) => r._id} empty="No actions yet." />
        )}
      </Panel>
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => loadMore(30)} loading={status === "LoadingMore"}>
            Show older
          </Button>
        </div>
      ) : null}
    </>
  );
}
