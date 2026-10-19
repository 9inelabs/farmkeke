"use client";

// A-10 Dashboard: today's orders and sales, where orders are right now, the
// last 7 days, and the queues waiting for staff (each only for roles that
// can see it).
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminRoutes } from "@/components/admin/routes";
import { PageHeader, Panel } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import { naira } from "@/lib/format";

type Stats = {
  today: { orders: number; salesKobo: number; delivery: number; pickup: number; newAccounts: number };
  week: { dayStart: number; orders: number; salesKobo: number }[];
  pipeline: { waitingForFarms: number; inProgress: number; onTheRoad: number };
  catalog: { activeFarms: number; liveProducts: number };
  capped: boolean;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DashboardView() {
  const me = useStaff();
  const [dayStart] = useState(() => new Date().setHours(0, 0, 0, 0));
  const stats = useQuery(admin.dashboard.stats, me.can("dashboard.view") ? { dayStart } : "skip") as Stats | undefined;
  const pending = useQuery(admin.staff.pendingCount, me.can("staff.view") ? {} : "skip") as number | undefined;
  const alerts = useQuery(admin.staff.unreadAlerts, {}) as number | undefined;
  const farmerApps = useQuery(admin.farmerRequests.counts, me.can("farmers.view") ? {} : "skip") as { submitted: number } | undefined;
  const review = useQuery(admin.listings.queueCount, me.can("listings.view") ? {} : "skip") as number | undefined;
  const disputes = useQuery(admin.disputes.openCount, me.can("disputes.view") ? {} : "skip") as number | undefined;
  const support = useQuery(admin.support.openCount, me.can("support.view") ? {} : "skip") as number | undefined;
  const riders = useQuery(admin.riders.pendingCount, me.can("riders.view") ? {} : "skip") as number | undefined;
  const first = me.name.split(/\s+/)[0];
  const max = Math.max(1, ...(stats?.week.map((d) => d.salesKobo) ?? [1]));

  const queues = [
    me.can("farmers.view") && { href: adminRoutes.applications, count: farmerApps?.submitted, label: "Farmer applications waiting" },
    me.can("listings.view") && { href: adminRoutes.review, count: review, label: "Products waiting for review" },
    me.can("disputes.view") && { href: adminRoutes.disputes, count: disputes, label: "Problem reports open" },
    me.can("support.view") && { href: adminRoutes.support, count: support, label: "Support messages waiting" },
    me.can("riders.view") && { href: adminRoutes.riders, count: riders, label: "Riders waiting for review" },
    me.can("staff.view") && { href: adminRoutes.staff, count: pending, label: "Staff applications waiting" },
    { href: adminRoutes.alerts, count: alerts, label: "Unread alerts" },
  ].filter(Boolean) as { href: string; count: number | undefined; label: string }[];

  return (
    <>
      <PageHeader title={`Welcome, ${first}`} description={`You're signed in as ${me.role.name}.`} />
      {stats ? (
        <>
          <h2 className="h3 mb-3">Today</h2>
          <div className="grid grid-cols-4 gap-4 m:grid-cols-2">
            <Tile value={String(stats.today.orders)} label={`Orders (${stats.today.delivery} delivery, ${stats.today.pickup} pickup)`} />
            <Tile value={naira(stats.today.salesKobo)} label="Paid today" />
            <Tile value={String(stats.today.newAccounts)} label="New accounts" />
            <Tile value={`${stats.catalog.activeFarms} · ${stats.catalog.liveProducts}`} label="Active farms · live products" />
          </div>
          <h2 className="h3 mt-8 mb-3">Orders right now</h2>
          <div className="grid grid-cols-3 gap-4 m:grid-cols-1">
            <Tile href={me.can("orders.view") ? adminRoutes.orders : undefined} value={String(stats.pipeline.waitingForFarms)} label="Waiting for farms to accept" />
            <Tile href={me.can("orders.view") ? adminRoutes.orders : undefined} value={String(stats.pipeline.inProgress)} label="Accepted, being prepared" />
            <Tile href={me.can("dispatch.manage") || me.can("orders.view") ? adminRoutes.dispatch : undefined} value={String(stats.pipeline.onTheRoad)} label="On the road or at pickup points" />
          </div>
          <Panel title="Last 7 days" description={`Paid orders and sales per day${stats.capped ? " (first 5,000 orders)" : ""}.`} className="mt-8">
            <div className="flex h-44 items-end gap-3" aria-hidden>
              {stats.week.map((d) => (
                <div key={d.dayStart} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-ink-3">{d.orders}</span>
                  <span className="w-full rounded-t-lg bg-lime" style={{ height: `${Math.max(4, (d.salesKobo / max) * 120)}px` }} />
                  <span className="text-xs text-subtle">{DAY_NAMES[new Date(d.dayStart).getDay()]}</span>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Paid orders and sales, last 7 days</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Orders</th>
                  <th scope="col">Sales</th>
                </tr>
              </thead>
              <tbody>
                {stats.week.map((d) => (
                  <tr key={d.dayStart}>
                    <th scope="row">{new Date(d.dayStart).toDateString()}</th>
                    <td>{d.orders}</td>
                    <td>{naira(d.salesKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      ) : null}
      <h2 className="h3 mt-8 mb-3">Waiting for staff</h2>
      <div className="grid grid-cols-4 gap-4 m:grid-cols-2">
        {queues.map((q) => (
          <Tile key={q.href + q.label} href={q.href} value={q.count === undefined ? "–" : String(q.count)} label={q.label} />
        ))}
      </div>
    </>
  );
}

function Tile({ value, label, href }: { value: string; label: string; href?: string }) {
  const body = (
    <>
      <span className="font-display text-[26px] leading-9 font-extrabold text-ink">{value}</span>
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
