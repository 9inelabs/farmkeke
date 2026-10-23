// Push on this phone (Phase 9): permission, the Expo push token, and the
// Android channel the backend sends to ("default"). The browser preview has
// no push, so everything reports "unavailable" there.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { colors } from "@/theme/tokens";

export type PushStatus = "granted" | "undetermined" | "denied" | "unavailable";

const native = Platform.OS === "ios" || Platform.OS === "android";

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

/** Shows the phone's own permission prompt (only once it can still be asked). */
export async function askForPush(): Promise<PushStatus> {
  if (!native) return "unavailable";
  try {
    await ensureChannel();
    return statusOf(await Notifications.requestPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

/** Once the phone has said no, only its Settings app can turn push back on. */
export const openPushSettings = () => void Linking.openSettings();

/** Android 13+ asks only once a channel exists; the backend sends on "default". */
export async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Orders and messages",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.lime,
    vibrationPattern: [0, 200, 120, 200],
  });
}

/**
 * This phone's Expo push token, or null: simulators have none, and a build
 * without an EAS project id can't get one.
 */
export async function readPushToken(): Promise<string | null> {
  if (!native || !Device.isDevice) return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

export const pushPlatform = (): "ios" | "android" => (Platform.OS === "ios" ? "ios" : "android");
export { native as pushSupported };
