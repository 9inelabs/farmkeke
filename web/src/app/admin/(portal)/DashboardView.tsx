"use client";

// A-10 Dashboard (redesign, Nov 2026): a compact, detailed overview.
// - Four headline cards for today; the first is dark green, as on the website.
// - Sales for the last 7 days as rounded pill bars (today highlighted, empty
//   days hatched), orders in motion right now, and the queues waiting for staff.
// - Today's delivery and pickup split, the live catalogue, and a dark card
//   with the time in Lagos and unread alerts.
// Each part shows only for roles that can see it; the server checks again.
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bike,
  ChefHat,
  ClipboardCheck,
  Clock3,
  Download,
  Headphones,
  MessageSquareWarning,
  Package,
  ShoppingBag,
  Tractor,
  TrendingDown,
  TrendingUp,
  UserCog,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminRoutes } from "@/components/admin/routes";
import { admin } from "@/convex/admin";
import { naira } from "@/lib/format";

type Stats = {
  today: { orders: number; salesKobo: number; delivery: number; pickup: number; newAccounts: number };
  week: { dayStart: number; orders: number; salesKobo: number }[];
  pipeline: { waitingForFarms: number; inProgress: number; onTheRoad: number };
  catalog: { activeFarms: number; liveProducts: number };
  capped: boolean;
};

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const canDash = me.can("dashboard.view");

  const queues = [
    me.can("farmers.view") && { href: adminRoutes.applications, count: farmerApps?.submitted, label: "Farmer applications", note: "Waiting for a decision", icon: Tractor, tone: "bg-[#E7F2D3] text-forest" },
    me.can("listings.view") && { href: adminRoutes.review, count: review, label: "Products to review", note: "New and edited listings", icon: ClipboardCheck, tone: "bg-[#FDF0D9] text-[#8A5A0B]" },
    me.can("disputes.view") && { href: adminRoutes.disputes, count: disputes, label: "Problem reports", note: "Open and unresolved", icon: MessageSquareWarning, tone: "bg-[#FBE5E5] text-[#B83232]" },
    me.can("support.view") && { href: adminRoutes.support, count: support, label: "Support messages", note: "Waiting for a reply", icon: Headphones, tone: "bg-[#E3EEFB] text-[#1D5FA8]" },
    me.can("riders.view") && { href: adminRoutes.riders, count: riders, label: "Rider sign-ups", note: "Waiting for review", icon: Bike, tone: "bg-[#EEE8F8] text-[#5B3B9A]" },
    me.can("staff.view") && { href: adminRoutes.staff, count: pending, label: "Staff applications", note: "Waiting for the Founder", icon: UserCog, tone: "bg-[#E6F1EF] text-[#1F6B5C]" },
  ].filter(Boolean) as { href: string; count: number | undefined; label: string; note: string; icon: LucideIcon; tone: string }[];
  const waiting = queues.reduce((n, q) => n + (q.count ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="m-0 font-display text-[26px] leading-8 font-extrabold tracking-[-0.025em] text-ink m:text-[22px]">Dashboard</h1>
          <p className="mt-1 text-[13.5px] leading-5 text-muted">
            Welcome back, {first}. Here&apos;s Farmkeke today, as {me.role.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {me.can("orders.view") ? (
            <Link href={adminRoutes.orders} className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(30,59,22,0.22)] hover:bg-forest-hover hover:text-white">
              <ShoppingBag aria-hidden className="size-4" strokeWidth={2} />
              View orders
            </Link>
          ) : null}
          {me.can("orders.view") || me.can("money.view") || me.can("customers.view") ? (
            <Link href={adminRoutes.exports} className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-[13px] font-semibold text-forest shadow-[inset_0_0_0_1px_var(--color-forest)] hover:bg-tint">
              <Download aria-hidden className="size-4" strokeWidth={2} />
              Export data
            </Link>
          ) : null}
        </div>
      </div>

      {canDash && stats === undefined ? <LoadingCards /> : null}

      {stats ? (
        <>
          {/* Today */}
          <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 m:grid-cols-1">
            <StatCard
              dark
              label="Paid today"
              value={naira(stats.today.salesKobo)}
              trend={trend(stats.week, "salesKobo")}
              href={me.can("money.view") ? adminRoutes.money : undefined}
              icon={Wallet}
            />
            <StatCard
              label="Orders today"
              value={String(stats.today.orders)}
              foot={`${stats.today.delivery} delivery · ${stats.today.pickup} pickup`}
              trend={trend(stats.week, "orders")}
              href={me.can("orders.view") ? adminRoutes.orders : undefined}
              icon={ShoppingBag}
            />
            <StatCard label="New accounts" value={String(stats.today.newAccounts)} foot="Signed up today" icon={UserPlus} href={me.can("customers.view") ? adminRoutes.customers : undefined} />
            <StatCard
              label="Live catalogue"
              value={String(stats.catalog.liveProducts)}
              foot={`products from ${stats.catalog.activeFarms} active ${stats.catalog.activeFarms === 1 ? "farm" : "farms"}`}
              icon={Package}
              href={me.can("listings.view") ? adminRoutes.products : undefined}
            />
          </div>

          {/* Week, right now, queues */}
          <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 max-[1100px]:grid-cols-2 m:grid-cols-1">
            <WeekCard week={stats.week} capped={stats.capped} />
            <PipelineCard pipeline={stats.pipeline} canDispatch={me.can("dispatch.manage") || me.can("orders.view")} />
            <QueueCard queues={queues} waiting={waiting} className="row-span-2 max-[1100px]:row-span-1" />
            <MixCard delivery={stats.today.delivery} pickup={stats.today.pickup} />
            <ClockCard alerts={alerts} />
          </div>
        </>
      ) : !canDash ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 m:grid-cols-1">
          <QueueCard queues={queues} waiting={waiting} />
          <ClockCard alerts={alerts} />
        </div>
      ) : null}
    </div>
  );
}

