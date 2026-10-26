"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader, Panel, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { admin } from "@/convex/admin";
import type { StaffAlert } from "@/convex/returns/admin";
import { adminPath, portalPath } from "@/lib/adminHost";
import { dateTime } from "@/lib/format";

export function AlertsView() {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(admin.staff.alerts, {}, { initialNumItems: 30 });
  const markRead = useMutation(admin.staff.markAlertsRead);
  const alerts = results as StaffAlert[];
  const unread = alerts.some((a) => a.readAt === undefined);

  const open = async (a: StaffAlert) => {
    if (a.readAt === undefined) await markRead({ notificationId: a._id });
    // Staff alert links are stored as /admin/… paths
    if (a.href.startsWith("/admin")) router.push(adminPath(portalPath(a.href)));
  };

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Things that need staff attention, sent to the roles that handle them."
        actions={
          unread ? (
            <Button variant="ghost" onClick={() => markRead({})}>
              Mark all as read
            </Button>
          ) : null
        }
      />
      {status === "LoadingFirstPage" ? (
        <Panel padded={false}>
          <TableSkeleton />
        </Panel>
      ) : alerts.length === 0 ? (
        <EmptyState icon={<Bell className="size-7" strokeWidth={1.75} />} title="No alerts" body="You're all caught up." />
      ) : (
        <Panel padded={false}>
          <ul className="m-0 list-none p-0">
            {alerts.map((a) => (
              <li key={a._id} className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                <button
                  type="button"
                  onClick={() => open(a)}
                  className="flex w-full cursor-pointer items-start gap-3 px-6 py-4 text-left hover:bg-soft m:px-4"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2.5 flex-none rounded-full ${a.readAt === undefined ? "bg-error" : "bg-transparent"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] ${a.readAt === undefined ? "font-bold" : "font-semibold"} text-ink`}>
                      {a.title}
                      {a.readAt === undefined ? <span className="sr-only"> (unread)</span> : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{a.body}</span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-subtle">{dateTime(a._creationTime)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => loadMore(30)} loading={status === "LoadingMore"}>
            Show older
          </Button>
        </div>
      ) : null}
    </>
  );
}
