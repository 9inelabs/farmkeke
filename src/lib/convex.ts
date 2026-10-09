import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is missing. Run `npx convex dev` to create .env.local.");
}

export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

// SecureStore keys may only contain letters, digits, ".", "-" and "_", but
// Convex Auth namespaces its keys with the deployment URL.
const toKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

/** Keeps the session on the phone (Keychain / Keystore), so users stay signed in. */
export const secureTokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(toKey(key)),
  setItem: (key, value) => SecureStore.setItemAsync(toKey(key), value),
  removeItem: (key) => SecureStore.deleteItemAsync(toKey(key)),
};
