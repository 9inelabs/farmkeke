"use client";

// A-65 Reconciliation: payments that didn't match their checkout (wrong
// amount or currency), Paystack events Farmkeke couldn't place, failed
// payouts and refunds, and a check of the bank list against Paystack's.
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { BankCheck, Reconciliation } from "@/convex/returns/adminMoney";
import { dateTime, naira } from "@/lib/format";

type Pending = { kind: "refund" | "dismiss"; id: Reconciliation["mismatches"][number] } | { kind: "unmatched"; id: Reconciliation["unmatched"][number] } | null;

export function ReconciliationView() {
  const me = useStaff();
  const data = useQuery(admin.payments.reconciliation, {}) as Reconciliation | undefined;
  const resolveMismatch = useMutation(admin.payments.resolveMismatch);
  const resolveUnmatched = useMutation(admin.payments.resolveUnmatched);
  const checkBanks = useAction(admin.payments.checkBankList);
  const [pending, setPending] = useState<Pending>(null);
  const [banks, setBanks] = useState<BankCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const canManage = me.can("money.manage");

  if (data === undefined) return <TableSkeleton />;
  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Payments that need a person: amounts that didn't match, Paystack events we couldn't place, and failed money movements."
      />
      {!data.live ? (
        <div className="mb-4">
          <Notice tone="pend">Payments are in test mode: no Paystack secret key is set on the server, so no real money moves.</Notice>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      ) : null}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <Link href={adminRoutes.payouts} className="card flex flex-col gap-1 p-5 hover:shadow-[inset_0_0_0_1px_var(--color-forest)]">
            <span className="font-display text-[24px] font-extrabold text-ink">{data.failedPayoutCount}</span>
            <span className="text-sm text-muted">Failed payouts to farms</span>
          </Link>
          <Link href={adminRoutes.refunds} className="card flex flex-col gap-1 p-5 hover:shadow-[inset_0_0_0_1px_var(--color-forest)]">
            <span className="font-display text-[24px] font-extrabold text-ink">{data.failedRefundCount}</span>
            <span className="text-sm text-muted">Failed refunds</span>
          </Link>
        </div>
        <Panel title="Payments that didn't match" description="The shopper paid, but not the amount or currency their checkout expected." padded={false}>
          <DataTable
            caption="Mismatched payments"
            columns={[
              { key: "ref", label: "Reference", render: (m) => m.reference },
              { key: "ck", label: "Checkout", render: (m) => m.checkoutReference ?? "–" },
              { key: "exp", label: "Expected", render: (m) => naira(m.expectedKobo) },
              { key: "paid", label: "Paid", render: (m) => (m.paidKobo !== null ? `${naira(m.paidKobo)} ${m.currency}` : "–") },
              { key: "at", label: "Paid at", render: (m) => (m.paidAt ? dateTime(m.paidAt) : "–") },
              ...(canManage
                ? [
                    {
                      key: "act",
                      label: "Action",
                      render: (m: Reconciliation["mismatches"][number]) => (
                        <span className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "refund", id: m })}>
                            Refund it
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "dismiss", id: m })}>
                            Dismiss
                          </Button>
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={data.mismatches}
            rowKey={(m) => m._id}
            empty="None. Every payment matched its checkout."
          />
        </Panel>
        <Panel title="Paystack events we couldn't place" description="Webhooks for references Farmkeke doesn't know. Check them in the Paystack dashboard." padded={false}>
          <DataTable
            caption="Unmatched events"
            columns={[
              { key: "ev", label: "Event", render: (e) => e.event },
              { key: "ref", label: "Reference", render: (e) => e.reference },
              { key: "amt", label: "Amount", render: (e) => (e.amountKobo !== null ? naira(e.amountKobo) : "–") },
              { key: "st", label: "Status", render: (e) => e.status ?? "–" },
              { key: "at", label: "Received", render: (e) => dateTime(e.at) },
              ...(canManage
                ? [
                    {
                      key: "act",
                      label: "Action",
                      render: (e: Reconciliation["unmatched"][number]) => (
                        <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "unmatched", id: e })}>
                          Mark checked
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={data.unmatched}
            rowKey={(e) => e._id}
            empty="None."
          />
        </Panel>
        <Panel title="Bank list" description="Checks Farmkeke's list of banks (used for farm and rider bank accounts) against Paystack's.">
          <Button
            variant="ghost"
            loading={checking}
            onClick={async () => {
              setChecking(true);
              setMessage(null);
              try {
                setBanks((await checkBanks({})) as BankCheck);
              } catch (e) {
                setMessage({ tone: "err", text: adminError(e) });
              } finally {
                setChecking(false);
              }
            }}
          >
            Check the bank list
          </Button>
          {banks ? (
            <div className="mt-4 text-sm">
              {!banks.live ? (
                <Notice tone="pend">Payments are in test mode, so Paystack can&apos;t be asked.</Notice>
              ) : banks.missing.length === 0 && banks.renamed.length === 0 ? (
                <Notice tone="ok">All {banks.checked} banks match Paystack&apos;s list of {banks.paystackCount}.</Notice>
              ) : (
                <>
                  {banks.missing.length > 0 ? (
                    <p className="m-0 mb-2">
                      <strong>Not on Paystack:</strong> {banks.missing.map((b) => `${b.name} (${b.code})`).join(", ")}
                    </p>
                  ) : null}
                  {banks.renamed.length > 0 ? (
                    <p className="m-0">
                      <strong>Named differently:</strong> {banks.renamed.map((b) => `${b.ours} → ${b.paystack}`).join(", ")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </Panel>
      </div>
      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={
          pending?.kind === "refund"
            ? `Refund payment ${pending.id.reference}`
            : pending?.kind === "dismiss"
              ? `Dismiss payment ${pending.id.reference}`
              : pending
                ? `Mark event ${pending.id.reference} as checked`
                : ""
        }
        description={
          pending?.kind === "refund"
            ? "Refunds the full amount paid back to the shopper."
            : pending?.kind === "dismiss"
              ? "Only after checking it in Paystack: nothing is refunded."
              : "It leaves this list. Nothing changes in Paystack."
        }
        confirmLabel={pending?.kind === "refund" ? "Refund" : pending?.kind === "dismiss" ? "Dismiss" : "Mark checked"}
        variant={pending?.kind === "refund" ? "lime" : "dark"}
        onConfirm={async (reason) => {
          if (!pending) return;
          if (pending.kind === "unmatched") await resolveUnmatched({ eventId: pending.id._id, reason });
          else await resolveMismatch({ attemptId: pending.id._id, decision: pending.kind, reason });
          setMessage({ tone: "ok", text: "Done." });
        }}
      />
    </>
  );
}
