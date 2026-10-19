"use client";

// A-50 Orders: everything that needs a person first, then every order by
// status and fulfilment, and a search by order number.
import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ORDER_STATUS, STUCK_REASON } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, Notice, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { OrderRow } from "@/convex/returns/adminOps";
import { dateTime, naira } from "@/lib/format";

type Tab = "attention" | "all";

const base: Column<OrderRow>[] = [
  {
    key: "order",
    label: "Order",
    render: (o) => (
      <span className="flex flex-col">
        <span>{o.number}</span>
        <span className="text-xs font-normal text-subtle">{o.summary}</span>
      </span>
    ),
  },
  { key: "farm", label: "Farm", render: (o) => o.farmName },
  { key: "shopper", label: "Shopper", render: (o) => o.consumerName },
  {
    key: "status",
    label: "Status",
    render: (o) => (
      <span className="flex flex-wrap gap-1.5">
        <StatusBadge map={ORDER_STATUS} status={o.status} />
        {o.escrowHold ? <span className="badge b-err">Money on hold</span> : null}
      </span>
    ),
  },
  { key: "total", label: "Total", render: (o) => naira(o.totalKobo) },
  { key: "placed", label: "Placed", render: (o) => dateTime(o.placedAt), className: "whitespace-nowrap" },
];
const stuckColumns: Column<OrderRow>[] = [...base.slice(0, 4), { key: "why", label: "Why", render: (o) => <strong>{STUCK_REASON[o.reason ?? ""] ?? o.reason}</strong> }, base[5]];

function All() {
  const [status, setStatus] = useState("");
  const [fulfilment, setFulfilment] = useState("");
  const { results, status: page, loadMore } = usePaginatedQuery(
    admin.orders.list,
    { ...(status ? { status: status as never } : {}), ...(fulfilment ? { fulfilment: fulfilment as "delivery" | "pickup" } : {}) },
    { initialNumItems: 30 },
  );
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <select aria-label="Status" className="fin w-[240px] cursor-pointer m:w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Every status</option>
          {Object.entries(ORDER_STATUS).map(([k, [, label]]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Delivery or pickup" className="fin w-[200px] cursor-pointer m:w-full" value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
          <option value="">Delivery and pickup</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
        </select>
      </div>
      <Panel padded={false}>
        {page === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Orders" columns={base} rows={results as OrderRow[]} rowKey={(o) => o._id} rowHref={(o) => adminRoutes.order(o._id)} empty="No orders match." />
        )}
      </Panel>
      <LoadMore status={page} onMore={() => loadMore(30)} />
    </>
  );
}

function Attention() {
  const [now] = useState(() => Date.now());
  const rows = useQuery(admin.orders.stuck, { now }) as OrderRow[] | undefined;
  return (
    <Panel padded={false}>
      {rows === undefined ? (
        <TableSkeleton />
      ) : (
        <DataTable
          caption="Orders that need attention"
          columns={stuckColumns}
          rows={rows}
          rowKey={(o) => o._id}
          rowHref={(o) => adminRoutes.order(o._id)}
          empty="Nothing needs attention. Every order is on time."
        />
      )}
    </Panel>
  );
}

export function OrdersView() {
  const convex = useConvex();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("attention");
  const [number, setNumber] = useState("");
  const [notFound, setNotFound] = useState(false);
  const find = async (e: FormEvent) => {
    e.preventDefault();
    setNotFound(false);
    const id = (await convex.query(admin.orders.findByNumber, { number })) as string | null;
    if (id) router.push(adminRoutes.order(id));
    else setNotFound(true);
  };
  return (
    <>
      <PageHeader title="Orders" description="Every order across all farms. Start with the ones that need a person." />
      <form onSubmit={find} className="mb-5 flex max-w-[480px] gap-2" role="search">
        <label htmlFor="order-number" className="sr-only">
          Order number
        </label>
        <input id="order-number" className="fin" placeholder="Find an order number, like FK-10234" value={number} onChange={(e) => setNumber(e.target.value)} />
        <Button type="submit" variant="dark">
          Find
        </Button>
      </form>
      {notFound ? (
        <div className="mb-4">
          <Notice tone="err">No order with that number.</Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "attention", label: "Needs attention" },
          { key: "all", label: "All orders" },
        ]}
      />
      {tab === "attention" ? <Attention /> : <All />}
    </>
  );
}
