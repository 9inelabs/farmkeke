# Phase 23: Mobile app notifications (batch F)

Batch F of the app work (build plan section 7). The app can now receive push notifications:

- Each phone registers for push and keeps its token with whoever is signed in.
- Tapping a notification opens its screen in the right mode. A farm notification opens farmer mode, switching over if the person was shopping.
- A notification that arrives while the app is open shows as the Island toast, with "View".
- Shoppers are asked to turn on push after their first order (M-48), and farmers when they first open farmer mode (F-12).
- Both sides can choose push, SMS and email for each kind of alert (M-88, F-75).

The backend was already complete from the website phases:

- push tokens;
- preferences per alert and channel;
- sending through the Expo push API with retries and receipts;
- deep-link data on every push.

There are no backend changes. Push needs two setup steps on your side before it can reach a real phone (section 5).

## 1. What was built, by file

### Push

- `package.json`:
  - `expo-notifications` ~57.0.24 and `expo-device` ~57.0.2, installed with npm at the SDK 57 versions, because `expo install` can't reach expo.dev from here.
- `app.json`:
  - The `expo-notifications` plugin, with the forest green as the notification colour.
  - The library adds the Android notification permission and the iOS push entitlement at build time.
- `src/features/push/push.ts` (new): this phone's side of push.
  - The permission, read as on, not asked yet, blocked, or unavailable. The browser preview counts as unavailable.
  - Asking for permission.
  - Opening the phone's Settings when push is blocked.
  - The Android channel "default" ("Orders and messages", high importance), which is the one the backend sends to.
  - The Expo push token. It's null on simulators, and on builds without an EAS project id.
- `src/store/push.ts` (new): kept on the phone:
  - the permission as last read;
  - the token, and who it's registered to;
  - whether each side's primer was shown.
- `src/features/push/PushManager.tsx` (new), mounted once in `app/_layout.tsx`:
  - **Registration.** Once push is on and someone is signed in, the token is registered with `notifications.registerPushToken`. It's registered again when a different person signs in on the phone. Guests who ordered count too.
  - **Permission changes.** The permission is read again whenever the app comes back to the front, so turning push on in Settings takes effect straight away.
  - **Taps.** A tap marks the notification read and opens its link. If the notification is for the other side, the app switches mode first and starts from that side's home, so Back makes sense. A tap that launched the app is handled once the app has loaded.
  - **While the app is open,** the system banner is replaced by the Island toast: the title, with "View".
  - **iOS app-icon badge:** the unread count across both sides.
- `src/lib/session.ts`:
  - Signing out takes the phone's token off the account first, while the session can still say whose it is.
  - After that, the person's alerts stop coming to this phone.

### Where notifications land

Every link the backend puts on a notification already has a screen:

- `/order/<id>` and `/order/<id>/chat`
- `/pay/<token>`
- `/product/<id>`
- `/support/<id>`
- `/farm-order/<id>` and `/farm-order/<id>/chat`
- `/farm-dispute/<id>`
- `/payouts/<id>`
- `/listing/<id>`
- `/sell/status`
- `/farm/reviews` and `/farm/payout-account`

I checked these by listing every `href` in `convex/` against the routes in `app/`.

### Screens

- `src/features/push/PushPrimer.tsx` (new): **M-48** and **F-12**, a sheet shown before the phone's own prompt, so the one chance to ask isn't wasted.
  - A dark panel with a bell, and two sample notifications that rise in one after the other:
    - shopper: "Order accepted", "Out for delivery";
    - farmer: "New order FK-10234 · reply within 24h", "Payment released".
  - The title:
    - shopper: "Know the moment it moves";
    - farmer: "Never miss an order".
  - One line under it, then "Turn on notifications" and "Not now".
  - When push is blocked, it says so and the button opens Settings.
  - Each side's primer shows once.
  - **When it appears:**
    - The shopper's comes up on "Order placed", a moment after the order goes through, while the phone can still be asked.
    - The farmer's comes up when farmer mode opens for an active farm and push is off (F-12: "if push is off").
- `app/settings/notifications.tsx`, `src/features/push/AlertSettingsView.tsx` (new): **M-88** and **F-75 Notification settings** (`?side=farm`):
  - **The push card at the top:**
    - "Push is on";
    - "Push is off", with Turn on;
    - blocked, with a Settings button;
    - "Push works in the app" in the browser.
  - **A grid of alerts:** each alert type, with Push, SMS and Email columns.
    - Each cell is a lime tick when on and an empty circle when off.
    - A lock means it's always on (money alerts).
    - A dash means the channel isn't offered there: SMS only where an alert sends texts, and email only with an email on file.
  - **Short lines** under each alert ("Accepted, on its way, ready", "Approvals and low stock"), not the website's longer descriptions.
  - **Switches change at once,** saved with `notifications.setPreference`. If saving fails, the switch goes back and a toast says so.
  - A footnote says which events send texts.