/** Change from yesterday to today, from the 7-day series (oldest first). */
function trend(week: Stats["week"], key: "orders" | "salesKobo") {
  if (week.length < 2) return null;
  const today = week[week.length - 1][key];
  const before = week[week.length - 2][key];
  if (before === 0) return today > 0 ? { up: true, text: "Up from none yesterday" } : { up: true, text: "Same as yesterday" };
  const pct = Math.round(((today - before) / before) * 100);
  if (pct === 0) return { up: true, text: "Same as yesterday" };
  return { up: pct > 0, text: `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% from yesterday` };
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(16,35,11,0.04),inset_0_0_0_1px_var(--color-line)] ${className}`}>{children}</section>;
}

function CardTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="m-0 font-display text-[15px] leading-5 font-bold text-ink">{title}</h2>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  foot,
  trend: change,
  href,
  icon: Icon,
  dark = false,
}: {
  label: string;
  value: string;
  foot?: string;
  trend?: { up: boolean; text: string } | null;
  href?: string;
  icon: LucideIcon;
  dark?: boolean;
}) {
  const Trend = change?.up === false ? TrendingDown : TrendingUp;
  const body = (
    <>
      {dark ? (
        <>
          <div aria-hidden className="absolute -top-16 -right-12 size-44 rounded-full border border-lime/15" />
          <div aria-hidden className="absolute -top-8 -right-4 size-28 rounded-full border border-lime/10" />
        </>
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <span className={`flex items-center gap-2 text-[13px] font-semibold ${dark ? "text-on-forest" : "text-muted"}`}>
          <span className={`flex size-7 items-center justify-center rounded-lg ${dark ? "bg-white/10 text-lime" : "bg-tint text-forest"}`}>
            <Icon aria-hidden className="size-[15px]" strokeWidth={2} />
          </span>
          {label}
        </span>
        {href ? (
          <span
            aria-hidden
            className={`flex size-8 items-center justify-center rounded-full transition-transform group-hover:rotate-45 ${dark ? "bg-lime text-forest" : "text-forest shadow-[inset_0_0_0_1px_var(--color-line-2)]"}`}
          >
            <ArrowUpRight className="size-4" strokeWidth={2.25} />
          </span>
        ) : null}
      </div>
      <p className={`relative mt-4 font-display text-[30px] leading-9 font-extrabold tracking-[-0.03em] ${dark ? "text-white" : "text-ink"}`}>{value}</p>
      {change ? (
        <p className={`relative mt-2 flex items-center gap-1.5 text-xs font-medium ${dark ? "text-on-forest-lime" : change.up ? "text-ok" : "text-err"}`}>
          <span className={`flex size-5 items-center justify-center rounded-md ${dark ? "bg-lime/20" : change.up ? "bg-ok-bg" : "bg-err-bg"}`}>
            <Trend aria-hidden className="size-3" strokeWidth={2.5} />
          </span>
          {change.text}
        </p>
      ) : null}
      {foot ? <p className={`relative ${change ? "mt-1.5" : "mt-2"} text-xs ${dark ? "text-on-forest" : "text-subtle"}`}>{foot}</p> : null}
    </>
  );
  const cls = `group relative overflow-hidden rounded-[20px] p-5 ${
    dark
      ? "bg-[radial-gradient(90%_80%_at_100%_0%,rgba(169,214,84,0.32)_0%,rgba(169,214,84,0)_70%),linear-gradient(155deg,#0B1A07_0%,#152E10_55%,#24461B_100%)] text-white shadow-[0_18px_40px_rgba(16,35,11,0.25)]"
      : "bg-surface shadow-[0_1px_2px_rgba(16,35,11,0.04),inset_0_0_0_1px_var(--color-line)]"
  }`;
  return href ? (
    <Link href={href} className={`${cls} ${dark ? "hover:text-white" : "hover:shadow-[0_8px_24px_rgba(16,35,11,0.08),inset_0_0_0_1px_var(--color-line-2)]"}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Sales per day as tall rounded pills; today in forest with its total, days without sales hatched. */
