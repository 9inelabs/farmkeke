"use client";

// Frame for every /account page (W-43 to W-49): the account menu on the left,
// the page on the right (stacked on phones). Guests and signed-out visitors
// are sent to sign in, and come back here afterwards.
import { useAuthActions } from "@convex-dev/auth/react";
import { Bell, CircleHelp, Heart, LayoutDashboard, LogOut, MapPin, Package, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { useViewer } from "@/lib/auth";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { forgetShortSession } from "./SessionKeeper";

const NAV = [
  { href: routes.account, label: "Overview", icon: LayoutDashboard },
  { href: routes.myOrders, label: "My orders", icon: Package },
  { href: routes.saved, label: "Saved items", icon: Heart },
  { href: routes.addresses, label: "Addresses", icon: MapPin },
  { href: routes.profile, label: "Profile and login", icon: User },
  { href: routes.notifications, label: "Notifications", icon: Bell },
];

const navItem =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-left text-sm font-medium text-ink-3 hover:bg-soft hover:text-ink";

export function AccountShell({ children, skeleton }: { children: ReactNode; skeleton?: ReactNode }) {
  const { status } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const out = status === "signed-out" || status === "guest";

  useEffect(() => {
    if (out && !leaving) router.replace(routes.signIn(pathname));
  }, [out, leaving, router, pathname]);

  return (
    <div className="wrap grid grid-cols-[260px_minmax(0,1fr)] items-start gap-7 pt-8 m:grid-cols-1">
      <AccountNav pathname={pathname} onSignOut={() => setLeaving(true)} />
      {status === "signed-in" ? (
        <Reveal className="flex min-w-0 flex-col gap-5">{children}</Reveal>
      ) : (
        <LoadingRegion label="Loading your account">{skeleton ?? <PageSkeleton />}</LoadingRegion>
      )}
    </div>
  );
}

function AccountNav({ pathname, onSignOut }: { pathname: string; onSignOut: () => void }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const leave = async () => {
    setBusy(true);
    onSignOut();
    forgetShortSession();
    await signOut().catch(() => undefined);
    router.push(routes.home);
  };
  return (
    <nav aria-label="Account" className="card flex flex-col gap-0.5 p-2.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const on = href === routes.account ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`${navItem} ${on ? "bg-tint font-semibold text-forest hover:bg-tint hover:text-forest" : ""}`}
          >
            <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
      <hr className="mx-1 my-2 h-px border-0 bg-line-soft" />
      <Link href={routes.help} className={navItem}>
        <CircleHelp aria-hidden className="size-[18px]" strokeWidth={1.75} />
        Help and support
      </Link>
      <button type="button" onClick={leave} disabled={busy} aria-busy={busy || undefined} className={navItem}>
        <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
        Sign out
      </button>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-[220px] w-full" rounded={18} />
      <Skeleton className="h-[160px] w-full" rounded={18} />
    </div>
  );
}

/** Page title block used across the account pages. */
export function AccountTitle({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] m:text-[26px] m:leading-[34px]">
          {title}
        </h1>
        {sub ? <p className="p mt-1">{sub}</p> : null}
      </div>
      {aside}
    </div>
  );
}
