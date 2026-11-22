# APK corrections: 22 Nov 2026

Found by the owner testing the Android APK. Logged one at a time; work starts
only once the owner says the list is complete.

## #1 Animations feel slow and staggered

- **Where:** the whole app: the onboarding screens, screen-to-screen
  transitions and in-screen content reveals.
- **Owner's words:** "The animations throughout the entire app doesn't feel
  sharp and smooth, they feel slow and staggered. Not smooth and seamless.
  Check through across the app for animations and fix them.. From the
  onboarding screens, to in app screens transitions, also add scale out and
  scale in transitions to the screen transitions. Make them smooth, seamless
  and swift just like apple animations."
- **What's wanted:**
  - quicker, smoother motion everywhere, like Apple's;
  - scale-in and scale-out added to screen transitions.
- **Notes for the fix:**
  - seen on Android (APK);
  - motion lives in `src/components/motion/reveal.tsx` and `screenMotion.tsx`, plus the root stack in `app/_layout.tsx`;
  - the welcome screens, `PressableScale` and the tab bar also animate.

## #2 Push notifications don't work, and the app never asks permission

- **Where:** the whole app, on Android (APK) and iOS.
- **Owner's words:** "Push notiifications are not working yet. Even after the
  whole setup, I didn't get a prompt to allow notifications. When there's a
  notification in the app, there should be a push notification that appears
  in android phones and iOS devices even when the app is opened or closed"
- **What's wanted:**
  - the app asks to allow notifications;
  - every in-app notification also arrives as a push, whether the app is open (in the foreground) or closed.
- **Notes for the fix:**
  - the setup is in place: the EAS `projectId` is in `app.json`, `google-services.json` is at the repo root, and `app.config.js` wires it into the Android build;
  - check why no permission prompt appears. Android 13+ needs the `POST_NOTIFICATIONS` permission and a runtime request, and the app's own primer is `src/features/push/PushPrimer.tsx`;
  - check how the push token is registered with the backend;
  - check that the backend sends a push for each notification;
  - check how notifications show while the app is open (`setNotificationHandler`);
  - check the Android notification channel;
  - check that Expo's push service has the FCM V1 key;
  - texts are still only for the 6 chosen events; this is about pushes.

## #3 No keypad for the PIN when changing the payout account

- **Where:** farmer mode, Payout account (`app/farm/payout-account.tsx`), in
  the "Confirm it's you" sheet that asks for the 4-digit PIN before saving a
  new bank account.
- **Screenshot** (`docs/apk-corrections/03-payout-pin-sheet.png`): the sheet open on Android. The four PIN boxes show, the
  first is focused, but no keyboard appears, so the PIN can't be typed and
  "Confirm and save" stays disabled.
- **Owner's words:** "The native keypad doesn't appear in this section. Add
  the custom app numeric keypad to this section so users can put their pin
  when thy want to change bank account details."
- **What's wanted:** Farmkeke's own number keypad (the `PinPad` used on the
  farmer sign-in, `src/components/premium/PinPad.tsx`) in this sheet, so the
  PIN can always be entered.
- **Notes for the fix:**
  - the sheet probably uses hidden-input boxes (like `CodeBoxes`), and the keyboard doesn't open inside the bottom sheet on Android;
  - the `PinPad` is designed for dark screens, so it needs a light version for the white sheet;
  - check for any other PIN or code entry inside a sheet with the same problem.

## #4 Chat screen: redesign, and the keyboard covers the message box

- **Where:** an order's chat, for both sides: the farmer's
  (`app/farm-order/[id]/chat.tsx`) and the shopper's
  (`app/order/[id]/chat.tsx`), both drawn by
  `src/features/chat/ChatThread.tsx`.
