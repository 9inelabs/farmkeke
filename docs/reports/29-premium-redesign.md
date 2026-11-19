# Premium redesign: welcome, sign-in and farmer sign-up

Date: 19 November 2026

This builds the approved mockups (15 screens) in the app.

- **Welcome slides, Get started, sign in and create account:** deep green surfaces with lime accents, real photos and the website's dark gradient.
- **Farmer sign-up:** the same style, a step bar on every step, and Farmkeke's own PIN keypad.
- **Photo credits** are on the About screen.

## 1. What was built, by file

### Shared pieces

- **`src/components/premium/`** (new):
  - `ForestBackdrop` is the dark green surface: a gradient from `#0B1A07` to forest, lime glows drawn with SVG radial gradients, and a faint grid.
  - `Glass` is a frosted card for content on photos and dark green.
  - `StepBar` shows the five sign-up steps. Earlier steps are full, and the current one fills as the screen opens.
  - `PinPad` replaces the phone's keyboard for PINs:
    - four dots that pop lime as you type;
    - round keys with a light tap on iPhone;
    - a shake and an error buzz on a wrong PIN;
    - on the web, typing digits and Backspace also works.
- **`src/theme`:** adds Montserrat ExtraBold (`fonts.displayHeavy`) for big headlines, and the colours `forestDeep`, `forestMid` and `onForest`.
- **`src/lib/haptics.ts`:** adds `errorFeedback` and `keyFeedback`.
- **`TextField`:** adds `tone="premium"`:
  - a 54pt rounded field with its icon inside;
  - a forest outline and soft lime halo when focused;
  - an optional lime tick (`valid`);
  - the password eye inside the field.
- **`Button`:**
  - a `size="hero"` (54pt, lime or forest glow);
  - a `variant="glass"` for dark screens.
- **`PasswordRules`:** a `meter` option adds a three-part strength bar with the rules in a row.
- **`Wordmark`:** a `tint` option, so it can show in white.
- **`assets/photos/`** (new): eight photos resized for phones, 1.2 MB in total.
  - Wikimedia Commons: a farmer with ugwu, a farmer in her field, tomatoes and a pepper market.
  - Unsplash: fruit, carrots and peppers, a market stall and vegetables.

### Shopper screens

- **`app/(onboarding)/welcome.tsx`:** three slides that follow your finger. Photos and floating cards move at different speeds from the text, the active page dot stretches into a bar, and the cards on the photos drift gently.
  1. A farmer photo fading into deep green: "Fresh food, straight from Nigerian farms".
  2. A light produce collage with "Rider on the way" and "Or pick up at the farm" cards.
  3. Deep green with the order card (placed, accepted, then pay) and the "Buyer protection" badge.
- **`app/(onboarding)/get-started.tsx`:** a market photo and "How will you use Farmkeke?" with two choice cards; the selection animates.
  - **I'm shopping:** Create account, Sign in, or Continue as a guest.
  - **I'm a farmer:** Apply as a farmer, Log in as a farmer, or Just look around the shop.
- **`src/features/auth/AuthScreen.tsx`:** the shared layout for sign in, create account and reset password.
  - A dark green header with a round produce photo, the white wordmark and a big headline.
  - The form sits on a white sheet that rises over the header. Scrolling or the keyboard slides the sheet up while the photo drifts and fades.
  - Sign in adds "Keep shopping as a guest" and a "Selling on Farmkeke? Log in with your phone and PIN" card.
- **Sign in:** premium fields with icons and a "Sign in" button.
- **Create account:** benefit chips in the header, a live tick on valid name and email, the password strength meter, and a Terms and Privacy line.
- **Reset password:** premium fields and the strength meter.

### Farmer sign-up

- **`src/features/sell/SellShell.tsx`** (rewritten):
  - a round Back or Close button;
  - "Step X of 5" and the step bar;
  - a big left-aligned headline, with the main button pinned at the foot;
  - a light tone for form steps and a dark green tone for the PIN, log-in and finish screens.
- **Intro (`app/sell/index.tsx`):** a full-height farmer photo fading into green, three glass benefit cards, and "Apply as a farmer". A photo staff set in the Admin Portal (Site photos) still shows over the built-in one.
- **Phone:** a +234 field with the Nigerian flag, and a privacy note.
- **Code:** restyled code boxes, "Wrong number? Change it", and a countdown to resend.
- **PIN:** dark green, with the new keypad. Wrong confirmations shake and start again.
- **Log in:**
  - dark green;
  - a frosted phone field;
  - the PIN keypad, which logs in when the fourth digit is typed;
  - "Forgot PIN?".
