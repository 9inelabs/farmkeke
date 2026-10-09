import { router } from "expo-router";

/**
 * Leaves the sign-in screens and returns to wherever the person came from.
 * Opened from a reset email there may be nothing underneath, so go Home.
 */
export function closeAuth() {
  if (router.canDismiss()) router.dismissAll();
  if (router.canGoBack()) router.back();
  else router.replace("/home");
}
