"use client";

// A-36 / A-37: one account, its orders and addresses. Staff with
// customers.manage can block or unblock it, sign it out everywhere, or send
// it the usual password reset link.
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { History } from "@/components/admin/FarmBits";
import { ORDER_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, Facts, Notice, PageHeader, Panel, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { AccountDetail } from "@/convex/returns/adminCare";
import { dateTime, displayPhone, naira } from "@/lib/format";

export function CustomerView({ userId }: { userId: string }) {
  const me = useStaff();
  const id = userId as Id<"users">;
  const data = useQuery(admin.consumers.get, { userId: id }) as AccountDetail | null | undefined;
  const setBlocked = useMutation(admin.consumers.setBlocked);
  const signOut = useMutation(admin.consumers.signOutEverywhere);
  const sendReset = useAction(admin.consumers.sendPasswordReset);
  const [dialog, setDialog] = useState<"block" | "signout" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (data === undefined) return <TableSkeleton />;
  if (data === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.customers, label: "Customers" }} />
        <Notice tone="err">This account no longer exists. It may have been deleted.</Notice>
      </>
    );
  }
  const a = data.account;
  const canManage = me.can("customers.manage") && !a.isStaff;

  return (
    <>
      <PageHeader
        title={a.name ?? (a.isGuest ? "Guest" : "No name")}
        description={a.email ?? (a.phone ? displayPhone(a.phone) : undefined)}
        back={{ href: adminRoutes.customers, label: "Customers" }}
        actions={
          <span className="flex flex-wrap gap-1.5">
            {a.isGuest ? <span className="badge b-grey">Guest</span> : <span className="badge b-fresh">Shopper</span>}
            {a.farm ? <span className="badge b-held">Farmer</span> : null}
            {a.isStaff ? <span className="badge b-held">Staff</span> : null}
            {a.blocked ? <span className="badge b-err">Blocked</span> : null}
          </span>
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <Notice tone="err">{error}</Notice>
        </div>
      ) : null}
      {a.blocked && data.user.blockReason ? (
        <div className="mb-4">
          <Notice tone="err">Blocked: {data.user.blockReason}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Account">
            <Facts
              items={[
                { label: "Email", value: a.email ?? "–" },
                { label: "Phone", value: a.phone ? displayPhone(a.phone) : "–" },
                { label: "Joined", value: dateTime(a._creationTime) },
                { label: "Signed in on", value: data.signedInDevices === 1 ? "1 device" : `${data.signedInDevices} devices` },
                {
                  label: "Farm",
                  value: a.farm ? (
                    <Link href={adminRoutes.farm(a.farm._id)} className="font-semibold">
                      {a.farm.name}
                    </Link>
                  ) : (
                    "None"
                  ),
                },
              ]}
            />
          </Panel>
          <Panel title="Orders" padded={false}>
            <DataTable
              caption="Orders"
              columns={[
                { key: "n", label: "Order", render: (o) => o.number },
                { key: "farm", label: "Farm", render: (o) => o.farmName },
                { key: "status", label: "Status", render: (o) => <StatusBadge map={ORDER_STATUS} status={o.status} /> },
                { key: "total", label: "Total", render: (o) => naira(o.totalKobo) },
                { key: "at", label: "Placed", render: (o) => dateTime(o.placedAt) },
              ]}
              rows={data.orders}
              rowKey={(o) => o._id}
              rowHref={me.can("orders.view") ? (o) => adminRoutes.order(o._id) : undefined}
              empty="No orders."
            />
          </Panel>
          <Panel title="Saved addresses">
            {data.addresses.length === 0 ? (
              <p className="sm">None saved.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {data.addresses.map((ad) => (
                  <li key={ad._id}>
                    <strong className="capitalize">{ad.label}</strong>: {ad.street}
                    {ad.landmark ? ` (${ad.landmark})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Staff actions on this account">
            <History entries={data.activity} />
          </Panel>
        </div>
        <Panel title="Actions" className="self-start m:order-first">
          {a.isStaff ? (
            <p className="sm">This is a staff account. Manage its access under Staff.</p>
          ) : !canManage ? (
            <p className="sm">Your role can&apos;t change accounts.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {a.email ? (
                <Button
                  variant="ghost"
                  fullWidth
                  loading={sending}
                  onClick={async () => {
                    setSending(true);
                    setError(null);
                    try {
                      await sendReset({ userId: id });
                      setDone(`We emailed a password reset link to ${a.email}.`);
                    } catch (e) {
                      setError(adminError(e));
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  Send a password reset link
                </Button>
              ) : null}
              <Button variant="ghost" fullWidth onClick={() => setDialog("signout")}>
                Sign out everywhere
              </Button>
              <Button variant={a.blocked ? "dark" : "danger"} fullWidth onClick={() => setDialog("block")}>
                {a.blocked ? "Unblock account" : "Block account"}
              </Button>
            </div>
          )}
        </Panel>
      </div>
      <ReasonDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title={a.blocked ? "Unblock this account" : "Block this account"}
        description={a.blocked ? "They can sign in and order again." : "They're signed out at once and can't sign in or order. Orders already placed carry on."}
        confirmLabel={a.blocked ? "Unblock" : "Block"}
        variant={a.blocked ? "dark" : "danger"}
        onConfirm={async (reason) => {
          await setBlocked({ userId: id, blocked: !a.blocked, reason });
          setDone(a.blocked ? "Account unblocked." : "Account blocked.");
        }}
      />
      <ReasonDialog
        open={dialog === "signout"}
        onClose={() => setDialog(null)}
        title="Sign out everywhere"
        description="Ends every session on every phone and browser. They can sign in again with their password."
        confirmLabel="Sign out everywhere"
        onConfirm={async (reason) => {
          const n = (await signOut({ userId: id, reason })) as number;
          setDone(n === 1 ? "Signed out of 1 device." : `Signed out of ${n} devices.`);
        }}
      />
    </>
  );
}
