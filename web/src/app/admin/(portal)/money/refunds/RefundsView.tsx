"use client";

// A-63 Refunds back to shoppers. Failed ones can be sent again, after
// checking Paystack (a refund that stalled may already have gone through).
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { REFUND_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { RefundRow } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

export function RefundsView() {
  const me = useStaff();
  const [tab, setTab] = useState<"waiting" | "processed">("waiting");
  const waiting = useQuery(admin.payments.refundsWaiting, tab === "waiting" ? {} : "skip") as RefundRow[] | undefined;
  const done = usePaginatedQuery(admin.payments.refunds, tab === "processed" ? { status: "processed" } : "skip", { initialNumItems: 40 });
  const retry = useMutation(admin.payments.retryRefund);
  const [retrying, setRetrying] = useState<RefundRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const columns: Column<RefundRow>[] = [
    { key: "n", label: "Order", render: (r) => r.orderNumber },
    { key: "who", label: "Shopper", render: (r) => r.consumerName },
    { key: "amt", label: "Amount", render: (r) => <strong>{naira(r.amountKobo)}</strong> },
    { key: "kind", label: "Kind", render: (r) => (r.kind === "full" ? "Full" : "Part") },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge map={REFUND_STATUS} status={r.status} />
          {r.simulated ? <span className="badge b-grey">Test</span> : null}
        </span>
      ),
    },
    { key: "why", label: "Reason", className: "min-w-[200px]", render: (r) => (r.failureReason ? <span className="text-err">{r.failureReason}</span> : r.reason) },
    { key: "at", label: tab === "processed" ? "Refunded" : "Created", render: (r) => dateTime((tab === "processed" ? r.settledAt : r.createdAt) ?? r.createdAt) },
    ...(tab === "waiting" && me.can("money.manage")
      ? [
          {
            key: "act",
            label: "Action",
            render: (r: RefundRow) =>
              r.status === "failed" ? (
                <Button size="sm" variant="ghost" onClick={() => setRetrying(r)}>
                  Send again
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Refunds" description="Money going back to shoppers through Paystack. Banks usually take 5 to 10 working days." />
      {message ? (
        <div className="mb-4">
          <Notice tone="ok">{message}</Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "waiting", label: "In progress and failed" },
          { key: "processed", label: "Refunded" },
        ]}
      />
      <Panel padded={false}>
        {tab === "waiting" ? (
          waiting === undefined ? (
            <TableSkeleton />
          ) : (
            <DataTable caption="Refunds in progress" columns={columns} rows={waiting} rowKey={(r) => r._id} rowHref={(r) => adminRoutes.order(r.orderId)} empty="No refunds in progress." />
          )
        ) : done.status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Refunded" columns={columns} rows={done.results as RefundRow[]} rowKey={(r) => r._id} rowHref={(r) => adminRoutes.order(r.orderId)} empty="No refunds yet." />
        )}
      </Panel>
      {tab === "processed" ? <LoadMore status={done.status} onMore={() => done.loadMore(40)} /> : null}
      <ReasonDialog
        open={retrying !== null}
        onClose={() => setRetrying(null)}
        title={retrying ? `Send ${naira(retrying.amountKobo)} to ${retrying.consumerName} again` : ""}
        description={`First check Paystack for transaction ${retrying?.transactionReference ?? ""}. If this refund already went through there, don't send it again.`}
        confirmLabel="Send again"
        variant="lime"
        onConfirm={async (reason) => {
          if (!retrying) return;
          await retry({ refundId: retrying._id, reason });
          setMessage("Sending again. The status updates when Paystack replies.");
        }}
      />
    </>
  );
}
