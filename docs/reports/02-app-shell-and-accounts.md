# Phase 2 - App shell and accounts

Date: 9 Oct 2026
Plan: `docs/build-plan.md` (Phase 2)

Result: people can install the app, go through onboarding, pick an area (by GPS or from the list), and use the five-tab shell. They can create an account, stay signed in, reset a forgotten password by email, edit their profile, change their login details, manage saved addresses, and delete their account.

Every screen uses the Figma style. The Claude-built PDFs set the flow, copy and states.

## 1. What was built, by file

### Backend (`convex/`)

- `convex.config.ts` (new): typed env vars `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` and `AUTH_DEV_LOG_EMAILS`, plus the Phase 1 auth keys.
- `schema.ts`, new tables:
  - `addresses`: label, street, landmark, service area, default flag; the pin comes later
  - `appConfig`: minimum and latest app version, store URLs, maintenance switch, message and end time
  - `areaRequests`: M-07 "notify me" sign-ups
  - `accountDeletions`: A-38 record, with no personal data kept
- `schema.ts`, new fields: `users.blockedAt` and `users.blockReason`; `serviceAreas.latitude`, `longitude` and `radiusKm` for GPS matching.
- `lib/passwordProvider.ts` (new): Farmkeke's own password provider. It is built on Convex Auth's credential functions and uses the same scrypt hashing as its stock Password provider.
  - **Sign up:** name, email and password checked, with clear error codes (`NAME_REQUIRED`, `INVALID_EMAIL`, `WEAK_PASSWORD`, `EMAIL_TAKEN`).
  - **Sign in:** works with an email, or with a farmer's phone number (`identifier` is resolved to the account). Wrong details return `INVALID_CREDENTIALS` with `attemptsLeft`; lockout returns `TOO_MANY_ATTEMPTS`; a blocked account returns `BLOCKED`. An unknown email gets the same answer as a wrong password.
  - **Reset:**
    - It emails a single-use link that lasts 30 minutes.
    - An unknown email gets the same quiet success, so the form can't be used to find accounts.
    - `reset-verification` sets the new password and signs every other phone out.
    - A bad, expired or used code returns `INVALID_CODE`.
- `lib/email.ts` (new):
  - Sends email through Resend.
  - Holds the branded password-reset email (HTML and plain text).
  - On dev with `AUTH_DEV_LOG_EMAILS=true` and no key, it logs the email instead of sending.
- `lib/phone.ts` (new): normalises Nigerian mobile numbers to +234 format, and checks email format.
- `auth.ts`: providers are now FarmkekePassword and Anonymous. Failed sign-ins are limited to 5 per hour per account (the built-in limit, refilling gradually).
- `http.ts`: `GET /reset-password`, a small branded page on the deployment's site URL. The reset email links here because email apps often strip `farmkeke://` links, and the page hands off to the app.
- `accountsInternal.ts` (new): internal lookups (password account by email or phone, attempts left, current viewer), email replacement, and full account-data deletion (addresses, sessions, refresh tokens, accounts, verification codes, rate limits, user).
- `account.ts` (new):
  - `updateProfile`
  - `changePassword`: signs out the other phones
  - `changeEmail`
  - `deleteAccount`
  - Every change except `updateProfile` re-checks the current password on the server.
- `addresses.ts` (new):
  - `list`, `get`, `create`, `update` and `remove`, owner-checked, for accounts only, up to 20 addresses.
  - The first address becomes the default automatically. Deleting the default promotes another.
- `areas.ts`:
  - `matchLocation`: matches GPS to the nearest served area within its radius, or returns the nearest pickup point.
  - `requestArea`: the M-07 notify-me request, de-duplicated.
- `appConfig.ts` (new): `get`, the status every app reads on launch.
- `users.ts`: `sessionStatus` returns `none`, `active` or `revoked`; the app uses it for M-S6.
- `lib/auth.ts`:
  - **`getViewer` now also checks that the token's session still exists** (see section 3).
  - Guards throw coded errors (`NOT_SIGNED_IN`, `ACCOUNT_REQUIRED`, `BLOCKED`, `FORBIDDEN`), and blocked accounts are refused.
