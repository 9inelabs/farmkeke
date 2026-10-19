"use client";

// Maintenance mode (the app shows its maintenance screen and the website
// redirects to /maintenance; the admin portal keeps working) and the app's
// update settings: the oldest version allowed, the latest version, and the
// store links.
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { FormError } from "@/components/admin/errors";
import { Facts, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { admin } from "@/convex/admin";
import { api } from "@/convex/api";
import type { AppConfig } from "@/convex/returns/system";
import { dateTime } from "@/lib/format";

const localInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function PlatformView() {
  const config = useQuery(api.appConfig.get, {}) as AppConfig | undefined;
  const setStatus = useMutation(admin.platform.setAppStatus);
  const [dialog, setDialog] = useState<"maintenance" | "app" | null>(null);
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [minV, setMinV] = useState("");
  const [latestV, setLatestV] = useState("");
  const [android, setAndroid] = useState("");
  const [ios, setIos] = useState("");
  const [done, setDone] = useState<string | null>(null);

  if (config === undefined) return <TableSkeleton />;
  const c = config as AppConfig & {
    minAppVersion?: string;
    latestAppVersion?: string;
    androidStoreUrl?: string;
    iosStoreUrl?: string;
    maintenanceMessage?: string;
    maintenanceUntil?: number;
  };

  return (
    <>
      <PageHeader title="Maintenance and app" description="Take the shop offline for maintenance, or ask app users to update." />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="flex flex-col gap-6">
        <Panel
          title="Maintenance"
          description="Shoppers and farmers see a maintenance screen in the app, and the website shows its maintenance page. The admin portal keeps working."
          actions={
            <Button
              variant={c.maintenanceActive ? "lime" : "ghost"}
              size="sm"
              onClick={() => {
                setOn(!c.maintenanceActive);
                setMessage(c.maintenanceMessage ?? "");
                setUntil(c.maintenanceUntil ? localInput(c.maintenanceUntil) : "");
                setDialog("maintenance");
              }}
            >
              {c.maintenanceActive ? "End maintenance" : "Start maintenance"}
            </Button>
          }
        >
          {c.maintenanceActive ? (
            <Notice tone="err">Maintenance is on. The shop is offline.</Notice>
          ) : (
            <Notice tone="ok">The shop is open.</Notice>
          )}
          <div className="mt-4">
            <Facts
              items={[
                { label: "Message", value: c.maintenanceMessage || "The default message" },
                { label: "Expected back", value: c.maintenanceUntil ? dateTime(c.maintenanceUntil) : "Not set" },
              ]}
            />
          </div>
        </Panel>
        <Panel
          title="App versions and store links"
          description="Apps older than the oldest allowed version must update before they can be used. Newer versions are suggested."
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMinV(c.minAppVersion ?? "0.0.0");
                setLatestV(c.latestAppVersion ?? "0.0.0");
                setAndroid(c.androidStoreUrl ?? "");
                setIos(c.iosStoreUrl ?? "");
                setDialog("app");
              }}
            >
              Change
            </Button>
          }
        >
          <Facts
            items={[
              { label: "Oldest allowed version", value: c.minAppVersion ?? "0.0.0" },
              { label: "Latest version", value: c.latestAppVersion ?? "0.0.0" },
              { label: "Google Play link", value: c.androidStoreUrl || "Not set" },
              { label: "App Store link", value: c.iosStoreUrl || "Not set" },
            ]}
          />
        </Panel>
      </div>
      <ReasonDialog
        open={dialog === "maintenance"}
        onClose={() => setDialog(null)}
        title={on ? "Start maintenance" : "End maintenance"}
        description={on ? "The shop goes offline straight away for everyone except staff on this portal." : "The shop opens again straight away."}
        confirmLabel={on ? "Start maintenance" : "End maintenance"}
        variant={on ? "danger" : "lime"}
        onConfirm={async (reason) => {
          const untilMs = until ? new Date(until).getTime() : undefined;
          await setStatus({
            maintenanceActive: on,
            ...(on ? { maintenanceMessage: message.trim() || undefined, maintenanceUntil: untilMs } : {}),
            reason,
          });
          setDone(on ? "Maintenance is on." : "Maintenance is off. The shop is open.");
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">Maintenance on</span>
          <Switch label="Maintenance on" checked={on} onChange={setOn} />
        </div>
        {on ? (
          <>
            <TextArea
              label="Message"
              labelNote="(optional)"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              hint="Shown on the maintenance screen."
              className="[&_textarea]:h-auto [&_textarea]:py-3"
            />
            <TextField label="Expected back" labelNote="(optional)" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          </>
        ) : null}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "app"}
        onClose={() => setDialog(null)}
        title="App versions and store links"
        confirmLabel="Save"
        onConfirm={async (reason) => {
          const ver = /^\d+\.\d+\.\d+$/;
          if (!ver.test(minV) || !ver.test(latestV)) throw new FormError("Versions look like 1.2.3.");
          await setStatus({
            minAppVersion: minV,
            latestAppVersion: latestV,
            androidStoreUrl: android.trim() || undefined,
            iosStoreUrl: ios.trim() || undefined,
            reason,
          });
          setDone("App settings saved.");
        }}
      >
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="Oldest allowed version" value={minV} onChange={(e) => setMinV(e.target.value)} placeholder="1.0.0" />
          <TextField label="Latest version" value={latestV} onChange={(e) => setLatestV(e.target.value)} placeholder="1.0.3" />
        </div>
        <TextField label="Google Play link" type="url" value={android} onChange={(e) => setAndroid(e.target.value)} />
        <TextField label="App Store link" type="url" value={ios} onChange={(e) => setIos(e.target.value)} />
      </ReasonDialog>
    </>
  );
}
