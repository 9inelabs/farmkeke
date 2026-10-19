"use client";

// A-76: one support conversation. Replies notify the person in the app
// (and by email); resolving closes it until they write again.
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminRoutes } from "@/components/admin/routes";
import { Composer, Thread } from "@/components/admin/Thread";
import { Facts, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Assignable, SupportMessage, TicketRow } from "@/convex/returns/adminCare";
import { dateTime, displayPhone } from "@/lib/format";

export function TicketView({ ticketId }: { ticketId: string }) {
  const me = useStaff();
  const id = ticketId as Id<"supportTickets">;
  const t = useQuery(admin.support.get, { ticketId: id }) as TicketRow | null | undefined;
  const { results, status, loadMore } = usePaginatedQuery(admin.support.messages, { ticketId: id }, { initialNumItems: 50 });
  const staff = useQuery(admin.staff.assignable, { permission: "support.manage" }) as Assignable[] | undefined;
  const reply = useMutation(admin.support.reply);
  const assign = useMutation(admin.support.assign);
  const resolve = useMutation(admin.support.resolve);
  const markRead = useMutation(admin.support.markRead);
  const [resolving, setResolving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const loaded = t !== undefined && t !== null;
  useEffect(() => {
    if (loaded) void markRead({ ticketId: id }).catch(() => {});
  }, [loaded, id, markRead]);

  if (t === undefined) return <TableSkeleton />;
  if (t === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.support, label: "Support inbox" }} />
        <Notice tone="err">This conversation no longer exists.</Notice>
      </>
    );
  }
  const canManage = me.can("support.manage");
  const name = t.from.name ?? t.from.email ?? (t.from.isGuest ? "Guest" : "Someone");
  const messages = [...(results as SupportMessage[])].reverse().map((m) => ({
    _id: m._id,
    who: m.from === "staff" ? (m.authorName ?? "Staff") : name,
    staff: m.from === "staff",
    body: m.body,
    photos: m.photos,
    at: m.at,
  }));

  return (
    <>
      <PageHeader
        title={name}
        description={`${t.number ? `${t.number} · ` : ""}${t.side === "farm" ? "Farmer" : "Shopper"} · started ${dateTime(t.createdAt)}`}
        back={{ href: adminRoutes.support, label: "Support inbox" }}
        actions={t.status === "resolved" ? <span className="badge b-ok">Resolved</span> : <span className="badge b-pend">Open</span>}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <Panel title="Conversation">
          {status === "CanLoadMore" ? (
            <div className="mb-3">
              <Button size="sm" variant="ghost" onClick={() => loadMore(50)}>
                Show older messages
              </Button>
            </div>
          ) : null}
          <Thread messages={messages} empty="No messages." />
          {canManage ? (
            <div className="mt-5">
              <Composer
                label={`Reply to ${name.split(/\s+/)[0]}`}
                hint={t.status === "resolved" ? "Replying opens the conversation again." : "They get a notification in the app and by email."}
                onSend={(body, photoIds) => reply({ ticketId: id, body, photoIds })}
              />
            </div>
          ) : null}
        </Panel>
        <div className="flex flex-col gap-6 self-start m:order-first">
          <Panel title="From">
            <Facts
              items={[
                { label: "Name", value: t.from.name ?? "–" },
                { label: "Email", value: t.from.email ?? "–" },
                { label: "Phone", value: t.from.phone ? displayPhone(t.from.phone) : "–" },
                {
                  label: "Order",
                  value: t.order ? (
                    me.can("orders.view") ? (
                      <Link href={adminRoutes.order(t.order.orderId)} className="font-semibold">
                        {t.order.number}
                      </Link>
                    ) : (
                      t.order.number
                    )
                  ) : (
                    "None"
                  ),
                },
              ]}
            />
            <div className="mt-3 flex flex-col gap-2">
              {t.from.userId && me.can("customers.view") ? (
                <Link href={adminRoutes.customer(t.from.userId)} className="btn ghost sm w-full">
                  Open their account
                </Link>
              ) : null}
              {t.from.farm && me.can("farmers.view") ? (
                <Link href={adminRoutes.farm(t.from.farm._id)} className="btn ghost sm w-full">
                  Open {t.from.farm.name}
                </Link>
              ) : null}
            </div>
          </Panel>
          <Panel title="Assigned to">
            {canManage ? (
              <select
                aria-label="Assigned to"
                className="fin cursor-pointer"
                value={t.assignee?._id ?? ""}
                onChange={(e) => void assign({ ticketId: id, ...(e.target.value ? { assigneeId: e.target.value as Id<"users"> } : {}) }).catch(() => {})}
              >
                <option value="">Nobody</option>
                {(staff ?? []).map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name}
                    {s.userId === me.userId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="m-0">{t.assignee?.name ?? "Nobody"}</p>
            )}
            {canManage && t.status === "open" ? (
              <Button className="mt-4" variant="dark" fullWidth onClick={() => setResolving(true)}>
                Mark resolved
              </Button>
            ) : null}
          </Panel>
        </div>
      </div>
      <ReasonDialog
        open={resolving}
        onClose={() => setResolving(false)}
        title="Mark resolved"
        description="It moves to Resolved. If they write again, it opens again."
        label="What was done"
        confirmLabel="Mark resolved"
        onConfirm={async (reason) => {
          await resolve({ ticketId: id, reason });
          setDone("Marked resolved.");
        }}
      />
    </>
  );
}
