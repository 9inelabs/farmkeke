"use client";

// Cookie choices (W-88). Stored in this browser only, under "fk.consent.v1".
// "Necessary" is always on. Analytics and marketing are off until the visitor
// says yes. No analytics or marketing tool is installed yet, so the choice is
// only stored; a future tool must check `useConsent().analytics` (or
// `consent.get()?.analytics`) before it loads.
//
// A footer "Cookie settings" link can reopen the settings modal with
// `openCookieSettings()`, or use <CookieSettingsButton /> from
// @/components/system/CookieSettingsButton.
import { createLocalStore, createMemoryStore } from "@/lib/local-store";

export type ConsentChoice = {
  /** Always true: needed for the cart, area, sign-in and secure payments */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** When the choice was made (epoch ms) */
  decidedAt: number;
};

/** null until the visitor makes a choice (the banner shows). */
export const consent = createLocalStore<ConsentChoice | null>("fk.consent.v1", null);

/** Whether the cookie settings modal is open (not persisted). */
export const cookieSettings = createMemoryStore(false);

export function saveConsent(choice: { analytics: boolean; marketing: boolean }) {
  consent.set({ necessary: true, analytics: choice.analytics, marketing: choice.marketing, decidedAt: Date.now() });
}

export function acceptAllCookies() {
  saveConsent({ analytics: true, marketing: true });
}

export function onlyNecessaryCookies() {
  saveConsent({ analytics: false, marketing: false });
}

/** Opens the cookie settings modal from anywhere (e.g. a footer link). */
export function openCookieSettings() {
  cookieSettings.set(true);
}

export function closeCookieSettings() {
  cookieSettings.set(false);
}

/**
 * The visitor's cookie choice. `decided` is false until they choose.
 * On the server and during hydration this reports "not decided", so render
 * consent-dependent UI only after mount.
 */
export function useConsent() {
  const choice = consent.use();
  return {
    choice,
    decided: choice !== null,
    analytics: choice?.analytics ?? false,
    marketing: choice?.marketing ?? false,
    acceptAll: acceptAllCookies,
    onlyNecessary: onlyNecessaryCookies,
    save: saveConsent,
    openSettings: openCookieSettings,
  };
}