- **Screenshots:**
  - `docs/apk-corrections/04-chat-current.png`: the farmer's chat with Franklyn on Android. A plain header, a mostly empty screen with the order card (FK-10001 · Yam tuber × 1) and "Today", and the keyboard open over the bottom. The message box is hidden behind it.
  - `docs/apk-corrections/04-chat-reference.png`: the owner's reference (a pet adoption app). Back arrow, a rounded avatar with the name and a verified tick, a status line under it, and a round call button on the right. A soft tinted background with a "TODAY" divider. A rich card at the top for the item being discussed (photo, title, details, chevron). Their messages are white rounded bubbles on the left; your own are lime-green bubbles on the right, each with a small time under the text. The bottom bar has a round attach button, a rounded "Type a message..." field and a round send button.
- **Owner's words:** "The chat detail screen is not well detailed enough. The
  native keyboard of the phone covers the input field making it hard for
  users to see the input section. I have uploaded a reference of what I want
  the chat screen to look like. Redesign that section. Also make the input
  field come up visible when the native keyboard is open, and let it stay
  down when the native keyboard is out."
- **What's wanted:**
  1. Redesign the chat to match the reference, in Farmkeke's colours. Their bubbles are white; ours lime. Keep the order card at the top, made richer, plus the attach and send buttons.
  2. The message bar rises above the keyboard when it opens and returns to the bottom when it closes, on Android and iPhone.
- **Notes for the fix:**
  - **Header facts must be true:**
    - show the farm's or buyer's photo or initials, the name and the order number;
    - a call button only if the other side's phone may be shown (check what the order screens already allow);
    - no "Online" status, since the app doesn't track it.
  - **Keyboard on Android:**
    - check `softwareKeyboardLayoutMode` in `app.json`, which on Android needs "resize" or a keyboard-aware view;
    - edge-to-edge in SDK 57 means `KeyboardAvoidingView` behaviour may need `react-native-keyboard-controller` or the `behavior` set for Android too;
    - check the Expo 57 docs before choosing.
- **Owner's addition (same day):** "Replace the call button with the image of
  the farmer and a chevron arrow button to allow the user go back to see the
  farm. Make the design very clean and classy. Do draft for me to see and
  approve before you build that particular screen"
  - There is no call button. At the header's right, the farm's photo (or
    initials) with a chevron button opens the farm's page (`/farm/[id]`).
  - On the farmer's side of the same chat there is no farm page to open, so
    the header shows the buyer's initials without a chevron (to be confirmed
    in the draft).
  - **Approval needed:** draw a draft of the chat screen first and get the
    owner's approval. Don't build #4 until it's approved; the keyboard fix can
    go ahead with the rest.

## #5 Farmer terms: the bank account must be in the farmer's own name

- **Where:** Farmer terms (farmer mode > Terms), section 2, the bullet about
  what the application asks for.
