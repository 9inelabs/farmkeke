"use client";

// A-60 Payments: every successful payment, newest first, and how Paystack
// split it: each farm's share (after commission, and after any refund it owed
// back), and what Farmkeke kept (commission and delivery fee).
import { usePaginatedQuery } from "convex/react";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, LoadMore, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { PaymentRow } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const columns: Column<PaymentRow>[] = [
    { key: "at", label: "Paid", render: (p) => dateTime(p.paidAt) },
    {
      key: "ref",
      label: "Payment",
      render: (p) => (
        <span>
          <strong>{p.reference}</strong>
          <span className="block text-xs text-subtle">
            {p.shopperName}
            {p.channel ? ` · ${p.channel}` : ""}
            {p.simulated ? " · test" : ""}
          </span>
        </span>
      ),
    },
    { key: "amt", label: "Amount", render: (p) => <strong>{naira(p.amountKobo)}</strong> },
    {
      key: "farms",
      label: "To farms",
      className: "min-w-[220px]",
      render: (p) =>
        p.parts.length === 0 ? (
          "–"
        ) : (
          <ul className="m-0 list-none p-0">
            {p.parts.map((x) => (
              <li key={x.orderId}>
                {x.farmName} ({x.orderNumber}): <strong>{naira(x.shareKobo)}</strong>
                {x.recoveredKobo > 0 ? <span className="block text-xs text-subtle">{naira(x.recoveredKobo)} kept back for an earlier refund</span> : null}
                {x.recoveredKobo < 0 ? <span className="block text-xs text-subtle">includes a {naira(-x.recoveredKobo)} credit</span> : null}
              </li>
            ))}
          </ul>
        ),
    },
    { key: "fk", label: "Farmkeke kept", render: (p) => naira(p.farmkekeKobo) },
    { key: "split", label: "Paystack split", render: (p) => p.splitCode ?? (p.simulated ? "Test, no split" : "–") },
  ];
  return (
    <DataTable
      caption="Payments"
      columns={columns}
      rows={rows}
      rowKey={(p) => p._id}
      rowHref={(p) => (p.firstOrderId ? adminRoutes.order(p.firstOrderId) : adminRoutes.payments)}
      empty="No payments yet."
    />
  );
}

export function PaymentsView() {
  const { results, status, loadMore } = usePaginatedQuery(admin.money.payments, {}, { initialNumItems: 40 });
  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment and how Paystack split it. Farms get their share in their bank, usually the next working day. Paystack's fee is shared in proportion to each part."
        back={{ href: adminRoutes.money, label: "Money" }}
      />
      <Panel padded={false}>{status === "LoadingFirstPage" ? <TableSkeleton /> : <PaymentsTable rows={results as PaymentRow[]} />}</Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}
