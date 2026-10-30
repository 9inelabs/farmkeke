"use client";

// Admin → Messages: every message staff sent to shoppers and farmers, newest
// first, with how many it reached and opened. A scheduled one can be
// cancelled; a sent one withdrawn from people's Notifications (a push alert
// already shown stays on the phone).
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, DataTable, FilterTabs, LoadMore, PageHeader, Panel, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { MessageRow } from "@/convex/returns/adminMessages";
import { dateTime } from "@/lib/format";

const STATUS: Record<string, [string, string]> = {
  scheduled: ["b-pend", "Scheduled"],
  sending: ["b-pend", "Sending"],
  sent: ["b-ok", "Sent"],
  cancelled: ["b-grey", "Cancelled"],
  withdrawn: ["b-grey", "Withdrawn"],
};

const WHO = { shop: "Shoppers", farm: "Farmers", both: "Shoppers and farmers" } as const;

function sentTo(m: MessageRow) {
  if (m.audience === "one") return `${m.side === "farm" ? "One farmer" : "One shopper"} · ${m.recipient ?? "removed account"}`;
  return `${WHO[m.side]} · everyone`;
}

function Opened({ m }: { m: MessageRow }) {
  const opened = useQuery(admin.messages.opened, m.status === "scheduled" || m.status === "cancelled" ? "skip" : { broadcastId: m._id }) as
    | { count: number; capped: boolean }
    | undefined;
  if (m.status === "scheduled" || m.status === "cancelled") return <>–</>;
  if (opened === undefined) return <span className="text-muted">…</span>;
  return <>{`${opened.count.toLocaleString("en-NG")}${opened.capped ? "+" : ""}`}</>;
}

export function MessagesView() {
  const [tab, setTab] = useState<"all" | "scheduled">("all");
  const { results, status, loadMore } = usePaginatedQuery(admin.messages.list, tab === "all" ? {} : { status: "scheduled" }, { initialNumItems: 30 });
  const cancel = useMutation(admin.messages.cancel);
  const withdraw = useMutation(admin.messages.withdraw);
  const [confirm, setConfirm] = useState<{ kind: "cancel" | "withdraw"; m: MessageRow } | null>(null);
  const rows = results as MessageRow[];

  const columns: Column<MessageRow>[] = [
    {
      key: "message",
      label: "Message",
      render: (m) => (
        <div className="min-w-0">
          <div className="font-semibold">{m.title}</div>
          <div className="text-xs text-muted">Notifications + push</div>
        </div>
      ),
    },
    { key: "to", label: "Sent to", render: sentTo },
    { key: "kind", label: "Kind", render: (m) => (m.kind === "offer" ? "Offer or news" : "Service update") },
    { key: "by", label: "By", render: (m) => m.sentBy },
    { key: "when", label: "When", render: (m) => dateTime(m.sentAt ?? m.sendAt) },
    { key: "reached", label: "Reached", render: (m) => (m.status === "scheduled" || m.status === "cancelled" ? "–" : m.recipients.toLocaleString("en-NG")), className: "text-right" },
    { key: "opened", label: "Opened", render: (m) => <Opened m={m} />, className: "text-right" },
    { key: "status", label: "Status", render: (m) => <StatusBadge map={STATUS} status={m.status} /> },
    {
      key: "actions",
      label: "",
      render: (m) =>
        m.status === "scheduled" ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "cancel", m })}>
            Cancel
          </Button>
        ) : m.status === "sent" || m.status === "sending" ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "withdraw", m })}>
            Withdraw
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Messages"
        description="Notifications your team sends to shoppers and farmers. They appear in the app's Notifications and as a push alert."
        actions={
          <ButtonLink href={adminRoutes.newMessage} variant="dark">
            New message
          </ButtonLink>
        }
      />
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: "All" },
          { key: "scheduled", label: "Scheduled" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Messages"
            columns={columns}
            rows={rows}
            rowKey={(m) => m._id}
            empty={tab === "scheduled" ? "No messages waiting to go." : "No messages sent yet. Use New message to send your first."}
          />
        )}
        <LoadMore status={status} onMore={() => loadMore(30)} />
      </Panel>
      <p className="mt-3 text-[13px] text-muted">
        Opened counts people who opened the message in the app. Withdraw removes a message from people&apos;s Notifications; a push alert already shown can&apos;t be taken back.
      </p>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "cancel" ? "Cancel this scheduled message?" : "Withdraw this message?"}
        description={
          confirm?.kind === "cancel"
            ? `"${confirm.m.title}" won't be sent.`
            : `"${confirm?.m.title ?? ""}" is removed from everyone's Notifications. Push alerts already shown stay on their phones.`
        }
        confirmLabel={confirm?.kind === "cancel" ? "Cancel message" : "Withdraw"}
        variant="danger"
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "cancel") await cancel({ broadcastId: confirm.m._id });
          else await withdraw({ broadcastId: confirm.m._id });
          setConfirm(null);
        }}
      />
    </>
  );
}