- **Screenshot:** `docs/apk-corrections/05-farmer-terms.png` (the sentence
  "and a bank account in your or your farm's name. We check the account name
  with the bank." is circled).
- **Owner's words:** "'and a bank account in your name' - This should be
  correct wording in this section. Fix"
- **What's wanted:** "...and a bank account in your name. We check the
  account name with the bank." Drop "or your farm's".
- **Notes for the fix:**
  - The text lives in `src/content/legal/farmer-terms.json` (app) and
    `web/src/content/legal/farmer-terms.json` (website), kept in step by
    `scripts/sync-legal.mjs`. Change the source and re-sync so both match.
    Check whether a legal PDF needs regenerating (`scripts/legal-pdf.py`).
  - Other places mention the farm's name for the bank account: the sign-up
    and farm profile screens, `app/sell/apply/profile.tsx`,
    `app/farm-settings/profile.tsx` and `convex/lib/application.ts`. Check
    whether they say the account may be in the farm's name, and bring the
    wording in line. **Ask the owner** before changing any rule the backend
    enforces (e.g. the account-name match).
  - Changing the terms text may need a new version/date on the terms; follow
    how earlier legal updates were done.

## #6 Home: the loading skeleton doesn't match the loaded page

- **Where:** shop Home (`src/features/home/HomeView.tsx`).
- **Screenshots:** `docs/apk-corrections/06-home-loading.png` (loading) and
  `docs/apk-corrections/06-home-loaded.png` (loaded).
- **Owner's words:** "The empty loading state and the actual state of the
  home page doesn't match together. Fix that. Let the empty state skeleton
  screens match the layout of the actual page."
- **Differences seen:**
  1. **Banner:** a large banner block shows while loading, but this shopper's
     loaded page has no banner, so everything jumps up. The banner skeleton
     shouldn't push the page around when there turns out to be no banner.
     For example, reserve its space only once the backend says there is a
     banner, or fold it into the same load as the rows.
  2. **Categories:** the skeleton has five bare grey squares, with a gap
     where the labels go. The loaded row has tinted tiles with a label under
     each, more than five across, edge to edge. Match the tile size, the
     labels (short grey bars) and the count that fits the width.
  3. **Farmers near you:** circles are shown, but without the name and area
     lines under each. Add them.
  4. **Product rows:** the skeleton cards are plain tall grey blocks, taller
     than the real cards, with no "View all". Copy the real card: white card
     with outline, photo area, then price, name and unit bars, and the round
     add button, at the same height. Show the section title and the "View
     all" position as in the loaded page.
  5. Overall, every block keeps the same position and height from loading to
     loaded, so nothing shifts.
- **Notes for the fix:** check the other screens' skeletons for the same
  mismatch while there: the Categories tab, Search, the farm page, All farms,
  Orders, the farm Dashboard and Messages. List any fixed.

## #7 Photos on the welcome and farmer sign-up screens load slowly

- **Where:**
  - the onboarding/welcome screens (`app/(onboarding)/welcome.tsx`, `get-started.tsx`);
  - the farmer sign-up introduction ("Sell your harvest straight to households", `app/sell/index.tsx`).
- **Owner's words:** "The pictures in the onboarding screen, farmer's sign up
  introduction screen as well, they load slowly, make the images load faster
  and smooth, so the app doesn't feel like it's breaking"
- **What's wanted:** the photos are on screen at once, or fade in smoothly,
  with no blank or flashing area while they load.
- **Notes for the fix:**
  - These are bundled photos in `assets/photos/`. Some are large:
    `farmer-field-hd.jpg` is 1320×1535 at ~770 KB, and `farmer-greens.jpg` is
    960×1280 at ~260 KB. Resize each to what the screen needs and compress
    it, with WebP if Expo 57 supports it well.
  - Load them before the screens appear: `Asset.loadAsync` /
    `Image.prefetch`, or the splash screen held until they're ready (the app
    already waits for fonts in the root layout).
  - Use expo-image's `placeholder` (a blurhash or a tiny thumbnail) with a
    short `transition`, so nothing is ever blank. Use `priority="high"` and
    `cachePolicy="memory-disk"`.
  - The sign-up screen used to load the Admin Portal photo over the bundled
    one; that override was removed on 19 Nov, so only bundled photos remain.
    Confirm nothing still fetches a remote photo there.
  - Check the welcome screen's tile collage (tomatoes, carrots, fruits,
    peppers) and its farm thumbnails the same way.

## #8 Product page: a clean scale-in and scale-out transition

- **Where:** the product page (`app/product/[id].tsx`), opened from any
  product card.
