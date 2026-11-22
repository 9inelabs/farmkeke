// Push on this phone (Phase 9): permission, the Expo push token, and the
// Android channel the backend sends to (PUSH_CHANNEL, "default"). The browser
// preview has no push, so everything reports "unavailable" there.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { colors } from "@/theme/tokens";

export type PushStatus = "granted" | "undetermined" | "denied" | "unavailable";

const native = Platform.OS === "ios" || Platform.OS === "android";

/** The Android channel every push is sent on (convex/notifications/store.ts). */
export const PUSH_CHANNEL = "default";

function statusOf(p: Notifications.NotificationPermissionsStatus): PushStatus {
  if (p.granted) return "granted";
  // iOS "provisional" quiet delivery still counts as on
  if (p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain ? "undetermined" : "denied";
}

export async function readPushStatus(): Promise<PushStatus> {
  if (!native) return "unavailable";
  try {
    return statusOf(await Notifications.getPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

/**
 * Shows the phone's own permission prompt (only once it can still be asked).
 * Android 13+ shows nothing until a notification channel exists, so the
 * channel is made first.
 */
export async function askForPush(): Promise<PushStatus> {
  if (!native) return "unavailable";
  try {
    await ensureChannel();
    return statusOf(
      await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }),
    );
  } catch (error) {
    console.warn("Push permission request failed", error instanceof Error ? error.message : error);
    return "unavailable";
  }
}

/** Once the phone has said no, only its Settings app can turn push back on. */
export const openPushSettings = () => void Linking.openSettings();

/**
 * Android 13+ shows the permission prompt only once a channel exists, a push
 * token needs one too, and a push for a channel the phone doesn't have lands
 * in a quiet fallback channel. So this runs at startup (PushManager) as well
 * as before asking. HIGH importance makes pushes pop up as banners with sound.
 * Android fixes a channel's importance once it is created: only the person can
 * change it after that (or a new channel id).
 */
export async function ensureChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
      name: "Orders and messages",
      description: "Order updates, messages, payments and alerts from Farmkeke",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: colors.lime,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  } catch (error) {
    console.warn("Push channel not created", error instanceof Error ? error.message : error);
  }
}

/** The EAS project the Expo push token is issued for (app.json extra.eas). */
function easProjectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

/**
 * This phone's Expo push token, or null: simulators have none, a build
 * without an EAS project id can't get one, and an Android build without
 * google-services.json (Firebase) fails here. The request goes over the
 * network, so it is tried twice.
 */
export async function readPushToken(): Promise<string | null> {
  if (!native || !Device.isDevice) return null;
  const projectId = easProjectId();
  if (!projectId) {
    console.warn("Push: no EAS projectId in the app config");
    return null;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      console.warn("Push token not issued", error instanceof Error ? error.message : error);
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return null;
}

export const pushPlatform = (): "ios" | "android" => (Platform.OS === "ios" ? "ios" : "android");
export { native as pushSupported };