- **Ways in:**
  - The bell's Notifications screen has a settings button for its side.
  - The Account tab has a Notifications row ("Push, SMS and email").
  - The Farm tab's Settings card has "Alerts" (Push on or Push off). Its inbox row is renamed "Inbox", so the two aren't confused.
- `app/dev/alerts.tsx` (new): sample settings and primers, for the browser preview, which has no push.
  - The samples are shopper, farmer, push off, blocked, web, and both primers.
  - Switches work on that screen only.

## 2. Deviations from the spec and why

- **Guests get push too.** The spec says guests get SMS only, because they have no account to push to. In the app a guest has a guest identity on the phone, and the backend accepts its token. So a guest who orders from the app is offered push, and gets order updates that way, with the same SMS for bills and pickup codes.
- **Notifications that arrive while the app is open** use the Island toast, not the system banner. The system banner would cover the app's own header. The notification still goes into the phone's notification list.
- **F-12** shows when the person first lands in farmer mode with push off, whether that's from switching or from opening the app in farmer mode. It shows once.
- **M-88 and F-75 are one screen** for both sides, as the backend keeps one preference list per side.
- **Short alert descriptions are kept in the app.** The backend's descriptions are written for the website's wider page; on a phone they were cut off.

## 3. Bugs found and fixed

- **Alert descriptions were cut off with "…"** in the first screenshots: the website's descriptions are too long for a phone row. The app now has its own short line for each alert, falling back to the website's if a new alert type appears.
- **The SMS footnote showed on the signed-out screen,** where there's nothing to choose. It now only shows with the alert grid.
- **A guarded case, not a bug seen:**
  - Notifications whose link isn't an app path (it doesn't start with "/") are ignored on tap, instead of being opened as a URL.
  - Staff alerts carry `/admin/...` links, but those are never pushed (`notifyStaff` writes in-app rows only).

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 8 files, 53 tests passed.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- `npx expo config --type prebuild --json`: the `expo-notifications` plugin resolves. The Android permission (`POST_NOTIFICATIONS`) is in the library's own manifest, and the plugin adds the iOS `aps-environment` entitlement at prebuild.
- I served the export with the same fallback as the Vercel rewrite and used Playwright at 390 x 844:
  - **`/dev/alerts`:**
    - the shopper and farmer grids;
    - push off, blocked, and web;
    - both primers;
    - switching "Offers and news" push on and "Order updates" SMS off, which updated straight away.
  - **The real routes, signed out:**
    - `/settings/notifications` and `?side=farm`: the web push card, and "Sign in to choose your alerts";
    - `/notifications`, with its new settings button.
  - No console errors on any of them.
- **Not run on a phone.** This environment has no Android or iOS device or emulator, and push can't be sent until the setup in section 5 is done. So these weren't seen working:
  - the permission prompt;
  - getting and registering a token;
  - a push arriving;
  - a tap opening its screen.
  - That code is typechecked against `expo-notifications` 57 and the generated Convex API.

## 5. Open questions or decisions that had to be guessed

- **An EAS project is needed before any phone can get a push token.** The build plan notes the old project id belonged to `market2pot`.
  - Run `eas init` (it writes `extra.eas.projectId` into `app.json`), or tell me the project id and I'll add it.
  - Until then, the app asks for permission but quietly gets no token.
- **Firebase for Android push.** Android push through Expo needs a Firebase project:
  - its `google-services.json` in the app (`android.googleServicesFile` in `app.json`);
  - its FCM key uploaded to the EAS project.
  - This is the Firebase item in build plan section 6.
- **iOS push** needs an Apple push key on the EAS project. `eas credentials` sets it up during the first iOS build.
- **A signed-out session.** When a session ends without the person signing out (another device reset the password), the phone can't tell the server to drop its token. Their alerts keep coming to the phone until someone signs in there, which moves the token. Fixing this fully would need the server to drop tokens when it ends a session. Want that added?
- **Guests and push** (section 2): is it right to offer guests push in the app?

## 6. What's next

The app's planned batches (A to F) are complete. Before launch:

- the push setup above;
- a test deployment, or permission for a test order, to run the order, payment, dispute and payout flows end to end on a phone (asked in reports 19 to 22);
- builds on real Android and iOS devices through EAS, and a pass on each with the screens from batches A to F;
- app links for the farmkeke.com links in emails and texts (report 20).