- **Screenshot:** `docs/apk-corrections/08-product-page.png` (Dry fish, Daniel's Farm).
- **Owner's words:** "The screen transition to this screens should be a scale
  in or scale out transition. Something smooth, swift and clean. No glitches"
- **What's wanted:** opening a product scales the page in, and going back
  scales it out. Quick, smooth, with no flicker, jump or blank frame.
- **Notes for the fix:**
  - Goes with #1; give both to the same agent.
  - Today the product page is in `SCALE_ROUTES`
    (`src/components/motion/screenMotion.tsx`): a native fade (220 ms) plus a
    Reanimated keyframe that grows the content from 94%. Leaving is only a
    fade, and the two animations run separately, which can look uneven.
  - Look for a single, native-driven scale in both directions. Options:
    - a custom stack transition (JS stack `cardStyleInterpolator`, or native
      stack options Expo 57 / react-native-screens offer);
    - a shared-element style grow from the tapped card's photo;
    - otherwise a well-tuned fade with scale 0.92→1 in and 1→0.96 out, both
      in under 300 ms with an Apple-like curve.
  - The hero photo must not flash grey as it scales: keep the card's cached
    image (expo-image `recyclingKey` / same URL) so it's already there.
  - Test on Android, which is where it was seen, and on iPhone.

## #9 Location screen: add a Back button

- **Where:** the location screen ("We use your location to show produce that
  can reach you…", Select location / Search location automatically),
  `app/(onboarding)/location.tsx`.
- **Screenshot:** `docs/apk-corrections/09-choose-area.png`.
- **Owner's words:** "Add a back button to this screen. Something that can
  take users to the last place they were"
- **What's wanted:** a back button at the top left that returns to wherever
  the shopper came from.
- **Notes for the fix:**
  - Match the app's other back buttons: `BackIcon` (chevron on iPhone, arrow
    on Android), with the same size and position as the other light screens.
  - Use `router.back()` when there's a screen to go back to. On first launch
    there's none, because this screen comes straight after Welcome/Get
    started, so go to the previous onboarding step there. Don't hide the
    button, and don't close the app.
  - It also opens from Home's area chip (`/choose-area?from=home`). Back must
    return to Home without changing the area.
  - Android's hardware back should behave the same.

## #10 Edit profile: change the profile photo, and a fuller, cleaner screen

- **Where:** Account > Profile (`app/settings/edit-profile.tsx`).
- **Screenshot:** `docs/apk-corrections/10-edit-profile.png`. Today the
  screen has the initials circle (FN), a Full name field, a note "To change
  your email or password, go to Login details", and Save changes at the
  bottom. Most of the screen is empty.
- **Owner's words:** "Allow users to be able to edit the profile image. Also
  make this section well detailed and clean"
- **What's wanted:**
  1. **Profile photo:**
     - tap the avatar (with a small camera badge) to choose from the gallery or take a photo;
     - crop it square and upload it;
     - also allow removing it, which goes back to the initials.
  2. **A richer, cleaner layout**, in the style of the redesigned Account
     screen:
     - a header area with the large avatar and a "Change photo" action, the name, and the email or phone shown read-only;
     - grouped fields: full name (editable), plus email and phone shown with "Change in Login details" links rather than a bare note;
     - member since, if the data exists;
     - the Save button enabled only when something changed.
- **Notes for the fix:**
  - **Backend:**
    - `users` has an `image` string field (the auth library's), but no stored-file field;
    - add a way to upload: a `generateUploadUrl` mutation plus a mutation that saves the storage id;
    - follow how farm photos and listing photos are uploaded (`convex/lib/uploads.ts`, `useAttachments` in chat);
    - delete the old file when the photo is replaced or removed;
    - add `photoUrl` to `api.users.viewer`;
    - read `convex/_generated/ai/guidelines.md` first, and add tests.
  - **Where the photo shows:** wherever the shopper's initials appear today (Home header, Account header, chats seen by farmers). Update those to show it.
  - **Permissions:** `expo-image-picker` (camera and photos) may need its permission strings in `app.json`; check what the farm-photo upload already uses.
  - **Deploy:** this needs the backend deployed before the new APK.

## #11 Fewer texts (Termii cost), and fewer order steps for farmers

- **Owner's words:** "Give me a list of all the events that happen on this
  project that send messages to users to their phone number, I want to
  reduce the list of events of things that send messages so that it can
  reduce the cost that termii charge. Also we have to reduce the phases that
  farmers have to click once they are preparing a product. We cannot
  incovenience farmers, so once a farm accepts an order, the user is notifed
  in the app and in email. Then the user gets their products. Remove all the
  section where the farmer has to be cliicking 'ready', 'packaging',
  'delivered' etc. Let it be simple so farmers don't have to go through all
  that hassle."

### 11a Texts: which events to keep (waiting on the owner's choice)

Every text the backend sends today (from `SMS_KINDS` in
`convex/lib/alerts.ts`, plus `convex/phoneAuth.ts`):

| # | Who | Event | Kind |
| --- | --- | --- | --- |
| 1 | Shopper | The bill for a delivery order is ready to pay | `bill_ready` |
| 2 | Shopper | A pickup order is ready to collect | `ready_for_pickup` |
| 3 | Farmer | We received your application | `application_received` |
| 4 | Farmer | You're approved | `application_approved` |
| 5 | Farmer | New order | `order_new` |
| 6 | Farmer | Bank account changed | `payout_account_changed` |
| 7 | Farmer | Phone sign-up code (text, or the "Call me with the code" voice call) | `phoneAuth.sendCode` |
| 8 | Farmer | Forgot PIN code (same code sender) | `phoneAuth.sendCode` |

- Everything else is push, in-app or email only. Chat replies call notify
  with a phone number, but the SMS filter drops them.
- Codes 7 and 8 can't be dropped while farmers sign in by phone: they prove
  the phone is theirs. 6 is a safety alert against account takeover.
- **Decision needed:** which of 1–6 to stop texting. Email, push and in-app
  keep going for any dropped.
- **Bear in mind:** a guest shopper with no email gets the bill (1) only by
  text, so dropping 1 means asking every delivery shopper for an email at
  checkout.

### 11b Farmer order steps: accept or decline only (waiting on the owner's answers)

- **Today's farmer steps:**
  - Accept or Decline;
  - then Start preparing (`startPreparing`) and Mark packed (`markPacked`);
  - then Ready for rider or Ready for collection (`readyForRider`);
  - then Confirm handover to the rider (`confirmHandover`), or for farm
    pickups Confirm collection with the shopper's QR/code (`confirmCollection`).
- **Wanted:** the farmer only accepts (or declines). Once accepted, the
  shopper is told in the app and by email, and gets their order. Remove
  "preparing", "packed", "ready", "handed over" and "delivered" from the
  farmer's screens and Dashboard.
- **Questions for the owner before building:**
  1. **Delivery orders:** once the farm accepts, who moves the order on? Options:
     - Farmkeke staff in Dispatch mark "out for delivery" and "delivered" (the rider flow stays with staff);
     - or the shopper's "It's arrived" is the only step after acceptance.
  2. **Pickup at the farm:** today the farmer scans the shopper's QR code or
     enters the code to confirm collection. Options:
     - drop it, so the shopper taps "Collected" in the app (or it completes on its own after N days);
     - or keep the scan as the farmer's one optional step.
  3. **Buyer protection** (report a problem within 24 hours) starts when the
     order is marked delivered or collected. With fewer steps, should it start
     when the shopper confirms, or a fixed time after acceptance (e.g. 3 days)?
- **Notes for the fix (once answered):**
  - It touches `convex/orders/farmer.ts`, the order status rules in
    `convex/lib/orders.ts`, the farmer's order screens (`FarmOrderView`,
    `OrdersView`, `OrderSheets`, `PickupScanner`, `DashboardView` "To
    prepare"), the shopper's order timeline (`OrderView`, `Timeline`), the
    Admin Portal Dispatch and order pages (`web/`), the website's order page,
    emails and tests.
  - Old orders already in those statuses must still show properly.
  - Split payments already pay the farm when the shopper pays, so no money
    step depends on these farmer clicks. Check refunds/disputes don't either.

### #11 decisions (owner, 22 Nov)

**Texts.** Only these send a text:

- Farmer: bank account changed (`payout_account_changed`)
- Farmer: sign-up code (`phoneAuth.sendCode`)
- Farmer: forgot PIN code (`phoneAuth.sendCode`)
- Shopper: the bill for a delivery order is ready to pay (`bill_ready`)

Everything else is push and in-app only:

- shopper "ready for pickup";
- farmer application received;
- farmer application approved;
- farmer new order.

Implementation:

- In `SMS_KINDS` keep `shop: bill_ready`, `farm: payout_account_changed`.
- Update the Alerts settings screen, which shows which alerts can text. The
  "SMS" toggles disappear for kinds that no longer text.
- Update the help/legal text that promises texts, and the Admin Portal Texts
  page if it lists kinds.
- Update the tests.
- Farmers must still get new orders reliably without a text. This depends on
  push (#2), so #2 is a must before launch.

**Farmer steps.** The farmer only accepts (or declines).

1. **Delivery orders.** Farmkeke staff mark "out for delivery" and
   "delivered" from Admin Portal Dispatch. The shopper can also tap "It's
   arrived". The farmer no longer has Start preparing, Mark packed, Ready for
   rider or Confirm handover.
2. **Pickup at the farm.** Keep the QR/code scan as the farmer's one
   optional step (`confirmCollection`). The order still has to become ready
   to collect without a farmer click. After acceptance it's ready to collect
   straight away; check the pickup notice and the shopper's QR screen still
   appear. The shopper should also have a way to confirm "Collected" when
   the farmer doesn't scan, and staff can mark it from the Admin Portal.
3. **Buyer protection** (the 24-hour window to report a problem) starts when
   the shopper confirms ("It's arrived" or "Collected"). Staff marking
   delivered, or the farm scanning, also counts as confirmation where the
   shopper hasn't confirmed. Check the existing auto-complete/cron rules so
   orders still close, and that farm payouts and refunds don't wait on a
   farmer click.

## #12 Website and Admin Portal favicon: use the app icon

- **Where:** farmkeke.com (all pages) and the Admin Portal (`/admin`), both
  served by the Next.js app in `web/`.
- **Owner's words:** "Replace the website favicon with the farmkeke app icon.
  That icon can also work for the website favicon for the farmkeke website
  and the admin section as wwe"
- **What's wanted:** the browser tab, bookmark and home-screen icon for the
  website and the Admin Portal is the Farmkeke app icon.
- **Notes for the fix:**
  - The source is `assets/icon.png`: 1024×1024, full-bleed `#F2F8E6`, made
    19 Nov from the owner's draft (`assets/store/icon-draft-source.png`).
  - Today the site has only `web/src/app/favicon.ico`. Next.js 16 file
    conventions in `web/src/app/` work: `favicon.ico` (16/32/48), `icon.png`
    (e.g. 512) and `apple-icon.png` (180). Generate them with sharp, which is
    already in `web/node_modules`.
  - Rounded corners: browsers show the square as-is, so check whether the
    icon reads well at 16×16 and 32×32. If the stacked wordmark is unreadable
    that small, tell the owner and suggest a simplified small-size version.
    Don't invent a new mark.
  - Check whether the Admin Portal sets its own icon in its layout/metadata,
    so it uses the same one.
  - Check `web/public` and any `manifest` for older icons, and update
    `site.webmanifest` if one exists.
  - Website change: pushing to main redeploys farmkeke.com, so confirm with
    the owner before pushing.
- **Approved (22 Nov):** the owner approved the draft at
  https://claude.ai/artifact/MnSHy5EmbbPYxRZWvtL5Ru (shopper and farmer
  versions). Build it.
- **Owner follow-up (22 Nov):** keep the "in your name" wording without adding
  a name-match check for now. Make the website's "What you need" match exactly
  what the app asks for. Done by the main session:
  - `web/src/app/(site)/sell/page.tsx`:
    - "What you need" is now: mobile number (code + PIN), name and NIN,
      farm location, at least 3 farm photos, bank account in your name;
    - the "How to apply" steps now match the app's sign-up;
    - "within 3 working days" became 2.
  - The home page lists and the "verified" text, the About page's checks, the
    farm page's "Verified by Farmkeke" note and the Help answer no longer
    mention proof of address or the association letter.
  - Still open: the Sell page's "How orders work" list mentions SMS alerts
    and "Mark it as packed". It belongs to the #11 changes; check that it's
    updated.
