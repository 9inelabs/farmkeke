// M-88 / F-75 Notification settings (?side=farm for the farm's alerts). The
// layout is AlertSettingsView; switches save straight away.
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { AlertSettingsView } from "@/features/push/AlertSettingsView";
import { askForPush, openPushSettings } from "@/features/push/push";
import { usePush } from "@/store/push";
import { tapFeedback } from "@/lib/haptics";
import { showToast } from "@/store/toast";

export default function NotificationSettings() {
  const { side: raw } = useLocalSearchParams<{ side?: string }>();
  const side = raw === "farm" ? "farm" : "shop";
  const prefs = useQuery(api.notifications.preferences, { side });
  const status = usePush((s) => s.status);
  const setStatus = usePush((s) => s.setStatus);
  // The switch moves at once; the server catches up
  const setPreference = useMutation(api.notifications.setPreference).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.notifications.preferences, { side: args.side });
    if (!current || args.channel === undefined) return;
    const channel = args.channel;
    store.setQuery(api.notifications.preferences, { side: args.side }, { ...current, alerts: current.alerts.map((a) => (a.alert === args.alert ? { ...a, [channel]: args.on } : a)) });
  });

  return (
    <AlertSettingsView
      side={side}
      prefs={prefs}
      status={status}
      onToggle={(alert, channel, on) => {
        tapFeedback();
        setPreference({ alert, channel, on, side }).catch(() => showToast({ message: "That didn't save. Try again.", tone: "error" }));
      }}
      onEnablePush={() => {
        if (status === "denied") openPushSettings();
        else void askForPush().then(setStatus);
      }}
    />
  );
}