- Admin stand-ins:
  - `admin/consumers.ts` (A-35 to A-38): consumer list, detail with addresses and audit activity, block or unblock (which ends their sessions), and the deletion list.
  - `admin/platform.ts`: `setAppStatus` for M-S4 and M-S5, Super admin only and audited.
- `seed.ts`: backfills area centres and radii, and creates the `appConfig` row (version 1.0.0, no maintenance).

### App: navigation and system (`app/`, `src/features/system`)

- `app/_layout.tsx`:
  - Providers.
  - `AppGate`: M-S4 Update required and M-S5 Maintenance, driven live by `appConfig`, and never blocking while loading or offline.
  - `SessionWatcher`: M-S6.
  - The sign-in screens open as a modal.
  - A root `ErrorBoundary` (M-S2) with Try again, Go to Home and Contact support.
- `app/index.tsx`, M-01 Splash:
  - Shows the wordmark, the tagline and a lime spinner.
  - Waits for saved preferences and the stored session, then routes to the carousel (first launch), the location primer (no area yet) or Home.
- `app/+not-found.tsx`: M-S7.
- `src/features/system/SessionWatcher.tsx`, M-S6:
  - If the server reports the session revoked, it drops the stale token.
  - If a real account ends up signed out without the person choosing to, it shows "You've been signed out" with Sign in and Continue as guest.
- `src/store/prefs.ts`: saved on the phone with AsyncStorage: onboarding seen, chosen area, and an account-signed-in flag.

### App: onboarding (`app/(onboarding)/`)

- `welcome.tsx`, M-03:
  - The three Figma panels with their illustrations and panel colours.
  - Progress dashes, and the lime Skip pill (Next on the last panel).
  - Swipe moves between panels.
- `get-started.tsx`, M-04 (Figma "Start Shopping"):
  - Wordmark, illustration, the three feature rows and Start Shopping.
  - A "Sign in to create an account" link.
- `location.tsx`, M-05 (Figma "location"):
  - Tint background, a "Select location" field (opens M-06), and "Search location automatically".
  - The location flow: OS permission, then current position, then server matching. Denied goes to M-06; outside coverage goes to M-07.
- `choose-area.tsx`, M-06:
  - State picker (sheet), area or LGA search, and a radio list with a Selected badge.
  - Confirm sets the area. When opened from the Home chip, it returns to Home.
- `outside-area.tsx`, M-07:
  - Uses the place name from reverse geocoding.
  - Shows the nearest pickup point with its distance and hours.
  - Has a Change area button.
  - "Notify me when you arrive" collects an email in a sheet, then confirms.

### App: sign in and accounts (`app/(auth)/`, `src/features/auth`)

- `sign-in.tsx`, M-50:
  - Accepts an email or a farmer's phone number.
  - Password field with Show/Hide.
  - Wrong-details banner, with "N tries left before a short wait" once 3 or fewer remain.
  - Forgot password link.
  - A full "Too many tries" state with Reset my password and Keep shopping as a guest.
- `create-account.tsx`, M-51:
  - Password rules tick off as you type.
  - Already registered shows "Is this you? Sign in instead".
- `account-created.tsx`: M-52, with a "Remembered on this phone" pill.
- `forgot-password.tsx`: M-53.
- `check-email.tsx`, M-54:
  - Resend link after a 60-second timer.
  - Open email app button, and Back to sign in.
- `reset-password.tsx`, M-55: the deep-link target `farmkeke://reset-password?email=…&code=…`, with password rules and a "type it again" check.
- `password-changed.tsx`: M-56.
- `reset-expired.tsx`: M-57, Send a new link.
- `AuthScreen.tsx`: shared layout with Close or back, the wordmark and a pinned footer.
- `navigation.ts`: `closeAuth()` returns to wherever the person came from, or Home when opened from an email.
- `SignInPromptSheet.tsx`: M-59, reusable by later phases (shown in the dev gallery for now).

### App: shell and account (`app/(shop)/`, `app/settings/`, info pages)

