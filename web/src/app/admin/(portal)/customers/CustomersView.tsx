"use client";

// A-35 Customers: every account, newest first, with search by exact email or
// phone. A-38 shows accounts that were deleted, or are waiting for their
// orders to finish first.
import { useConvex, usePaginatedQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, Notice, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { AccountRow, DeletionRow } from "@/convex/returns/adminCare";
import { dateTime, dayMonth, displayPhone } from "@/lib/format";

const columns: Column<AccountRow>[] = [
  { key: "name", label: "Name", render: (u) => u.name ?? (u.isGuest ? "Guest" : "No name") },
  { key: "contact", label: "Contact", render: (u) => [u.email, u.phone ? displayPhone(u.phone) : null].filter(Boolean).join(" · ") || "–" },
  {
    key: "kind",
    label: "Account",
    render: (u) => (
      <span className="flex flex-wrap gap-1.5">
        {u.isGuest ? <span className="badge b-grey">Guest</span> : <span className="badge b-fresh">Shopper</span>}
        {u.farm ? <span className="badge b-held">Farmer</span> : null}
        {u.isStaff ? <span className="badge b-held">Staff</span> : null}
        {u.blocked ? <span className="badge b-err">Blocked</span> : null}
      </span>
    ),
  },
  { key: "since", label: "Joined", render: (u) => dayMonth(u._creationTime) },
];

function Accounts() {
  const { results, status, loadMore } = usePaginatedQuery(admin.consumers.list, {}, { initialNumItems: 40 });
  return (
    <>
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Accounts" columns={columns} rows={results as AccountRow[]} rowKey={(u) => u._id} rowHref={(u) => adminRoutes.customer(u._id)} />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}

function Deletions() {
  const { results, status, loadMore } = usePaginatedQuery(admin.consumers.listDeletions, {}, { initialNumItems: 40 });
  const rows = results as DeletionRow[];
  return (
    <>
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Account deletions"
            columns={[
              { key: "asked", label: "Asked", render: (d) => dateTime(d._creationTime) },
              {
                key: "status",
                label: "Status",
                render: (d) =>
                  d.status === "completed" ? <span className="badge b-ok">Deleted</span> : <span className="badge b-pend">Waiting for orders to finish</span>,
              },
              { key: "done", label: "Deleted", render: (d) => (d.completedAt ? dateTime(d.completedAt) : "–") },
              { key: "id", label: "Account id", render: (d) => <code className="text-xs">{d.userId}</code> },
            ]}
            rows={rows}
            rowKey={(d) => d._id}
            empty="No one has deleted their account."
          />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}

export function CustomersView() {
  const convex = useConvex();
  const [tab, setTab] = useState<"accounts" | "deletions">("accounts");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<AccountRow[] | null>(null);
  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setFound(null);
      return;
    }
    setFound((await convex.query(admin.consumers.find, { query })) as AccountRow[]);
  };
  return (
    <>
      <PageHeader title="Customers" description="Every Farmkeke account: shoppers, guests who ordered, farmers and staff." />
      <form onSubmit={search} role="search" className="mb-5 flex max-w-[520px] gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Email or phone number
        </label>
        <input id="customer-search" className="fin" placeholder="Find by email or phone number" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="dark">
          Find
        </Button>
      </form>
      {found !== null ? (
        <div className="mb-6">
          {found.length === 0 ? (
            <Notice tone="err">No account with that email or phone. Use the full email address or phone number.</Notice>
          ) : (
            <Panel title="Found" padded={false}>
              <DataTable caption="Search results" columns={columns} rows={found} rowKey={(u) => u._id} rowHref={(u) => adminRoutes.customer(u._id)} />
            </Panel>
          )}
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "accounts", label: "Accounts" },
          { key: "deletions", label: "Deleted accounts" },
        ]}
      />
      {tab === "accounts" ? <Accounts /> : <Deletions />}
    </>
  );
}
