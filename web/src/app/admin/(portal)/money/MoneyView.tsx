"use client";

// A-61 Release queue. Money never releases on its own: shoppers confirm, or
// staff release here after checking. Three lists: confirmed but still held,
// delivered but not confirmed after a day, and blocked by a problem report.
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { MoneyActions } from "@/components/admin/MoneyActions";
import { ORDER_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, Notice, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { LedgerRow, MoneySummary, ReleaseQueue } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

type Tab = "confirmed" | "unconfirmed" | "disputed";

export function MoneyView() {
  const queue = useQuery(admin.ledger.releaseQueue, {}) as ReleaseQueue | undefined;
  const summary = useQuery(admin.ledger.summary, {}) as MoneySummary | undefined;
  const [tab, setTab] = useState<Tab>("unconfirmed");
  const [done, setDone] = useState<string | null>(null);

  const columns: Column<LedgerRow>[] = [
    { key: "n", label: "Order", render: (r) => r.number },
    { key: "farm", label: "Farm", render: (r) => r.farmName },
    { key: "shopper", label: "Shopper", render: (r) => r.consumerName },
    { key: "amount", label: "Held", render: (r) => <strong>{naira(r.amountKobo)}</strong> },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge map={ORDER_STATUS} status={r.status} />
          {r.escrowHold ? <span className="badge b-err">On hold</span> : null}
        </span>
      ),
    },
    { key: "when", label: tab === "confirmed" ? "Confirmed" : "Delivered", render: (r) => dateTime((tab === "confirmed" ? r.confirmedAt : r.deliveredAt) ?? r.heldSince ?? 0) },
    {
      key: "act",
      label: "Action",
      render: (r) =>
        tab === "disputed" ? (
          r.disputeId ? (
            <Link href={adminRoutes.dispute(r.disputeId)} className="font-semibold">
              Decide the report
            </Link>
          ) : null
        ) : (
          <MoneyActions order={r} onDone={setDone} />
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Release queue"
        description="Money Farmkeke holds that needs a person. Shoppers confirming releases it automatically; these didn't, or are on hold."
      />
      {summary ? (
        <div className="mb-6 grid grid-cols-4 gap-4 m:grid-cols-2">
          <Tile label={`Held for ${summary.heldOrders}${summary.capped ? "+" : ""} orders`} value={naira(summary.heldKobo)} />
          <Tile label="Waiting to pay out to farms" value={naira(summary.pendingPayoutKobo)} />
          <Tile label="Orders on hold" value={String(summary.onHold)} />
          <Tile label="Failed payouts and refunds" value={String(summary.failedPayouts + summary.failedRefunds)} href={adminRoutes.reconciliation} />
        </div>
      ) : null}
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "unconfirmed", label: "Delivered, not confirmed", count: queue?.unconfirmed.length },
          { key: "confirmed", label: "Confirmed, still held", count: queue?.confirmed.length },
          { key: "disputed", label: "Problem reported", count: queue?.disputed.length },
        ]}
      />
      {tab === "unconfirmed" ? (
        <div className="mb-4">
          <Notice tone="info">Call the shopper first. If they got everything, release; if not, ask them to report the problem.</Notice>
        </div>
      ) : tab === "confirmed" ? (
        <div className="mb-4">
          <Notice tone="info">The shopper confirmed, but the money is on hold. Lift the hold to pay the farm.</Notice>
        </div>
      ) : null}
      <Panel padded={false}>
        {queue === undefined ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Release queue" columns={columns} rows={queue[tab]} rowKey={(r) => r.orderId} rowHref={(r) => adminRoutes.order(r.orderId)} empty="Nothing here." />
        )}
      </Panel>
    </>
  );
}

function Tile({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="font-display text-[24px] leading-8 font-extrabold text-ink">{value}</span>
      <span className="text-sm font-medium text-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="card flex flex-col gap-1 p-5 hover:shadow-[inset_0_0_0_1px_var(--color-forest)]">
      {body}
    </Link>
  ) : (
    <div className="card flex flex-col gap-1 p-5">{body}</div>
  );
}
