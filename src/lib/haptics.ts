// Small vibrations on iPhone, as iOS apps use them: a light tap when
// something is added or switched, a success buzz when an order goes
// through. Android apps mostly don't, so these do nothing there (or on web).
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const on = Platform.OS === "ios";

/** Added to cart, a switch flipped, a tab of choices changed. */
export function tapFeedback() {
  if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** An order placed, a payment confirmed, an order accepted. */
export function successFeedback() {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
