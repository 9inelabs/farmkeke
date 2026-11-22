// Push for the whole app (Phase 9), mounted once in the root layout:
// - makes the Android channel at startup (Android 13+ won't show the
//   permission prompt, or issue a token, without one);
// - asks a signed-in shopper to turn push on (the primer, M-48) a moment
//   after Home first opens; farmers are asked by the farm tabs (F-12), and
//   Settings > Notifications can ask again later;
// - keeps this phone's token registered to whoever is signed in: once per
//   app run, again when the phone's token changes, and on return to the app
//   until it succeeds;
// - a push that arrives while the app is open shows as the phone's own
//   banner, with sound, as it does when the app is closed;
// - tapping a push opens its screen, in the right mode (a farm push opens
//   farmer mode, switching if the person was shopping), and marks it read;
// - the app icon badge follows the unread count (iOS).
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { router, usePathname, type Href } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { usePrefs, usePrefsHydrated } from "@/store/prefs";
import { usePush } from "@/store/push";
import { PushPrimer, usePrimer } from "./PushPrimer";
import { ensureChannel, pushPlatform, pushSupported, readPushStatus, readPushToken } from "./push";

type PushData = { href: string; side: "shop" | "farm"; kind: string; notificationId: string | null };

// The backend's data: { href, kind, notificationId, side }
function dataOf(n: Notifications.Notification): PushData | null {
  const d = n.request.content.data as Record<string, unknown> | null | undefined;
  if (!d || typeof d.href !== "string" || !d.href.startsWith("/")) return null;
  return {
    href: d.href,
    side: d.side === "farm" ? "farm" : "shop",
    kind: typeof d.kind === "string" ? d.kind : "",
    notificationId: typeof d.notificationId === "string" ? d.notificationId : null,
  };
}

// Set when this module loads (the root layout imports it), before any push
// can arrive. Without a handler, a push that lands while the app is open
// isn't shown at all.
if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

export function PushManager() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hydrated = usePrefsHydrated();
  const mode = usePrefs((s) => s.mode);
  const pathname = usePathname();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const shopUnread = useQuery(api.notifications.unreadCount, isAuthenticated ? { side: "shop" } : "skip");
  const farmUnread = useQuery(api.notifications.unreadCount, isAuthenticated ? { side: "farm" } : "skip");
  const register = useMutation(api.notifications.registerPushToken);
  const markRead = useMutation(api.notifications.markRead);
  const status = usePush((s) => s.status);
  const setStatus = usePush((s) => s.setStatus);
  const ready = hydrated && !isLoading;
  const viewerId = viewer?._id ?? null;

  // M-48 for everyone signed in, not only after a first order: on Home, once
  const primer = usePrimer("shop", viewer != null && !viewer.isGuest && mode === "shop" && pathname === "/home", 1500);

  // The channel first: Android 13+ only shows the prompt once one exists
  useEffect(() => {
    void ensureChannel();
  }, []);

  // `${userId}|${token}` registered during this app run
  const registered = useRef<string | null>(null);
  const syncing = useRef(false);
  const syncToken = useCallback(async () => {
    if (!pushSupported || viewerId === null || usePush.getState().status !== "granted" || syncing.current) return;
    syncing.current = true;
    try {
      await ensureChannel();
      const token = await readPushToken();
      if (token === null) return;
      const key = `${viewerId}|${token}`;
      if (registered.current === key) return;
      // Every run, not only when the token changes: the server ties the token
      // to this sign-in and drops it when the sign-in ends.
      await register({ platform: pushPlatform(), token });
      registered.current = key;
      usePush.getState().setRegistered(token, viewerId);
    } catch (error) {
      console.warn("Push token not registered", error instanceof Error ? error.message : error);
    } finally {
      syncing.current = false;
    }
  }, [viewerId, register]);
  const syncRef = useRef(syncToken);
  syncRef.current = syncToken;

  // Signed out: the next sign-in registers again
  useEffect(() => {
    if (viewerId === null) registered.current = null;
  }, [viewerId]);

  // The permission can change in the phone's Settings: read it again on
  // return, and retry a registration that failed (no network, say)
  useEffect(() => {
    const refresh = () =>
      void readPushStatus().then((s) => {
        setStatus(s);
        if (s === "granted") void syncRef.current();
      });
    refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [setStatus]);

  // Permission granted, or someone (else) signed in
  useEffect(() => {
    if (status === "granted" && viewerId !== null) void syncToken();
  }, [status, viewerId, syncToken]);

  // The phone's push token can change (Firebase rolls it over): register the new one
  useEffect(() => {
    if (!pushSupported) return;
    const sub = Notifications.addPushTokenListener(() => {
      registered.current = null;
      void syncRef.current();
    });
    return () => sub.remove();
  }, []);

  const open = useCallback(
    (d: PushData) => {
      if (d.notificationId) void markRead({ notificationId: d.notificationId as Id<"notifications"> }).catch(() => undefined);
      const prefs = usePrefs.getState();
      // Application news reaches applicants before they have a farm to switch to
      const switchSide = !d.kind.startsWith("application_");
      if (switchSide && prefs.mode !== d.side) {
        prefs.setMode(d.side);
        if (router.canDismiss()) router.dismissAll();
        router.replace(d.side === "farm" ? "/dashboard" : "/home");
      }
      router.push(d.href as Href);
    },
    [markRead],
  );

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

  return <PushPrimer side="shop" visible={primer.open} onClose={primer.close} status={primer.status} />;
}
