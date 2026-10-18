"use client";

// W-48 Notification preferences: SMS and email per alert type
// (notifications.preferences / .setPreference, side "shop"). Changes save as
// soon as a switch is flipped. Money alerts are locked on.
import { useMutation, useQuery } from "convex/react";
import { Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { api } from "@/convex/api";
import type { NotificationPrefs } from "@/convex/returns/account";
import { routes } from "@/lib/routes";

export function NotificationsView() {
  return (
    <AccountShell>
      <Notifications />
    </AccountShell>
  );
}

type Channel = "sms" | "email";
const row = "grid grid-cols-[minmax(0,1fr)_90px_90px] items-center gap-3 px-6 m:grid-cols-[minmax(0,1fr)_76px_76px] m:gap-2 m:px-4";

function Notifications() {
  const prefs = useQuery(api.notifications.preferences, { side: "shop" }) as NotificationPrefs | undefined;
  const set = useMutation(api.notifications.setPreference).withOptimisticUpdate((store, args) => {
    const cur = store.getQuery(api.notifications.preferences, { side: "shop" }) as NotificationPrefs | undefined;
    if (!cur) return;
    store.setQuery(
      api.notifications.preferences,
      { side: "shop" },
      { ...cur, alerts: cur.alerts.map((a) => (a.alert === args.alert && args.channel ? { ...a, [args.channel]: args.on } : a)) },
    );
  });
  const [error, setError] = useState<string | null>(null);

  const flip = async (alert: string, channel: Channel, on: boolean) => {
    setError(null);
    try {
      await set({ side: "shop", alert, channel, on });
    } catch {
      setError("We couldn't save that change. Check your connection and try again.");
    }
  };

  return (
    <>
      <AccountTitle title="Notifications" sub="Choose how we reach you. Changes save automatically." />
      <section aria-label="Notification settings" className="card overflow-hidden">
        <div className={`${row} bg-[#FAFBF8] py-3.5 text-xs font-bold text-muted-2`} aria-hidden>
          <span>Type</span>
          <span className="text-center">SMS</span>
          <span className="text-center">Email</span>
        </div>
        {prefs === undefined ? (
          <div className="flex flex-col gap-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : prefs === null ? (
          <p className="sm p-6">We couldn&apos;t load your settings. Refresh the page to try again.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {prefs.alerts.map((a) => (
              <li key={a.alert} className={`${row} py-[18px] shadow-[inset_0_1px_0_#EEF0EB]`}>
                <div>
                  <div className="text-[15px] font-semibold">{a.title}</div>
                  <div className="sm mt-0.5">{a.description}</div>
                </div>
                <span className="justify-self-center">
                  <Switch label={`${a.title} by SMS`} checked={a.sms} locked={a.locked} onChange={(on) => flip(a.alert, "sms", on)} />
                </span>
                <span className="justify-self-center">
                  <Switch
                    label={`${a.title} by email`}
                    checked={a.email}
                    locked={a.locked}
                    onChange={(on) => flip(a.alert, "email", on)}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error ? (
        <p role="alert" className="field-error m-0">
          {error}
        </p>
      ) : null}
      <div className="flex items-start gap-3 rounded-[14px] bg-[#F4F7EE] px-[18px] py-4">
        <Info aria-hidden className="size-5 flex-none text-forest" strokeWidth={1.75} />
        <p className="sm m-0 text-[#2E3A28]">
          Payment and refund messages are always sent so you never miss a change to your money. For instant alerts and chat,{" "}
          <Link href={routes.getTheApp} className="font-semibold">
            get the app
          </Link>{" "}
          and turn on push notifications.
        </p>
      </div>
    </>
  );
}
