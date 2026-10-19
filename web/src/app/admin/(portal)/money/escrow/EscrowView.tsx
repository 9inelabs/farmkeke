"use client";

// A-60 Escrow ledger: every order by where its money is. Open an order to
// see each money movement.
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { MoneyActions } from "@/components/admin/MoneyActions";
import { ESCROW, ORDER_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, Notice, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { LedgerRow } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

type State = "held" | "released" | "refunded" | "split";

export function EscrowView() {
  const [state, setState] = useState<State>("held");
  const [done, setDone] = useState<string | null>(null);
  const { results, status, loadMore } = usePaginatedQuery(admin.ledger.list, { state }, { initialNumItems: 40 });
  const columns: Column<LedgerRow>[] = [
    { key: "n", label: "Order", render: (r) => r.number },
    { key: "farm", label: "Farm", render: (r) => r.farmName },
    { key: "total", label: "Total", render: (r) => naira(r.amountKobo) },
    { key: "split", label: "Products / delivery", render: (r) => `${naira(r.itemsTotalKobo)} / ${naira(r.deliveryFeeKobo)}` },
    {
      key: "status",
      label: "Order",
      render: (r) => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge map={ORDER_STATUS} status={r.status} />
          {r.escrowHold ? <span className="badge b-err">On hold</span> : null}
        </span>
      ),
    },
    {
      key: "when",
      label: state === "held" ? "Held since" : "Settled",
      render: (r) => dateTime((state === "held" ? r.heldSince : (r.releasedAt ?? r.heldSince)) ?? 0),
    },
    ...(state === "held" ? [{ key: "act", label: "Action", render: (r: LedgerRow) => <MoneyActions order={r} onDone={setDone} /> }] : []),
  ];
  return (
    <>
      <PageHeader title="Escrow ledger" description="Every order by where its money is. Open an order to see each money movement." />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Money"
        value={state}
        onChange={setState}
        tabs={(["held", "released", "refunded", "split"] as State[]).map((k) => ({ key: k, label: ESCROW[k] }))}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Escrow ledger" columns={columns} rows={results as LedgerRow[]} rowKey={(r) => r.orderId} rowHref={(r) => adminRoutes.order(r.orderId)} empty="No orders here." />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}
