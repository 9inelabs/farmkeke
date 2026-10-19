"use client";

import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { TicketRow } from "@/convex/returns/adminCare";
import { dateTime } from "@/lib/format";

const columns: Column<TicketRow>[] = [
  {
    key: "from",
    label: "From",
    render: (t) => (
      <span className="flex flex-col">
        <span>
          {t.from.name ?? t.from.email ?? (t.from.isGuest ? "Guest" : "Someone")}
          {t.unread ? <span className="ml-2 badge b-err">New</span> : null}
        </span>
        <span className="text-xs font-normal text-subtle">{t.number ?? ""}</span>
      </span>
    ),
  },
  { key: "who", label: "Who", render: (t) => (t.side === "farm" ? <span className="badge b-held">Farmer</span> : <span className="badge b-fresh">Shopper</span>) },
  { key: "msg", label: "Latest message", className: "min-w-[240px]", render: (t) => <span className="line-clamp-2">{t.preview ?? ""}</span> },
  { key: "order", label: "Order", render: (t) => t.order?.number ?? "–" },
  { key: "who2", label: "Assigned", render: (t) => t.assignee?.name ?? "Nobody" },
  { key: "at", label: "Last message", render: (t) => dateTime(t.lastMessageAt), className: "whitespace-nowrap" },
];

export function SupportView() {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const { results, status, loadMore } = usePaginatedQuery(admin.support.list, { status: tab }, { initialNumItems: 30 });
  return (
    <>
      <PageHeader title="Support inbox" description="Messages from the website's contact form, and from shoppers and farmers in the app." />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "open", label: "Open" },
          { key: "resolved", label: "Resolved" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Support messages" columns={columns} rows={results as TicketRow[]} rowKey={(t) => t._id} rowHref={(t) => adminRoutes.ticket(t._id)} empty="Nothing here." />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(30)} />
    </>
  );
}
