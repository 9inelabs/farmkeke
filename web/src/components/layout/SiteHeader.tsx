"use client";

// Landing and information pages header (Main, W-60, W-80 to W-88): a floating
// white bar with section links, "Shop on the web" and "Get the app".
// On phones the links fold into a "Menu" button (text label, not icon-only).
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeLogo } from "@/components/brand/Wordmark";
import { AnimatePresence, m, pressable, transition } from "@/lib/motion";
import { routes } from "@/lib/routes";

const LINKS = [
  { href: routes.howItWorks, label: "How it works" },
  { href: `${routes.home}#shoppers`, label: "For shoppers" },
  { href: routes.sell, label: "For farmers" },
  { href: routes.help, label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof next === "function" ? next(open) : next) ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="wrap-site relative z-40 pt-5">
      <nav
        aria-label="Main"
        className="flex h-[66px] items-center gap-5 rounded-[18px] bg-surface pr-3 pl-5 shadow-[inset_0_0_0_1px_var(--color-line)] m:gap-2 m:pr-2 m:pl-4"
      >
        <span className="contents m:hidden">
          <HomeLogo height={24} />
        </span>
        <span className="hidden m:contents">
          <HomeLogo height={19} />
        </span>
        <div className="flex flex-1 justify-center gap-8 m:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-3 hover:text-ink aria-[current=page]:text-forest aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-lime)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden flex-1 m:block" />
        <m.span {...pressable} className="m:hidden">
          <Link href={routes.shop} className="btn sm ghost">
            Shop on the web
          </Link>
        </m.span>
        <m.span {...pressable}>
          <Link href={routes.getTheApp} className="btn sm lime m:px-3">
            Get the app
          </Link>
        </m.span>
        <button
          type="button"
          className="btn sm ghost hidden m:inline-flex m:px-3"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden className="size-[18px]" /> : <Menu aria-hidden className="size-[18px]" />}
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      <AnimatePresence>
        {open ? (
          <m.div
            id="site-menu"
            className="absolute inset-x-5 top-[94px] rounded-[18px] bg-surface p-2 shadow-[inset_0_0_0_1px_var(--color-line),0_18px_40px_rgba(20,28,16,0.14)]"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition.base}
          >
            <ul className="m-0 list-none p-0">
              {[
                ...LINKS,
                { href: routes.shop, label: "Shop on the web" },
                { href: routes.findOrder, label: "Find my order" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-12 items-center rounded-xl px-4 text-base font-semibold text-ink hover:bg-canvas"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
