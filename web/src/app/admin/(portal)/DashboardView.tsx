"use client";

// Portal home: who you are, what your role lets you do, and what's waiting.
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useStaff } from "@/components/admin/context";
import { visibleNav } from "@/components/admin/nav";
import { adminRoutes } from "@/components/admin/routes";
import { PageHeader, Panel } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { PermissionInfo } from "@/convex/returns/admin";

export function DashboardView() {
  const me = useStaff();
  const pending = useQuery(admin.staff.pendingCount, me.can("staff.view") ? {} : "skip") as number | undefined;
  const alerts = useQuery(admin.staff.unreadAlerts, {}) as number | undefined;
  const farmerApps = useQuery(admin.farmerRequests.counts, me.can("farmers.view") ? {} : "skip") as { submitted: number } | undefined;
  const review = useQuery(admin.listings.queueCount, me.can("listings.view") ? {} : "skip") as number | undefined;
  const disputes = useQuery(admin.disputes.openCount, me.can("disputes.view") ? {} : "skip") as number | undefined;
  const support = useQuery(admin.support.openCount, me.can("support.view") ? {} : "skip") as number | undefined;
  const catalog = useQuery(admin.access.permissionCatalog, {}) as PermissionInfo[] | undefined;
  const first = me.name.split(/\s+/)[0];
  const links = visibleNav(me.can)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== adminRoutes.home);
  const mine = (catalog ?? []).filter((p) => me.permissions.includes(p.key));

  return (
    <>
      <PageHeader title={`Welcome, ${first}`} description={`You're signed in as ${me.role.name}.`} />
      <div className="grid grid-cols-4 gap-4 m:grid-cols-2">
        {me.can("farmers.view") ? (
          <Waiting href={adminRoutes.applications} count={farmerApps?.submitted} label="Farmer applications waiting" />
        ) : null}
        {me.can("listings.view") ? <Waiting href={adminRoutes.review} count={review} label="Products waiting for review" /> : null}
        {me.can("disputes.view") ? <Waiting href={adminRoutes.disputes} count={disputes} label="Problem reports open" /> : null}
        {me.can("support.view") ? <Waiting href={adminRoutes.support} count={support} label="Support messages waiting" /> : null}
        {me.can("staff.view") ? (
          <Waiting href={adminRoutes.staff} count={pending} label="Staff applications waiting" />
        ) : null}
        <Waiting href={adminRoutes.alerts} count={alerts} label="Unread alerts" />
      </div>
      <div className="mt-6 grid grid-cols-[1fr_1fr] gap-6 m:grid-cols-1">
        <Panel title="Go to">
          <ul className="m-0 flex list-none flex-col p-0">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <li key={l.href} className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                  <Link href={l.href} className="flex min-h-12 items-center gap-3 text-[15px] font-semibold text-ink hover:text-forest">
                    <Icon aria-hidden className="size-[18px] text-forest" />
                    <span className="flex-1">{l.label}</span>
                    <ArrowRight aria-hidden className="size-4 text-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="What your role can do" description={me.role.name}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {mine.map((p) => (
              <li key={p.key} className="text-sm leading-5 text-ink-2">
                <span className="font-semibold text-ink">{p.label}.</span> {p.description}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Waiting({ href, count, label }: { href: string; count: number | undefined; label: string }) {
  return (
    <Link href={href} className="card flex flex-col gap-1 p-5 text-ink hover:shadow-[inset_0_0_0_1px_var(--color-forest)]">
      <span className="font-display text-[32px] leading-10 font-extrabold">{count ?? "–"}</span>
      <span className="text-sm font-medium text-muted">{label}</span>
    </Link>
  );
}
