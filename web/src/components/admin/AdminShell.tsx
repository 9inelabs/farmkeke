"use client";

// The portal frame: sidebar (a drawer under 760px), top bar with alerts and
// the signed-in staff member, and the idle sign-out (30 minutes without any
// activity in any portal tab).
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { ArrowUpRight, Bell, LogOut, Menu, MessageSquare, Search, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Drawer } from "@/components/ui/Dialog";
import { admin } from "@/convex/admin";
import { initials } from "@/lib/format";
import { SITE_URL } from "@/lib/siteUrl";
import { useStaff } from "./context";
import { activeHref, visibleNav, type Badge, type NavGroup } from "./nav";
import { adminRoutes } from "./routes";

const IDLE_MS = 30 * 60 * 1000;
const ACTIVE_KEY = "fk.admin.lastActive";

function useIdleSignOut() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const last = useRef(0);
  useEffect(() => {
    last.current = Date.now();
    let wrote = 0;
    const touch = () => {
      const now = Date.now();
      last.current = now;
      // Shared across tabs, written at most every 15 seconds
      if (now - wrote > 15_000) {
        wrote = now;
        try {
          window.localStorage.setItem(ACTIVE_KEY, String(now));
        } catch {
          // Storage blocked: this tab still tracks its own activity.
        }
      }
    };
    const events = ["pointerdown", "keydown", "mousemove", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      let shared = 0;
      try {
        shared = Number(window.localStorage.getItem(ACTIVE_KEY) ?? 0);
      } catch {
        shared = 0;
      }
      if (Date.now() - Math.max(last.current, shared) > IDLE_MS) {
        window.clearInterval(timer);
        void signOut().then(() => router.replace(`${adminRoutes.signIn()}?reason=idle`));
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [signOut, router]);
}

function NavList({ groups, active, counts, onNavigate }: { groups: NavGroup[]; active: string | null; counts: Record<Badge, number>; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin portal">
      {groups.map((g) => (
        <div key={g.label} className="mb-4">
          <p className="mb-1 px-3 text-[10.5px] font-bold tracking-[0.1em] text-faint uppercase">{g.label}</p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {g.items.map((item) => {
              const on = active === item.href;
              const count = item.badge ? counts[item.badge] : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors ${
                      on
                        ? "bg-[linear-gradient(90deg,#EAF4D9_0%,rgba(242,248,230,0.4)_100%)] font-semibold text-forest"
                        : "font-medium text-muted hover:bg-soft hover:text-ink"
                    }`}
                  >
                    {on ? <span aria-hidden className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-forest" /> : null}
                    <Icon aria-hidden className="size-[17px] flex-none" strokeWidth={on ? 2.25 : 1.8} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {count > 0 ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${on ? "bg-forest text-white" : "bg-lime text-forest"}`}>
                        {count > 98 ? "99+" : count}
                        <span className="sr-only"> waiting</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const me = useStaff();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [menuOpen, setMenuOpen] = useState(false);
  useIdleSignOut();

  const alerts = useQuery(admin.staff.unreadAlerts, {}) as number | undefined;
  const applications = useQuery(admin.staff.pendingCount, me.can("staff.view") ? {} : "skip") as number | undefined;
  const farmerApps = useQuery(admin.farmerRequests.counts, me.can("farmers.view") ? {} : "skip") as
    | { submitted: number }
    | undefined;
  const review = useQuery(admin.listings.queueCount, me.can("listings.view") ? {} : "skip") as number | undefined;
  const ridersPending = useQuery(admin.riders.pendingCount, me.can("riders.view") ? {} : "skip") as number | undefined;
  const disputes = useQuery(admin.disputes.openCount, me.can("disputes.view") ? {} : "skip") as number | undefined;
  const support = useQuery(admin.support.openCount, me.can("support.view") ? {} : "skip") as number | undefined;
  const money = useQuery(admin.money.overview, me.can("money.view") ? {} : "skip") as { refundsFailed: number; farmsWithProblem: number } | undefined;
  const toPrice = useQuery(admin.dispatch.needsPriceCount, me.can("dispatch.manage") ? {} : "skip") as number | undefined;
  const counts: Record<Badge, number> = {
    alerts: alerts ?? 0,
    applications: applications ?? 0,
    farmerApplications: farmerApps?.submitted ?? 0,
    productReview: review ?? 0,
    ridersPending: ridersPending ?? 0,
    disputes: disputes ?? 0,
    support: support ?? 0,
    moneyProblems: money?.refundsFailed ?? 0,
    farmsNotPayable: money?.farmsWithProblem ?? 0,
    deliveryToPrice: toPrice ?? 0,
  };
  const groups = visibleNav(me.can);
  const active = activeHref(pathname, groups);

  const doSignOut = async () => {
    await signOut();
    router.replace(adminRoutes.signIn());
  };

  return (
    <div className="min-h-dvh bg-[#F1F3ED]">
      <aside className="fixed inset-y-3 left-3 z-30 flex w-[244px] flex-col overflow-hidden rounded-[22px] bg-surface shadow-[0_1px_2px_rgba(16,35,11,0.04),inset_0_0_0_1px_var(--color-line)] m:hidden">
        <div className="flex h-[68px] flex-none items-center gap-2.5 px-5">
          <Link href={adminRoutes.home} aria-label="Farmkeke admin portal home" className="flex items-center">
            <Wordmark height={19} priority />
          </Link>
          <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-forest uppercase">Admin</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <NavList groups={groups} active={active} counts={counts} />
        </div>
        {/* The shop as customers see it */}
        <div className="relative m-3 mt-0 flex-none overflow-hidden rounded-[18px] bg-[radial-gradient(80%_70%_at_100%_0%,rgba(169,214,84,0.35)_0%,rgba(169,214,84,0)_70%),linear-gradient(155deg,#0B1A07_0%,#152E10_55%,#1E3B16_100%)] p-4 text-white">
          <div aria-hidden className="absolute -right-8 -bottom-10 size-32 rounded-full border border-lime/20" />
          <div aria-hidden className="absolute -right-2 -bottom-4 size-20 rounded-full border border-lime/15" />
          <Store aria-hidden className="relative size-5 text-lime" strokeWidth={1.8} />
          <p className="relative mt-2.5 text-[13px] leading-[18px] font-semibold">See the shop as customers do</p>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="relative mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-lime px-3 text-xs font-bold text-forest hover:bg-lime-hover"
          >
            Open farmkeke.com
            <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2.25} />
          </a>
        </div>
      </aside>

      <div className="pl-[268px] m:pl-0">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-2 bg-[#F1F3ED]/90 px-7 backdrop-blur m:h-16 m:bg-surface/95 m:px-4 m:shadow-[inset_0_-1px_0_var(--color-line)]">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line-3)] m:inline-flex"
          >
            <Menu aria-hidden className="size-[18px]" />
            Menu
          </button>
          <form
            role="search"
            className="relative flex flex-1 justify-start"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(adminRoutes.search(typeof q === "string" ? q.trim() : ""));
            }}
          >
            <label htmlFor="admin-search" className="sr-only">
              Search orders, people, farms and products
            </label>
            <span className="relative m:hidden">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" strokeWidth={2} />
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder="Search orders, people, farms, products"
                className="h-11 w-[400px] rounded-full border-0 bg-surface pr-4 pl-11 text-[13.5px] text-ink shadow-[inset_0_0_0_1px_var(--color-line)] outline-none placeholder:text-faint focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-forest),0_0_0_4px_rgba(169,214,84,0.3)]"
              />
            </span>
            <Link href={adminRoutes.search()} className="hidden min-h-11 min-w-11 items-center justify-center rounded-xl text-ink hover:bg-soft m:inline-flex">
              <Search aria-hidden className="size-[18px]" />
              <span className="sr-only">Search</span>
            </Link>
          </form>
          {me.can("support.view") ? (
            <Link
              href={adminRoutes.support}
              aria-label={`Support messages${counts.support > 0 ? `, ${counts.support} waiting` : ""}`}
              className="relative inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-soft m:hidden"
            >
              <MessageSquare aria-hidden className="size-[18px]" strokeWidth={1.8} />
              {counts.support > 0 ? <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-lime ring-2 ring-white" /> : null}
            </Link>
          ) : null}
          <Link
            href={adminRoutes.alerts}
            aria-label={`Alerts${counts.alerts > 0 ? `, ${counts.alerts} unread` : ""}`}
            className="relative inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-soft"
          >
            <Bell aria-hidden className="size-[18px]" strokeWidth={1.8} />
            {counts.alerts > 0 ? (
              <span aria-hidden className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-error px-1 py-0.5 text-center text-[10px] leading-none font-bold text-white ring-2 ring-[#F1F3ED]">
                {counts.alerts > 98 ? "99+" : counts.alerts}
              </span>
            ) : null}
          </Link>
          <span aria-hidden className="mx-1.5 h-7 w-px bg-line-2 m:hidden" />
          <Link href={adminRoutes.account} className="inline-flex min-h-11 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 hover:bg-surface">
            {me.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a Convex storage URL, already sized
              <img src={me.photoUrl} alt="" className="size-9 flex-none rounded-full object-cover ring-2 ring-white" />
            ) : (
              <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2B5220,#1E3B16)] text-xs font-bold text-lime ring-2 ring-white">
                {initials(me.name)}
              </span>
            )}
            <span className="flex flex-col leading-tight m:hidden">
              <span className="text-[13.5px] font-semibold text-ink">{me.name}</span>
              <span className="text-[11.5px] text-subtle">{me.role.name}</span>
            </span>
            <span className="sr-only m:not-sr-only m:text-sm m:font-semibold m:text-ink">Account</span>
          </Link>
          <button
            type="button"
            onClick={doSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink m:hidden"
          >
            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.8} />
          </button>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1280px] px-7 pt-3 pb-16 outline-none m:px-4 m:pt-5">
          {children}
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" width={320} side="left">
        <NavList groups={groups} active={active} counts={counts} onNavigate={() => setMenuOpen(false)} />
        <button
          type="button"
          onClick={doSignOut}
          className="mt-2 inline-flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] font-semibold text-ink hover:bg-soft"
        >
          <LogOut aria-hidden className="size-[18px]" />
          Sign out
        </button>
      </Drawer>
    </div>
  );
}
