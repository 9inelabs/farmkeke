"use client";

// A-64 Payouts: money sent from Farmkeke to farms' bank accounts once their
// orders are released.
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { PAYOUT_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { PayoutRow } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

const columns: Column<PayoutRow>[] = [
  { key: "farm", label: "Farm", render: (p) => p.farmName },
  { key: "amount", label: "Amount", render: (p) => <strong>{naira(p.amountKobo)}</strong> },
  { key: "bank", label: "Bank", render: (p) => `${p.bankName} ····${p.accountLast4}` },
  { key: "orders", label: "Orders", render: (p) => String(p.orderCount) },
  {
    key: "status",
    label: "Status",
    render: (p) => (
      <span className="flex flex-wrap gap-1.5">
        <StatusBadge map={PAYOUT_STATUS} status={p.status} />
        {p.simulated ? <span className="badge b-grey">Test</span> : null}
        {p.sending ? <span className="badge b-held">Sending</span> : null}
      </span>
    ),
  },
  { key: "why", label: "Problem", render: (p) => p.failureReason ?? "–" },
  { key: "at", label: "Created", render: (p) => dateTime(p.createdAt), className: "whitespace-nowrap" },
];

export function PayoutsView() {
  const [tab, setTab] = useState<"pending" | "failed" | "sent">("pending");
  const { results, status, loadMore } = usePaginatedQuery(admin.payments.payouts, { status: tab }, { initialNumItems: 40 });
  return (
    <>
      <PageHeader title="Payouts to farms" description="Released money on its way to farms' bank accounts through Paystack." />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "pending", label: "Waiting to send" },
          { key: "failed", label: "Failed" },
          { key: "sent", label: "Sent" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Payouts" columns={columns} rows={results as PayoutRow[]} rowKey={(p) => p._id} rowHref={(p) => adminRoutes.payout(p._id)} empty="No payouts here." />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}
