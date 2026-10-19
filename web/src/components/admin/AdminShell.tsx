"use client";

// The portal frame: sidebar (a drawer under 760px), top bar with alerts and
// the signed-in staff member, and the idle sign-out (30 minutes without any
// activity in any portal tab).
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Drawer } from "@/components/ui/Dialog";
import { admin } from "@/convex/admin";
import { initials } from "@/lib/format";
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
        <div key={g.label} className="mb-5">
          <p className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.08em] text-faint uppercase">{g.label}</p>
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
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] ${
                      on ? "bg-tint font-semibold text-forest" : "font-medium text-ink-2 hover:bg-soft hover:text-ink"
                    }`}
                  >
                    <Icon aria-hidden className="size-[18px] flex-none" strokeWidth={on ? 2.25 : 1.9} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {count > 0 ? (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-ink">
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
  const counts: Record<Badge, number> = {
    alerts: alerts ?? 0,
    applications: applications ?? 0,
    farmerApplications: farmerApps?.submitted ?? 0,
    productReview: review ?? 0,
  };
  const groups = visibleNav(me.can);
  const active = activeHref(pathname, groups);

  const doSignOut = async () => {
    await signOut();
    router.replace(adminRoutes.signIn());
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[256px] flex-col bg-surface shadow-[inset_-1px_0_0_var(--color-line)] m:hidden">
        <div className="flex h-16 flex-none items-center gap-2.5 px-5">
          <Link href={adminRoutes.home} aria-label="Farmkeke admin portal home" className="flex items-center">
            <Wordmark height={20} priority />
          </Link>
          <span className="badge b-held">Admin</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-6">
          <NavList groups={groups} active={active} counts={counts} />
        </div>
      </aside>

      <div className="pl-[256px] m:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-surface/95 px-8 shadow-[inset_0_-1px_0_var(--color-line)] backdrop-blur m:px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line-3)] m:inline-flex"
          >
            <Menu aria-hidden className="size-[18px]" />
            Menu
          </button>
          <div className="flex-1" />
          <Link
            href={adminRoutes.alerts}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-soft m:px-2"
          >
            <Bell aria-hidden className="size-[18px]" />
            <span>Alerts</span>
            {counts.alerts > 0 ? (
              <span className="rounded-full bg-error px-1.5 py-0.5 text-[11px] leading-none font-bold text-white">
                {counts.alerts > 98 ? "99+" : counts.alerts}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </Link>
          <Link href={adminRoutes.account} className="inline-flex min-h-11 items-center gap-2.5 rounded-xl py-1 pr-3 pl-1.5 hover:bg-soft">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
              {initials(me.name)}
            </span>
            <span className="flex flex-col leading-tight m:hidden">
              <span className="text-sm font-semibold text-ink">{me.name}</span>
              <span className="text-xs text-subtle">{me.role.name}</span>
            </span>
            <span className="sr-only m:not-sr-only m:text-sm m:font-semibold m:text-ink">Account</span>
          </Link>
          <button
            type="button"
            onClick={doSignOut}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-soft m:hidden"
          >
            <LogOut aria-hidden className="size-[18px]" />
            Sign out
          </button>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1200px] px-8 pt-8 pb-16 outline-none m:px-4 m:pt-5">
          {children}
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" width={320}>
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