- `(shop)/_layout.tsx` and `src/features/shell/TabBar.tsx`:
  - The Figma bottom navigation with the designer's tab icons, tinted forest when active and grey when not, with a lime badge slot.
  - The M-S1 offline banner sits above it.
- `(shop)/home.tsx`: shell with the location chip (opens M-06), the escrow card, the live category row, and a Fresh Picks empty state.
- `(shop)/categories.tsx`: shell with the live category grid.
- `(shop)/cart.tsx`, `(shop)/orders.tsx`: the M-31 and M-61 empty states.
- `(shop)/account.tsx`:
  - M-80 signed in: avatar initials, name, email and phone, Edit; Saved addresses with a count; Login details; help rows; Sign out with the M-94 sheet.
  - M-81 guest: the forest "Sign in for a faster checkout" card and the help rows.
- `settings/edit-profile.tsx`: M-82.
- `settings/login-details.tsx`, M-83:
  - Change email and/or password, with the current password required.
  - Shows farmers' phone number (read-only).
  - A Delete account row.
- `settings/addresses/index.tsx`: M-84 list, default first, with an empty state.
- `settings/addresses/[id].tsx`, M-85, for new or edit:
  - Label chips, street, landmark, an area picker sheet and the default checkbox.
  - Delete, with a confirmation.
- `settings/delete-account.tsx`: M-95, with the consequences listed and the password required.
- `settings/account-deleted.tsx`: M-96.
- `help.tsx`, M-90:
  - Help search, four topic tiles that filter, and the FAQ accordion.
  - An email-support button.
- `how-it-works.tsx`: M-92, five illustrated steps.
- `legal/index.tsx`, `legal/[doc].tsx`: M-93.
- `about.tsx`: M-97, with version and build, website and email.

### App: shared components and helpers (`src/`)

- New UI components:
  - `BottomSheet`: Figma scrim, 250ms ease-out slide, respects reduce motion
  - `ListRow` and `ListGroup`
  - `Notice`: info, error and pending tones
  - `Avatar`
  - `RadioRow` and `Checkbox`
  - `PasswordRules`
  - `StatusScreen`: full-screen outcomes
  - `OfflineBanner` and `useIsOffline`
