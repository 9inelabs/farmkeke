import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is missing. Run `npx convex dev` to create .env.local.");
}

export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

// SecureStore keys may only contain letters, digits, ".", "-" and "_", but
// Convex Auth namespaces its keys with the deployment URL.
const toKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

/**
 * Keeps the session on the device, so users stay signed in: Keychain / Keystore
 * on Android and iOS, and localStorage on web, where expo-secure-store has no
 * implementation.
 */
export const secureTokenStorage: TokenStorage =
  Platform.OS === "web"
    ? {
        getItem: (key) => localStorage.getItem(toKey(key)),
        setItem: (key, value) => localStorage.setItem(toKey(key), value),
        removeItem: (key) => localStorage.removeItem(toKey(key)),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(toKey(key)),
        setItem: (key, value) => SecureStore.setItemAsync(toKey(key), value),
        removeItem: (key) => SecureStore.deleteItemAsync(toKey(key)),
      };
