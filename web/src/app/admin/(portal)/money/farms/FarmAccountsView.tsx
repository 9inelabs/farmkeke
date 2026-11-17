"use client";

// A-60 Farm accounts. Two lists: farms that owe money for refunds Farmkeke
// paid (taken from their next orders, or forgiven here), and farms Paystack
// can't pay yet (no subaccount, or Paystack refused the bank account).
// Shoppers can't pay a farm's orders until Paystack can pay the farm.
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { koboFrom, NairaField } from "@/components/admin/inputs";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { MoneyFarmRow } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

type Show = "owing" | "paystack";

const PAYSTACK: Record<MoneyFarmRow["paystack"], [string, string]> = {
  ready: ["b-ok", "Ready"],
  setting_up: ["b-pend", "Setting up"],
  problem: ["b-err", "Problem"],
  test: ["b-grey", "Test mode"],
};

export function FarmAccountsView() {
  const me = useStaff();
  const params = useSearchParams();
  const [show, setShow] = useState<Show>(params.get("show") === "paystack" ? "paystack" : "owing");
  const rows = useQuery(admin.money.farms, { show }) as MoneyFarmRow[] | undefined;
  const retry = useMutation(admin.money.retryPaystack);
  const forgive = useMutation(admin.money.forgiveDebt);
  const [retrying, setRetrying] = useState<MoneyFarmRow | null>(null);
  const [forgiving, setForgiving] = useState<MoneyFarmRow | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const canManage = me.can("money.manage");

  const columns: Column<MoneyFarmRow>[] =
    show === "owing"
      ? [
          { key: "farm", label: "Farm", render: (r) => <strong>{r.name}</strong> },
          {
            key: "owed",
            label: "Owes",
            render: (r) => (r.owedKobo > 0 ? <strong>{naira(r.owedKobo)}</strong> : <span className="text-muted">Credit {naira(-r.owedKobo)}</span>),
          },
          { key: "how", label: "How it's paid back", className: "min-w-[240px]", render: (r) => (r.owedKobo > 0 ? "Taken from the farm's next orders before Paystack sends its share" : "Added to the farm's next order") },
          ...(canManage
            ? [
                {
                  key: "act",
                  label: "Action",
                  render: (r: MoneyFarmRow) =>
                    r.owedKobo > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAmount("");
                          setForgiving(r);
                        }}
                      >
                        Forgive
                      </Button>
                    ) : null,
                },
              ]
            : []),
        ]
      : [
          { key: "farm", label: "Farm", render: (r) => <strong>{r.name}</strong> },
          {
            key: "state",
            label: "Paystack",
            render: (r) => {
              const [cls, label] = PAYSTACK[r.paystack];
              return <span className={`badge ${cls}`}>{label}</span>;
            },
          },
          {
            key: "why",
            label: "Details",
            className: "min-w-[240px]",
            render: (r) =>
              r.subaccountError ? (
                <span className="text-err">{r.subaccountError}</span>
              ) : r.paystack === "setting_up" ? (
                "Waiting for Paystack. Retried every hour."
              ) : (
                "–"
              ),
          },
          { key: "bank", label: "Bank account", render: (r) => `${r.bankName} ••${r.accountLast4} · ${r.accountName}` },
          { key: "at", label: "Last tried", render: (r) => (r.syncedAt ? dateTime(r.syncedAt) : "–") },
          ...(canManage
            ? [
                {
                  key: "act",
                  label: "Action",
                  render: (r: MoneyFarmRow) =>
                    r.paystack === "test" ? null : (
                      <Button size="sm" variant="ghost" onClick={() => setRetrying(r)}>
                        Try again
                      </Button>
                    ),
                },
              ]
            : []),
        ];

  return (
    <>
      <PageHeader
        title="Farm accounts"
        description="What farms owe for refunds Farmkeke paid, and farms Paystack can't pay yet. A farm Paystack can't pay can't be paid by shoppers either."
        back={{ href: adminRoutes.money, label: "Money" }}
      />
      {message ? (
        <div className="mb-4">
          <Notice tone="ok">{message}</Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={show}
        onChange={setShow}
        tabs={[
          { key: "owing", label: "Owe for refunds" },
          { key: "paystack", label: "Paystack can't pay yet" },
        ]}
      />
      {show === "paystack" ? (
        <div className="mb-4">
          <Notice tone="info">Fix a refused bank account from the farm&apos;s page (it must be the farm&apos;s own account), then try again here.</Notice>
        </div>
      ) : null}
      <Panel padded={false}>
        {rows === undefined ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption={show === "owing" ? "Farms that owe for refunds" : "Farms Paystack can't pay yet"}
            columns={columns}
            rows={rows}
            rowKey={(r) => r.farmId}
            rowHref={(r) => adminRoutes.farm(r.farmId)}
            empty={show === "owing" ? "No farm owes anything." : "Paystack can pay every farm."}
          />
        )}
      </Panel>
      <ReasonDialog
        open={retrying !== null}
        onClose={() => setRetrying(null)}
        title={retrying ? `Set up ${retrying.name} with Paystack again` : ""}
        description="Sends the farm's current bank account to Paystack. The status updates when Paystack answers."
        confirmLabel="Try again"
        variant="lime"
        onConfirm={async (reason) => {
          if (!retrying) return;
          await retry({ farmId: retrying.farmId, reason });
          setMessage("Sent to Paystack. The status updates when it answers.");
        }}
      />
      <ReasonDialog
        open={forgiving !== null}
        onClose={() => setForgiving(null)}
        title={forgiving ? `Forgive what ${forgiving.name} owes` : ""}
        description={forgiving ? `The farm owes ${naira(forgiving.owedKobo)}. Farmkeke carries what you forgive; it won't be taken from the farm's orders.` : undefined}
        confirmLabel="Forgive"
        variant="danger"
        onConfirm={async (reason) => {
          if (!forgiving) return;
          const kobo = koboFrom(amount);
          if (kobo === null || kobo <= 0 || kobo > forgiving.owedKobo) throw new FormError(`Enter an amount up to ${naira(forgiving.owedKobo)}.`);
          await forgive({ farmId: forgiving.farmId, amountKobo: kobo, reason });
          setMessage(`Forgave ${naira(kobo)} for ${forgiving.name}.`);
        }}
      >
        <NairaField label="Amount to forgive" value={amount} onChange={setAmount} hint={forgiving ? `Up to ${naira(forgiving.owedKobo)}` : undefined} />
      </ReasonDialog>
    </>
  );
}
