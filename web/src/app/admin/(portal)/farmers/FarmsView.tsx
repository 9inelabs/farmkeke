"use client";

import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { useDebounced } from "@/components/admin/debounce";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, SearchField, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { FarmRow } from "@/convex/returns/adminFarms";
import { dayMonth } from "@/lib/format";

const columns: Column<FarmRow>[] = [
  { key: "name", label: "Farm", render: (r) => r.name },
  { key: "where", label: "Location", render: (r) => `${r.lga}, ${r.state}` },
  {
    key: "state",
    label: "Status",
    render: (r) => (
      <span className="flex flex-wrap gap-1.5">
        {r.status === "suspended" ? <span className="badge b-err">Suspended</span> : <span className="badge b-ok">Active</span>}
        {r.trusted ? <span className="badge b-fresh">Trusted</span> : null}
        {r.holidayMode ? <span className="badge b-grey">On holiday</span> : null}
      </span>
    ),
  },
  { key: "setup", label: "Set up", render: (r) => (r.setUp ? "Done" : <span className="badge b-pend">Not finished</span>) },
  { key: "since", label: "Approved", render: (r) => (r.createdAt ? dayMonth(r.createdAt) : "–") },
];

export function FarmsView() {
  const [tab, setTab] = useState<"active" | "suspended">("active");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const { results, status, loadMore } = usePaginatedQuery(
    admin.farmers.list,
    { status: tab, ...(q ? { search: q } : {}) },
    { initialNumItems: 30 },
  );
  return (
    <>
      <PageHeader title="Farms" description="Every approved farm. Open one to see its details, documents and products, or to suspend it." />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "active", label: "Active" },
          { key: "suspended", label: "Suspended" },
        ]}
      />
      <SearchField label="Search farms by name" value={search} onChange={setSearch} />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Farms"
            columns={columns}
            rows={results as FarmRow[]}
            rowKey={(r) => r._id}
            rowHref={(r) => adminRoutes.farm(r._id)}
            empty={q ? "No farms match that name." : "No farms here."}
          />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(30)} />
    </>
  );
}