- **About you:** a photo tile next to the headline; name, farm and NIN in one card with icons and ticks; the location card offers "Use my location" and "Choose it" side by side.
- **Farm photos:** a two-column grid with a "Cover" label on the first photo, an "Uploading" overlay, and separate "Take a photo" and "From gallery" tiles.
- **Bank:** a live dark green account card fills in as you type and shows "Verified" when Paystack matches the name.
- **Review:** restyled cards and the "Submit application" button.
- **Application sent:**
  - the lime circle springs in;
  - the tick draws itself in;
  - lime confetti bursts out;
  - a success buzz on iPhone;
  - then a "What happens next" timeline.

### About

- **`app/about.tsx`** and **`src/content/photoCredits.ts`:** a "Photo credits" card. Each Wikimedia photo has its title, photographer, "via Wikimedia Commons" and the CC BY-SA 4.0 licence, linked; there is also a link to Unsplash for the produce photos.

## 2. Deviations from the spec and why

- **"Now delivering in Owerri" became "Fresh from Nigerian farms"** on Get started. Service areas are set in the Admin Portal and will grow, so a fixed town would go stale.
- **The welcome card says "Verified farm"** without a town, for the same reason.
- **The step headers no longer show Admin Portal photos.** The old farmer sign-up showed a staff-chosen photo behind each step. The new design has no photo band on the form steps, so only the intro keeps the Admin Portal photo.
  - The Site photos settings for the phone, code, PIN, profile, bank, review and submitted scenes no longer show anywhere. They can be removed from the Admin Portal later.
- **The old Sign in / Create account switch is gone.** Each screen links to the other at the bottom, as in the mockup.
- **Get started sends farmers to the farmer intro**, rather than straight to the phone step, so they see what selling involves first.
- **Frosted glass on the web is a translucent fill without blur.** React Native has no cross-platform background blur without a native module. It looks the same at a glance.

## 3. Bugs found and fixed

- **Wrong payment wording on the bank step.** It still said farmers are paid "once buyers confirm their orders". Since the Paystack split, it now says "When a buyer pays, Paystack sends your share straight to this account."
- **Farmer log in with a mistyped phone number.** With the new keypad, there's no Log in button; typing the fourth PIN digit submits. If the phone number was invalid at that moment, the PIN stayed filled and couldn't be submitted again. The PIN now clears with the phone error, so typing it again submits.
- **Found while checking screenshots:**
  - the sign-in headline ran into the round photo, so the photo moved right and the headline got a soft shadow;
  - the "+234" prefix wrapped onto two lines on the log-in screen;
  - the photo credits card was white on a white page.
- **Get started leaving the welcome.** Sign in and Create account now open on top of the shop (or the area picker on a first visit), not on top of Get started. Before, closing them returned to the welcome screen.

## 4. Verification

- `npm run typecheck` (app and backend): no errors.
- `npx tsc --noEmit --noUnusedLocals`, filtered to the changed files: no findings.
- `npx expo export --platform android` and `--platform ios`: both bundled (2,305 and 2,212 modules).
- **Web build against the dev backend:** `EXPO_PUBLIC_CONVEX_URL=https://incredible-wolf-877.eu-west-1.convex.cloud npx expo export --platform web --clear`, served locally.
  - Playwright at 390 × 844 opened welcome (all three slides, by pressing Next), get started, sign in, create account, the farmer intro, phone, code, PIN (after typing two digits), farmer log in, application sent and About.
  - No page errors and no console errors.
  - Each screenshot was checked by eye against the approved mockups.
- **Not screenshotted:** the four application steps (about you, photos, bank, review). They need a signed-in farmer with a draft application, and they send everyone else back to the farmer intro. They typecheck and bundle; check them on a phone.

## 5. Open questions and guesses

- **Photo licences.** The four Wikimedia photos are CC BY-SA 4.0, which requires credit (now on About). "Share-alike" applies to edited versions of the photos themselves. The app only crops them and lays gradients over them in the interface, which is normally treated as using the photo rather than making a new version of it. Swapping in photos of your own farmers later removes the question entirely.
- **Haptics on Android.** As before, vibrations only run on iPhone, matching the app's existing choice.
- **The old onboarding illustrations** (`assets/illustrations/onboarding-*.jpg`, `start-shopping.jpg`) and the feature icons are no longer used by any screen. They're left in place. Unused files aren't bundled.

## 6. What's next

- Try the welcome slides, the PIN keypad and the sign-up steps on a real phone, to feel the motion and haptics.
- The Admin Portal sign-in, sign-up and dashboard redesign: mockups first, for approval.
