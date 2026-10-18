"use client";

// W-88 Cookie banner and settings. Mounted in the root layout.
// - The banner shows until the visitor chooses (stored by @/lib/consent).
// - "Choose cookies" opens the settings modal; a footer link can reopen it
//   with openCookieSettings() or <CookieSettingsButton />.
// - Phones: the banner sits at the bottom edge with safe-area padding, and
//   the page gets matching bottom padding so its last buttons can scroll
//   clear of it.
import { Check, Cookie, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import {
  acceptAllCookies,
  closeCookieSettings,
  consent,
  cookieSettings,
  onlyNecessaryCookies,
  openCookieSettings,
  saveConsent,
  useConsent,
} from "@/lib/consent";
import { AnimatePresence, m, transition } from "@/lib/motion";
import { routes } from "@/lib/routes";

const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function CookieBanner() {
  const mounted = useMounted();
  const { decided } = useConsent();
  const settingsOpen = cookieSettings.use();
  // "Show banner again" from the saved toast reopens the banner.
  const [reopened, setReopened] = useState(false);
  const [toast, setToast] = useState(false);

  const showBanner = mounted && (!decided || reopened) && !settingsOpen;

  const after = (choose: () => void) => {
    choose();
    setReopened(false);
    closeCookieSettings();
    setToast(true);
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <>
      <AnimatePresence>{showBanner ? <Banner key="banner" onChoose={after} /> : null}</AnimatePresence>
      <CookieSettings open={mounted && settingsOpen} onChoose={after} />
      <AnimatePresence>
        {toast && !showBanner && !settingsOpen ? (
          <m.div
            key="toast"
            role="status"
            className="fixed bottom-8 left-1/2 z-40 m:bottom-[calc(16px+env(safe-area-inset-bottom))] m:w-[calc(100%-32px)]"
            initial={{ opacity: 0, x: "-50%", y: 12 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 12 }}
            transition={transition.base}
          >
            <div className="flex items-center gap-3.5 rounded-[14px] bg-forest py-3 pr-3.5 pl-[18px] text-sm text-white shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
              <Check aria-hidden className="size-[18px] flex-none text-lime" strokeWidth={2.25} />
              <span className="flex-1 whitespace-nowrap m:whitespace-normal">Your cookie choices are saved</span>
              <button
                type="button"
                onClick={() => {
                  setToast(false);
                  setReopened(true);
                }}
                className="btn sm flex-none bg-white/12 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCw aria-hidden className="size-[15px]" />
                Show banner again
              </button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Banner({ onChoose }: { onChoose: (choose: () => void) => void }) {
  const ref = useRef<HTMLElement>(null);

  // Give the page room at the bottom so the banner never hides its last buttons.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const body = document.body;
    const before = body.style.paddingBottom;
    const apply = () => {
      const gap = window.matchMedia("(max-width: 760px)").matches ? 0 : 32;
      body.style.paddingBottom = `${el.offsetHeight + gap}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      body.style.paddingBottom = before;
    };
  }, []);

  return (
    <m.section
      ref={ref}
      aria-label="Cookie choices"
      className="fixed right-8 bottom-8 left-8 z-40 flex items-center gap-6 rounded-[22px] bg-surface px-7 py-6 shadow-[inset_0_0_0_1px_var(--color-line),0_24px_60px_rgba(30,59,22,0.18)] m:right-0 m:bottom-0 m:left-0 m:flex-col m:items-stretch m:gap-4 m:rounded-b-none m:px-4 m:pt-4 m:pb-[calc(16px+env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={transition.base}
    >
      <div className="flex flex-1 items-center gap-6 m:items-start m:gap-3.5">
        <span className="tile size-[52px] rounded-[15px] m:size-11 m:rounded-[13px]" aria-hidden>
          <Cookie className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mont text-base font-bold">We use cookies</div>
          <p className="p mt-1 text-sm leading-[22px] m:text-[13px] m:leading-5">
            Some cookies keep the site working, like your cart and sign-in. Others help us understand how the site is used
            so we can improve it.{" "}
            <Link href={routes.legal("cookies")} className="font-semibold underline">
              Cookie policy
            </Link>
          </p>
        </div>
      </div>
      <div className="flex flex-none gap-2.5 m:grid m:grid-cols-2">
        <button type="button" className="btn sm ghost m:col-span-2 m:min-h-11" onClick={openCookieSettings}>
          <Settings aria-hidden className="size-4" />
          Choose cookies
        </button>
        <button type="button" className="btn sm ghost m:min-h-11" onClick={() => onChoose(onlyNecessaryCookies)}>
          Only necessary
        </button>
        <button type="button" className="btn sm lime m:min-h-11" onClick={() => onChoose(acceptAllCookies)}>
          <Check aria-hidden className="size-4" />
          Accept all
        </button>
      </div>
    </m.section>
  );
}

function CookieSettings({ open, onChoose }: { open: boolean; onChoose: (choose: () => void) => void }) {
  return (
    <Modal
      open={open}
      onClose={closeCookieSettings}
      title={<span className="mont text-[21px] font-bold">Cookie settings</span>}
      description="Choose which cookies Farmkeke can use. You can change this any time from the footer."
      width={560}
    >
      {/* Mounted only while open, so the switches start from the saved choice each time. */}
      {open ? <SettingsBody onChoose={onChoose} /> : null}
    </Modal>
  );
}

function SettingsBody({ onChoose }: { onChoose: (choose: () => void) => void }) {
  const [saved] = useState(() => consent.get());
  const [analytics, setAnalytics] = useState(saved?.analytics ?? false);
  const [marketing, setMarketing] = useState(saved?.marketing ?? false);

  return (
    <>
      <div className="mt-2.5">
        <Row
          name="Necessary"
          body="Keep you signed in, remember your cart and area, and keep payments secure. Always on."
          control={<Switch checked locked label="Necessary cookies" />}
        />
        <Row
          name="Analytics"
          body="Help us see which pages are used, so we can make the site faster and easier."
          control={<Switch checked={analytics} onChange={setAnalytics} label="Analytics cookies" />}
        />
        <Row
          name="Marketing"
          body="Show you relevant Farmkeke offers on other websites."
          control={<Switch checked={marketing} onChange={setMarketing} label="Marketing cookies" />}
        />
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-2.5">
        <button type="button" className="btn sm ghost" onClick={() => onChoose(() => saveConsent({ analytics, marketing }))}>
          Save my choices
        </button>
        <button type="button" className="btn sm lime" onClick={() => onChoose(acceptAllCookies)}>
          <Check aria-hidden className="size-4" />
          Accept all
        </button>
      </div>
    </>
  );
}

function Row({ name, body, control }: { name: string; body: string; control: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-4 [&+&]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{name}</div>
        <div className="p mt-0.5 text-[13px] leading-5">{body}</div>
      </div>
      <div className="-my-2.5 flex-none">{control}</div>
    </div>
  );
}