function WeekCard({ week, capped }: { week: Stats["week"]; capped: boolean }) {
  const max = Math.max(1, ...week.map((d) => d.salesKobo));
  const total = week.reduce((n, d) => n + d.salesKobo, 0);
  const orders = week.reduce((n, d) => n + d.orders, 0);
  const best = week.reduce((b, d) => (d.salesKobo > b.salesKobo ? d : b), week[0] ?? { dayStart: 0, orders: 0, salesKobo: 0 });
  return (
    <Card>
      <CardTitle title="Sales, last 7 days" action={<span className="text-xs font-medium text-subtle">{orders} paid {orders === 1 ? "order" : "orders"}</span>} />
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-[22px] leading-7 font-extrabold tracking-[-0.02em] text-ink">{naira(total)}</p>
          <p className="text-xs text-subtle">
            {best.salesKobo > 0 ? `Best day: ${DAY_NAMES[new Date(best.dayStart).getDay()]}` : "No sales yet this week"}
            {capped ? " · first 5,000 orders" : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 flex h-[150px] items-end justify-between gap-2.5" aria-hidden>
        {week.map((d, i) => {
          const today = i === week.length - 1;
          const empty = d.salesKobo === 0;
          const h = empty ? 46 : Math.max(52, (d.salesKobo / max) * 128);
          return (
            <div key={d.dayStart} className="relative flex flex-1 flex-col items-center gap-2">
              {today && !empty ? (
                <span className="absolute -top-7 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-white">{naira(d.salesKobo)}</span>
              ) : null}
              <span
                className={`w-full max-w-[44px] rounded-full ${
                  empty
                    ? "bg-[repeating-linear-gradient(135deg,#E3E7DD_0px,#E3E7DD_2px,transparent_2px,transparent_7px)] shadow-[inset_0_0_0_1px_#DCE0D6]"
                    : today
                      ? "bg-forest"
                      : d.salesKobo === max
                        ? "bg-[#3E7A2E]"
                        : "bg-[#A9D654]"
                }`}
                style={{ height: h }}
              />
              <span className={`text-[11px] font-semibold ${today ? "text-forest" : "text-faint"}`}>{DAY_LETTERS[new Date(d.dayStart).getDay()]}</span>
            </div>
          );
        })}
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
          {week.map((d) => (
            <tr key={d.dayStart}>
              <th scope="row">{new Date(d.dayStart).toDateString()}</th>
              <td>{d.orders}</td>
              <td>{naira(d.salesKobo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PipelineCard({ pipeline, canDispatch }: { pipeline: Stats["pipeline"]; canDispatch: boolean }) {
  const rows = [
    { label: "Waiting for farms", note: "Not accepted yet", value: pipeline.waitingForFarms, icon: Clock3, bar: "bg-[#E6A23C]" },
    { label: "Being prepared", note: "Accepted by the farm", value: pipeline.inProgress, icon: ChefHat, bar: "bg-[#A9D654]" },
    { label: "On the road", note: "Or ready to collect", value: pipeline.onTheRoad, icon: Bike, bar: "bg-forest" },
  ];
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <Card className="flex flex-col">
      <CardTitle title="Orders right now" action={<span className="rounded-full bg-tint px-2 py-0.5 text-[11px] font-bold text-forest">{total} open</span>} />
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-center gap-3">
              <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-soft text-forest shadow-[inset_0_0_0_1px_var(--color-line)]">
                <r.icon aria-hidden className="size-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-[18px] font-semibold text-ink">{r.label}</span>
                <span className="block text-[11.5px] leading-4 text-subtle">{r.note}</span>
              </span>
              <span className="font-display text-[18px] font-extrabold text-ink">{r.value}</span>
            </div>
            <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunk">
              <span className={`block h-full rounded-full ${r.bar}`} style={{ width: `${total === 0 ? 0 : Math.max(4, (r.value / total) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {canDispatch ? (
        <div className="mt-auto pt-4">
          <Link href={adminRoutes.dispatch} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-forest text-[13px] font-semibold text-white hover:bg-forest-hover hover:text-white">
            Open dispatch
            <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

function QueueCard({
  queues,
  waiting,
  className = "",
}: {
  queues: { href: string; count: number | undefined; label: string; note: string; icon: LucideIcon; tone: string }[];
  waiting: number;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <CardTitle
        title="Waiting for staff"
        action={<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${waiting > 0 ? "bg-lime text-forest" : "bg-sunk text-muted"}`}>{waiting} to do</span>}
      />
      {queues.length === 0 ? (
        <p className="text-[13px] text-muted">Nothing for your role to review.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {queues.map((q) => (
            <li key={q.href}>
              <Link href={q.href} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-soft">
                <span className={`flex size-9 flex-none items-center justify-center rounded-xl ${q.tone}`}>
                  <q.icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-[18px] font-semibold text-ink">{q.label}</span>
                  <span className="block truncate text-[11.5px] leading-4 text-subtle">{q.note}</span>
                </span>
                <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold ${q.count ? "bg-forest text-white" : "bg-sunk text-faint"}`}>
                  {q.count === undefined ? "–" : q.count > 98 ? "99+" : q.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Today's delivery and pickup split as a half-ring gauge. */
function MixCard({ delivery, pickup }: { delivery: number; pickup: number }) {
  const total = delivery + pickup;
  const share = total === 0 ? 0 : delivery / total;
  const r = 70;
  const arc = Math.PI * r;
  return (
    <Card>
      <CardTitle title="Delivery or pickup" action={<span className="text-xs font-medium text-subtle">Today</span>} />
      <div className="relative mx-auto h-[100px] w-[180px]">
        <svg viewBox="0 0 180 100" className="h-full w-full" aria-hidden>
          <path d={`M 20 90 A ${r} ${r} 0 0 1 160 90`} fill="none" stroke="#E6EBDD" strokeWidth="18" strokeLinecap="round" />
          {total > 0 ? (
            <path
              d={`M 20 90 A ${r} ${r} 0 0 1 160 90`}
              fill="none"
              stroke="#1E3B16"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.001, share) * arc} ${arc}`}
            />
          ) : null}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="font-display text-[24px] leading-7 font-extrabold text-ink">{total === 0 ? "–" : `${Math.round(share * 100)}%`}</p>
          <p className="text-[11px] text-subtle">delivered</p>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-5 text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <span aria-hidden className="size-2.5 rounded-full bg-forest" />
          Delivery <b className="text-ink">{delivery}</b>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span aria-hidden className="size-2.5 rounded-full bg-[#E6EBDD] shadow-[inset_0_0_0_1px_#D5DBCB]" />
          Pickup <b className="text-ink">{pickup}</b>
        </span>
      </div>
    </Card>
  );
}

/** The time in Lagos, ticking, and unread alerts, on deep green. */
function ClockCard({ alerts }: { alerts: number | undefined }) {
  const [now, setNow] = useState<Date | null>(null);
  // Starts after the first paint, so the server and browser render the same placeholder
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);
  const time = now ? now.toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "––:––:––";
  const date = now ? now.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }) : "";
  return (
    <section className="relative overflow-hidden rounded-[20px] bg-[radial-gradient(80%_70%_at_0%_100%,rgba(169,214,84,0.22)_0%,rgba(169,214,84,0)_70%),linear-gradient(160deg,#0B1A07_0%,#152E10_50%,#1E3B16_100%)] p-5 text-white shadow-[0_18px_40px_rgba(16,35,11,0.25)]">
      <div aria-hidden className="absolute -right-16 -bottom-24 size-56 rounded-full border border-lime/15" />
      <div aria-hidden className="absolute -right-6 -bottom-12 size-36 rounded-full border border-lime/10" />
      <p className="relative text-[13px] font-semibold text-on-forest">Lagos time</p>
      <p className="relative mt-2 font-display text-[30px] leading-9 font-extrabold tracking-[-0.01em] tabular-nums" suppressHydrationWarning>
        {time}
      </p>
      <p className="relative text-xs text-on-forest">{date}</p>
      <Link href={adminRoutes.alerts} className="relative mt-5 flex items-center gap-3 rounded-2xl bg-white/8 p-2.5 pr-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] hover:bg-white/12 hover:text-white">
        <span className="flex size-9 items-center justify-center rounded-xl bg-lime text-forest">
          <Bell aria-hidden className="size-4" strokeWidth={2.2} />
        </span>
        <span className="flex-1 text-[13px] font-semibold">
          {alerts === undefined ? "Alerts" : alerts === 0 ? "No unread alerts" : `${alerts} unread ${alerts === 1 ? "alert" : "alerts"}`}
        </span>
        <ArrowRight aria-hidden className="size-4 text-lime" strokeWidth={2.2} />
      </Link>
    </section>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 m:grid-cols-1" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-[150px] animate-pulse rounded-[20px] ${i === 0 ? "bg-forest/80" : "bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]"}`} />
      ))}
    </div>
  );
}
