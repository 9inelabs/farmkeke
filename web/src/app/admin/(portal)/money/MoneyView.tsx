"use client";

// A-60 Money overview. Farmkeke doesn't hold shoppers' money: Paystack splits
// each payment at once, the farm's share to the farm's subaccount and the
// rest (commission and delivery fee) to Farmkeke. This shows the last 30 days
// of payments, where the money went, and what needs a person: refunds in
// progress or failed, farms that owe money back, farms Paystack can't pay.
import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { adminRoutes } from "@/components/admin/routes";
import { Notice, PageHeader, Panel, TableSkeleton } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { MoneyOverview, PaymentRow } from "@/convex/returns/adminMoney";
import { naira } from "@/lib/format";
import { PaymentsTable } from "./payments/PaymentsView";

export function MoneyView() {
  const o = useQuery(admin.money.overview, {}) as MoneyOverview | undefined;
  const recent = usePaginatedQuery(admin.money.payments, {}, { initialNumItems: 10 });

  return (
    <>
      <PageHeader
        title="Money"
        description="Paystack splits every payment when it's made: the farm's share goes straight to the farm, Farmkeke keeps its commission and the delivery fee. Nothing is held."
      />
      {o && !o.live ? (
        <div className="mb-4">
          <Notice tone="pend">Payments are in test mode: no Paystack secret key is set on the server, so no real money moves and no split is made.</Notice>
        </div>
      ) : null}
      {o === undefined ? (
        <TableSkeleton />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-muted">Last 30 days{o.capped ? " (first 2,000 payments)" : ""}</h2>
          <div className="mb-6 grid grid-cols-4 gap-4 m:grid-cols-2">
            <Tile label={`Paid by shoppers · ${o.payments} ${o.payments === 1 ? "payment" : "payments"}`} value={naira(o.collectedKobo)} href={adminRoutes.payments} />
            <Tile label="Sent to farms" value={naira(o.farmSharesKobo)} />
            <Tile label="Farmkeke commission" value={naira(o.commissionKobo)} />
            <Tile label="Delivery fees" value={naira(o.deliveryKobo)} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Needs a person</h2>
          <div className="mb-6 grid grid-cols-4 gap-4 m:grid-cols-2">
            <Tile label={`Refunds in progress · ${naira(o.refundsOpenKobo)}`} value={String(o.refundsOpen)} href={adminRoutes.refunds} />
            <Tile label="Failed refunds" value={String(o.refundsFailed)} href={adminRoutes.reconciliation} tone={o.refundsFailed > 0 ? "err" : undefined} />
            <Tile label={`Farms that owe for refunds · ${o.farmsOwing}`} value={naira(o.owedKobo)} href={adminRoutes.moneyFarms} />
            <Tile
              label={o.farmsWithProblem > 0 ? `Farms Paystack can't pay · ${o.farmsWithProblem} with a problem` : "Farms Paystack can't pay yet"}
              value={String(o.farmsNotReady)}
              href={`${adminRoutes.moneyFarms}?show=paystack`}
              tone={o.farmsWithProblem > 0 ? "err" : undefined}
            />
          </div>
        </>
      )}
      <Panel
        title="Latest payments"
        padded={false}
        actions={
          <Link href={adminRoutes.payments} className="text-sm font-semibold">
            See all
          </Link>
        }
      >
        {recent.status === "LoadingFirstPage" ? <TableSkeleton /> : <PaymentsTable rows={recent.results as PaymentRow[]} />}
      </Panel>
    </>
  );
}

function Tile({ label, value, href, tone }: { label: string; value: string; href?: string; tone?: "err" }) {
  const body = (
    <>
      <span className={`font-display text-[24px] leading-8 font-extrabold ${tone === "err" ? "text-err" : "text-ink"}`}>{value}</span>
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