- `lib/errors.ts`: turns backend error codes into plain-words messages (shared state rule 3).
- `lib/session.ts`: `useSignOut` (a deliberate sign-out, so no M-S6), password rules and an email check.
- `lib/hours.ts`: opening hours as people say them ("Mon–Sat, 8 AM–7 PM", "Daily…").
- `lib/version.ts`: version comparison.
- `content/help.ts`: FAQ, How it works steps, legal titles, and the support, hello and website addresses.
- `features/account/useAccount.ts`: settings screens send signed-out people back to Account.
- `addressLabels.ts`: address label names and icons.
- Packages added: `lucia` 3.2.2 (pinned to Convex Auth's hashing library), `@react-native-community/netinfo`, `expo-application`.

## 2. Deviations from the spec and why

- **M-56 continues signed in.** Convex Auth signs the phone in as part of the reset, so the screen says "You're signed in with your new password" and offers Continue rather than Sign in. Sending people back to type the password they just set would add a step for no gain.
- **M-58 Link past orders moved to Phase 6.** No orders exist yet. Guests already get their own device identity (Anonymous provider), so linking can be built once orders exist.
- **M-05 follows Figma, not the inventory row.** Your design has a "Select location" field plus "Search location automatically", rather than "Allow location / Choose my area instead". Both paths are covered.
- **M-07 "Notify me" collects an email.** Push arrives in Phase 9, and guests have no account. Picking a pickup point without a delivery area waits for checkout in Phase 6.
- **M-85 map pin (M-35) moved to Phase 6.** It needs maps and a Google Maps key. Addresses save without a pin until then.
- **Rows for later phases are hidden, not shown as dead ends:**
  - Saved items (Phase 5)
  - Notifications (Phase 9)
  - Sell on Farmkeke (Phase 3)
  - Find my order (Phase 6)
  - Rate Farmkeke (needs a store listing)
- **M-90/M-91:** "Still need help?" emails support for now. In-app support chat comes in Phase 8.
- **M-93 legal pages are placeholders.** The text is to come from Farmkeke's legal adviser.
- **M-S4 "Update now"** stays disabled until store URLs are set with `admin/platform:setAppStatus`.
- **Reset links go through a Convex-hosted https page.** The website's W-42c page doesn't exist yet, and many email apps strip `farmkeke://` links.
- **Tab shells:** Home, Categories, Cart and Orders show live categories and empty states. Category tiles in the Categories tab don't open anything yet; that arrives in Phase 5.
- **Lockout timing.** After 5 wrong passwords, sign-in pauses. One attempt comes back about every 12 minutes, so the copy says "about 15 minutes". The same per-account limit also covers the password checks in Login details and Delete account.
- **Account deletion completes immediately.** There are no orders yet. The "orders still on their way" rule (A-38 `waiting_for_orders`) takes effect in Phase 6.

## 3. Bugs found and fixed

- **Reset email failed at runtime: "Invalid URL: 'http:/'"** (not caught by typecheck). Convex Auth's email code builds a URL from `SITE_URL`, and `farmkeke://` doesn't parse. `SITE_URL` is now the deployment's https site URL; Farmkeke builds its own reset link anyway.
- **Other phones stayed signed in after a password reset (security).** Convex Auth's access tokens outlive their session by up to an hour, so deleting sessions didn't lock other phones out.
  - `getViewer` now checks that the session exists.
  - Account actions go through a session-checked internal query.
  - The app drops revoked tokens and shows M-S6.
  - Retested: the other phone's viewer becomes `null` immediately, and its password change is refused.
- **A wrong or reused reset code gave a generic server error.** Convex Auth throws rather than returning null. It's now caught and returned as `INVALID_CODE`, which opens M-57.
- **Guard errors were plain strings,** so the app couldn't tell "sign in to do this" from other failures. They now carry codes.
- **TypeScript circularity:** `auth.ts` imports the provider, which uses the generated `internal` API, whose types include `auth.ts`. Fixed with explicit types.
- **Delete-account race (found in review):**
  - The settings guard could redirect to Account while the screen was moving to "Account deleted".
  - The session watcher would have shown "You've been signed out" after a deliberate deletion.
  - Fixes: the guard is removed from that screen; the flag is cleared before deleting (and restored on failure); the watcher marks an account only once per sign-in.
- **Editing an address in a different state than the browsing area lost its area.** `addresses.get` now returns the address's area.
- **Route files exported helpers** (address labels, a stray style). Moved them to `src/features`.
- **The carousel had a muddled Skip handler and an unused ref.** Simplified.

## 4. Verification

All commands were run from the repo root.

- `npx convex dev --once`, after every backend change: "Convex functions ready!". The first runs failed on the type circularity and an optional `sessionId`; both were fixed.
- `npx convex run seed:run`: `{appConfig: 1, …others 0}`. Area centres were backfilled.
- `npx convex env set AUTH_DEV_LOG_EMAILS=true` and `SITE_URL=<deployment site URL>`: both on the **dev** deployment only.
- Backend tests with `ConvexHttpClient` from Node against the dev deployment.
  - **First script: 18 of 19 passed before fixes, all passed after.**
    - Sign up: missing name, bad email and weak password each return their own code; a duplicate (any letter case) returns `EMAIL_TAKEN`.
    - An unknown email returns `INVALID_CREDENTIALS`.
    - Wrong passwords count down 4, 3, 2, 1, then `TOO_MANY_ATTEMPTS`. The correct password is also refused while paused.
    - `updateProfile` works.
    - Addresses: the default moves to a new default; deleting the default promotes another; a blank street returns `STREET_REQUIRED`; a guest gets `ACCOUNT_REQUIRED`; another account reading the address gets `null`.
    - GPS in Ikenegbu matches Ikenegbu. GPS in Nsukka returns "outside", with the nearest pickup point at Enugu GRA, 47 km.
    - Area requests are stored; `appConfig` is seeded; a reset for an unknown email is silent.
    - The reset request for a real email crashed with the `SITE_URL` bug, which was then fixed.
  - **Reset round trip:**
    - The dev email log showed the link.
    - `curl` of `/reset-password` returned the page with an `href` to `farmkeke://reset-password?...`.
    - After the fixes, all 7 checks passed: wrong code returns `INVALID_CODE`; the real code resets and signs in; reusing it returns `INVALID_CODE`; the other phone's viewer is `null`; the other phone's `changePassword` returns `NOT_SIGNED_IN`.
  - **Login details and deletion, all passed:**
    - The old password stops working and the new one works.
    - `changePassword` with the wrong current password returns `WRONG_PASSWORD`; with the right one, it works.
    - `changeEmail` (upper-case input stored lowercased): the viewer updates, the new email signs in, the old one doesn't.
    - Delete with the wrong password is refused. After deleting, sign-in fails, the session is gone, and the email can be used to sign up again.
- `node --experimental-strip-types` checks of the helpers:
  - `formatHours` and `formatTime`: 9 of 9.
  - `normalizeNigerianPhone` and `looksLikeEmail`: 10 of 10.
  - `isOlder`: 6 of 6.
- `npx tsc --noEmit` and `npm run typecheck` (app and Convex): no errors.
- `npx expo export --platform android` (6.8 MB) and `--platform ios` (6.6 MB): both bundled.
- `npx expo-doctor`: 21/21 checks passed.

**Not verified:**

- **Running on a phone.** The UI, animations, the location permission flow, opening the reset deep link and session restore after relaunch are all untested on a device. There's still no emulator or EAS development build.
- **Farmer phone sign-in, end to end.** No user has a phone number until the Phase 3 application sets one. The phone lookup and normalisation are tested; the full sign-in will be tested in Phase 3.
- **Admin stand-ins at runtime** (block or unblock, app status, deletion list, consumer list). Testing them needs a Super admin. The one-time bootstrap is kept for your own account. They use the same guard and audit helpers that were tested in Phase 1.

## 5. Open questions and guessed decisions

- **Resend (needed before real users).** Set `AUTH_RESEND_KEY` and, once the domain is verified, `AUTH_EMAIL_FROM` on the deployment. Until the domain is verified, Resend's shared test sender only delivers to the Resend account owner's address. **Never set `AUTH_DEV_LOG_EMAILS` on production.**
- **Testing on a phone:**
  1. Run `npx eas init`.
  2. Make a development build.
  3. Open the dev gallery from Account and run through the onboarding, sign-in and reset flows.
  Reset links open `farmkeke://` and need the development build; they don't work in Expo Go.
- **Your Super admin account:** create an account in the app, then run `npx convex run admin/staff:bootstrapSuperAdmin '{"email":"you@…"}'`. After that I can test the admin stand-ins.
- **Area centres and radii are rough placeholders** (from the seeded mockup areas). GPS matching depends on them, so they need real values before launch.
- **Test accounts on dev.** Several `p2…`, `reset…` and `moved…@farmkeke.test` accounts and guests exist on the dev deployment only. They can be deleted from the dashboard.
- **Still needed:**
  - The new app icon.
  - The Herbs & Spices, Legumes & Nuts and Dairy illustrations.
  - Legal text.
  - Store URLs, after the first store release.
- **Still on disk from market2pot:** `.env` (holds a Supabase service-role key), `.expo/` and `supabase/.temp/`. Please delete them.
- **Nothing is committed yet.** Phases 1 and 2 are only in the working tree.

## 6. What's next

Phase 3 - Farmer onboarding, in the app:

- Sell on Farmkeke (F-01), and the sign-in sheet for guests (F-02)
- The six-step application (F-03 to F-08):
  - farm details, including the farmer's phone number (which also becomes a way to sign in)
  - what you grow
  - collection details
  - documents with camera and gallery upload to Convex storage
  - payout details
  - review and submit
- Application statuses F-09 to F-09e, with drafts saved
- Farmer mode: the switch (F-13), the dashboard shell (F-10), the setup checklist (F-14), and the suspended state (F-15)
- Business screens F-70 to F-73
- Help and terms F-90 to F-92
- Admin stand-ins for requests and farmers (A-20 to A-25, A-30 to A-33)
