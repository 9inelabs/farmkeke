// Push for the whole app (Phase 9), mounted once in the root layout:
// - keeps this phone's token registered to whoever is signed in;
// - a push that arrives while the app is open shows as the Island toast;
// - tapping a push opens its screen, in the right mode (a farm push opens
//   farmer mode, switching if the person was shopping), and marks it read;
// - the app icon badge follows the unread count (iOS).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { usePrefs, usePrefsHydrated } from "@/store/prefs";
import { usePush } from "@/store/push";
import { showToast } from "@/store/toast";
import { ensureChannel, pushPlatform, pushSupported, readPushStatus, readPushToken } from "./push";

type PushData = { href: string; side: "shop" | "farm"; notificationId: string | null };

// The backend's data: { href, kind, notificationId, side }
function dataOf(n: Notifications.Notification): PushData | null {
  const d = n.request.content.data as Record<string, unknown> | null | undefined;
  if (!d || typeof d.href !== "string" || !d.href.startsWith("/")) return null;
  return { href: d.href, side: d.side === "farm" ? "farm" : "shop", notificationId: typeof d.notificationId === "string" ? d.notificationId : null };
}

// In the app, pushes show as the Island toast instead of the system banner
if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export function PushManager() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hydrated = usePrefsHydrated();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const shopUnread = useQuery(api.notifications.unreadCount, isAuthenticated ? { side: "shop" } : "skip");
  const farmUnread = useQuery(api.notifications.unreadCount, isAuthenticated ? { side: "farm" } : "skip");
  const register = useMutation(api.notifications.registerPushToken);
  const markRead = useMutation(api.notifications.markRead);
  const status = usePush((s) => s.status);
  const setStatus = usePush((s) => s.setStatus);
  const ready = hydrated && !isLoading;
  const viewerId = viewer?._id ?? null;

  // The permission can change in the phone's Settings: read it again on return
  useEffect(() => {
    const refresh = () => void readPushStatus().then(setStatus);
    refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [setStatus]);

  // Register the token to whoever is signed in (it moves when someone else signs in)
  useEffect(() => {
    if (status !== "granted" || viewerId === null) return;
    let cancelled = false;
    void (async () => {
      await ensureChannel();
      const token = await readPushToken();
      const saved = usePush.getState();
      if (cancelled || token === null || (token === saved.token && saved.tokenUserId === viewerId)) return;
      await register({ platform: pushPlatform(), token });
      usePush.getState().setRegistered(token, viewerId);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, viewerId, register]);

  const open = useCallback(
    (d: PushData) => {
      if (d.notificationId) void markRead({ notificationId: d.notificationId as Id<"notifications"> }).catch(() => undefined);
      const prefs = usePrefs.getState();
      if (prefs.mode !== d.side) {
        prefs.setMode(d.side);
        if (router.canDismiss()) router.dismissAll();
        router.replace(d.side === "farm" ? "/dashboard" : "/home");
      }
      router.push(d.href as Href);
    },
    [markRead],
  );

  // While the app is open
  useEffect(() => {
    if (!pushSupported) return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const d = dataOf(n);
      showToast({ message: n.request.content.title ?? "New update", tone: "info", action: d ? { label: "View", onPress: () => open(d) } : undefined });
    });
    return () => sub.remove();
  }, [open]);

  // Taps, including the one that launched the app (once the app has its bearings)
  useEffect(() => {
    if (!pushSupported || !ready) return;
    const seen = new Set<string>();
    const handle = (r: Notifications.NotificationResponse) => {
      const id = r.notification.request.identifier;
      if (seen.has(id) || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      seen.add(id);
      Notifications.clearLastNotificationResponse();
      const d = dataOf(r.notification);
      if (d) open(d);
    };
    const launch = Notifications.getLastNotificationResponse();
    // After the splash has sent the person to their home screen
    const t = launch ? setTimeout(() => handle(launch), 400) : undefined;
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => {
      if (t) clearTimeout(t);
      sub.remove();
    };
  }, [ready, open]);

  // The app icon's badge (iOS; Android launchers count notifications themselves)
  const unread = (shopUnread ?? 0) + (farmUnread ?? 0);
  useEffect(() => {
    if (Platform.OS !== "ios" || status !== "granted") return;
    void Notifications.setBadgeCountAsync(isAuthenticated ? unread : 0).catch(() => undefined);
  }, [unread, status, isAuthenticated]);

  return null;
}
