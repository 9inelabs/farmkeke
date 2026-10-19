"use client";

// A-64: one payout, the orders in it (with Farmkeke's commission on each),
// and "Send again" for a failed one (with a new Paystack reference).
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { LEDGER_KIND, PAYOUT_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, Facts, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { PayoutDetail } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

export function PayoutView({ payoutId }: { payoutId: string }) {
  const me = useStaff();
  const id = payoutId as Id<"payouts">;
  const p = useQuery(admin.payments.payout, { payoutId: id }) as PayoutDetail | null | undefined;
  const retry = useMutation(admin.payments.retryPayout);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (p === undefined) return <TableSkeleton />;
  if (p === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.payouts, label: "Payouts to farms" }} />
        <Notice tone="err">This payout no longer exists.</Notice>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={`${naira(p.amountKobo)} to ${p.farmName}`}
        description={`Reference ${p.reference}`}
        back={{ href: adminRoutes.payouts, label: "Payouts to farms" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge map={PAYOUT_STATUS} status={p.status} />
            {p.simulated ? <span className="badge b-grey">Test</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {p.failureReason ? (
        <div className="mb-4">
          <Notice tone="err">Failed: {p.failureReason}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Orders in this payout" padded={false}>
            <DataTable
              caption="Orders"
              columns={[
                { key: "n", label: "Order", render: (i) => i.orderNumber },
                { key: "p", label: "Products", render: (i) => naira(i.itemsTotalKobo) },
                { key: "c", label: "Commission", render: (i) => `− ${naira(i.commissionKobo)}` },
                { key: "a", label: "To the farm", render: (i) => <strong>{naira(i.amountKobo)}</strong> },
              ]}
              rows={p.items}
              rowKey={(i) => i.orderId}
              rowHref={(i) => adminRoutes.order(i.orderId)}
            />
          </Panel>
          <Panel title="Money movements">
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {p.ledger.map((e) => (
                <li key={e._id} className="flex justify-between gap-3">
                  <span>
                    {LEDGER_KIND[e.kind] ?? e.kind} · {e.status}
                  </span>
                  <span>
                    {naira(e.amountKobo)} · {dateTime(e.at)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Payout" className="self-start m:order-first">
          <Facts
            items={[
              { label: "Bank", value: `${p.bankName} ····${p.accountLast4}` },
              { label: "Created", value: dateTime(p.createdAt) },
              { label: "Sent", value: p.sentAt ? dateTime(p.sentAt) : "Not yet" },
              { label: "Tries", value: String(p.attempts) },
              { label: "Transfer code", value: p.transferCode ?? "–" },
              {
                label: "Farm",
                value: (
                  <Link href={adminRoutes.farm(p.farmId)} className="font-semibold">
                    {p.farmName}
                  </Link>
                ),
              },
            ]}
          />
          {p.status === "failed" && me.can("money.manage") ? (
            <Button className="mt-4" variant="lime" fullWidth onClick={() => setOpen(true)}>
              Send again
            </Button>
          ) : null}
        </Panel>
      </div>
      <ReasonDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Send this payout again"
        description="Check the farm's bank details first (on the farm's page). It's sent with a new Paystack reference."
        confirmLabel="Send again"
        variant="lime"
        onConfirm={async (reason) => {
          await retry({ payoutId: id, reason });
          setDone("Sending again. The status updates when Paystack replies.");
        }}
      />
    </>
  );
}
