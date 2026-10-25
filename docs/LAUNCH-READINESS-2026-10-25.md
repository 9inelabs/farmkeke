# Launch readiness: 25 Oct 2026

A full pass over the repo: the mobile app, the website and Admin Portal, and the Convex backend. It follows on from `docs/AUDIT-2026-10-23.md`, the reports in `docs/reports/`, `web/BUILD-STATUS.md` and the build plan.

It leaves out the three things already known: the **Paystack live key**, the **Apple Developer account** and the **Google Play account**.

## Health today

- **Builds and tests:**
  - The app, backend and website typecheck cleanly.
  - Website lint is clean.
  - All 65 backend tests pass.
  - The app's web and Android bundles build.
- **Feature work:** every screen in the Screen Inventory exists (app batches A to F, website and Admin Portal phases).
- **Since 23 Oct:** none of the five code fixes in section A of that audit has been done. They are in section 4 below.
- **Not seen on a real phone yet:**
  - push notifications;
  - the in-app Paystack page;
  - the phone sign-up texts.

  This environment has no phone or emulator.

---

## 1. Blockers in the code

No input needed for items 1 to 4. Item 5 needs a decision.

1. **The app's legal screens are placeholders.** `app/legal/[doc].tsx` and `app/farm-settings/terms.tsx` say "The full text is being prepared by Farmkeke's legal adviser and will appear here before launch".
   - The website already has the drafted text in `web/src/content/legal/*.json`.
   - The app should show the same text, or open the farmkeke.com page.
   - Apple and Google both check that the privacy policy can be reached from inside the app.

2. **A store build would crash on opening.** `src/lib/convex.ts` throws if `EXPO_PUBLIC_CONVEX_URL` is missing, and `eas.json` doesn't set it for any profile. The production build needs `https://abundant-ram-87.convex.cloud`, set either:
   - in `eas.json` → `build.production.env`; or
   - as an EAS environment variable.

3. **Sample screens ship in the release app.**
   - Reachable by link: `/dev/account`, `/dev/alerts`, `/dev/chat`, `/dev/farm`, `/dev/orders` and `/dev/sell`.
   - Already hidden: `/dev/gallery` and `/dev/home-preview`.
   - Fix: hide them everywhere except development builds and the web preview, which uses them.

4. **The iOS encryption question on every upload.** Add `"infoPlist": { "ITSAppUsesNonExemptEncryption": false }` under `ios` in `app.json`. The app only uses standard HTTPS, so this is the correct answer, and App Store Connect stops asking.

5. **Nobody outside the office can mark a delivery "Delivered".**
   - Only staff can, in Admin Portal → Dispatch. The rider has no app.
   - The shopper's "I received everything" stays locked until it's marked, so the farm isn't paid until someone in the office acts.
   - Options:
     - **(a)** Let the shopper confirm once the order is out for delivery. This also marks it delivered. Recommended.
     - **(b)** Text the rider a "Delivered" link when they're assigned.
     - **(c)** Both.
   - Pick one and I'll build it.

## 2. Blockers outside the code: setup

### Convex production (`abundant-ram-87`)

1. **Deploy the current code** with `npx convex deploy`. Recent work has only gone to dev: the phone sign-up, the in-app payment fixes and the site photos.

2. **Production settings.** Set these with `npx convex env set --prod NAME value`:

   | Variable | Value or note |
   | --- | --- |
   | `JWT_PRIVATE_KEY`, `JWKS` | New keys for production. Don't copy dev's. |
   | `SITE_URL` | `https://farmkeke.com` |
   | `WEBSITE_URL` | `https://farmkeke.com` |
   | `AUTH_RESEND_KEY` | Resend key |
   | `AUTH_EMAIL_FROM` | e.g. `Farmkeke <no-reply@farmkeke.com>` |
   | `EMAIL_REPLY_TO` | `support@farmkeke.com` |
   | `EMAIL_ASSETS_URL` | Optional. Where the email logo is served from. |
   | `TERMII_API_KEY` | New key (see SMS below) |
   | `TERMII_SENDER_ID` | The approved sender ID |
   | `TERMII_CHANNEL` | `dnd`, so codes reach numbers on Do Not Disturb |
   | `PAYSTACK_SECRET_KEY` | The live key, starting `sk_live_` |

   - Never set `AUTH_DEV_LOG_EMAILS` or `PAYMENTS_TEST_STEP` on production.

3. **Don't open production before the Paystack key is set.**
   - Without `PAYSTACK_SECRET_KEY`, the backend turns on the "Pay now (test)" button.
   - That button marks orders paid without any money moving (`convex/lib/paystack.ts`, `testStepOn`).

4. **Starting data.**
   - `seed:run` adds the categories and units that are needed.
   - It also adds three sample service areas and three sample pickup points with made-up phone numbers. Either:
     - delete or replace those in the Admin Portal straight after; or
     - ask me to split the seed into "needed" and "sample".
   - Never run `seed:demoStorefront` on production.

5. **The Founder admin account:**

   ```
   npx convex run --prod admin/setup:createFounder '{"email":"…","name":"…"}'
   ```

6. **Real operations data,** entered in the Admin Portal:
   - service areas and their delivery prices;
   - riders, with phone numbers;
   - the fees and rules page;
   - the App Store and Play Store links, once the apps are published (Admin → Platform). Until then the website's buttons say "Coming soon".

### Paystack, beyond the key

1. **Webhook.** In the Paystack dashboard (live mode), set it to `https://abundant-ram-87.convex.site/paystack/webhook`.
2. **Payouts to farmers use Paystack Transfers.**
   - Turn on Transfers, and turn off "OTP for transfers", or every payout waits for a code.
   - Make sure the Paystack balance can fund payouts. By default Paystack settles each day's takings to your bank account, which leaves the balance empty, and then farmer payouts fail. Either:
     - change settlement so money stays in the balance; or
     - top the balance up.
   - Refunds come from the same balance.
3. **One real low-value payment on production before opening:** a pickup checkout and a delivery bill. Then refund them from the Admin Portal.

### Texts (Termii)

1. **Regenerate the API key.** It appeared in a session log on 21 Oct.
2. **Get the sender ID approved.** It's "OE Alert" today; should it be "Farmkeke"? Nigerian networks need an approved sender ID.
3. **Texts are now required for farmers:**
   - without them, farmers can't sign up (the 6-digit code) or reset a PIN;
   - shoppers also get delivery bills and pickup codes by text.

### Email (Resend)

1. Verify farmkeke.com in Resend, so mail sends from `no-reply@farmkeke.com`.
2. Set up a real `support@farmkeke.com` inbox, or forwarding. The app and emails send people there.

### Website (Vercel)

1. A production project for `web/` on the farmkeke.com domain, with:
   - `NEXT_PUBLIC_CONVEX_URL` = `https://abundant-ram-87.convex.cloud`
   - `NEXT_PUBLIC_SITE_URL` = `https://farmkeke.com`
2. The app preview at farmkeke-app.vercel.app uses the dev backend. That's fine, but it's public.

### Push notifications

The app builds without these, but no notification will arrive.

1. Run `eas init`. It writes `extra.eas.projectId` into `app.json`; the old id belonged to `market2pot`.
2. Android: a Firebase project, its `google-services.json` (`android.googleServicesFile`), and the FCM V1 key uploaded to EAS.
3. iOS: an Apple push key, which `eas credentials` sets up on the first iOS build.

### Store submission

1. **The app icon.**
   - `assets/icon.png` is the full "farmkeke" wordmark on white. At home-screen size (about 60px) the letters are tiny and hard to read.
   - It needs a square mark, e.g. an "fk" monogram on lime or forest. There is no brand mark besides the wordmark in the repo yet.
   - The Android adaptive icon (`android-icon-*.png`) needs the same.
2. **Store listings:**
   - iPhone screenshots (6.9" and 6.5") and Android phone screenshots;
   - short and long descriptions, keywords;
   - the support URL and the privacy policy URL (the final version, not a draft).
3. **Privacy forms:** Apple's App Privacy answers and Google's Data safety form. The app collects:
   - name, phone, email and address;
   - precise location, while in use;
   - photos;
   - the push token;
   - purchase history.

   It shares payment with Paystack and texts with Termii.
4. **Accounts for the reviewers,** on production:
   - a shopper (email and password);
   - a farmer (phone and PIN; logging in needs no text);
   - a note that payment goes through Paystack for physical goods, which both stores allow outside in-app purchase.
5. **Google Play testing rule.** A new **personal** Play developer account has to run a closed test with at least 12 testers for 14 days before it can publish. An **organisation** account (needs a D-U-N-S number) doesn't. Apple's organisation account also needs D-U-N-S. Allow for this in the launch date.

## 3. Content and legal

1. **The legal pages are all marked draft:** Privacy, Terms, Farmer terms and Cookies (`"draft": true`). The website shows "Draft: awaiting final approval… not yet in force" on each.
   - They need a lawyer's review, then `draft: false`.
   - The privacy policy was written before the phone sign-up. It should also cover:
     - signing in with a phone number and texted codes;
     - the 4-digit PIN (kept only as a one-way hash);
     - the farmer's profile photo and farm location.
2. **The refund policy.** `refunds.proposed.json` (21 Oct) is waiting to replace `refunds.json` (17 Oct). Approve or drop it.
3. **The Contact page** (`web/src/app/(site)/contact/page.tsx`) still has "+234 [support line]" and "[Office address]".
4. **The About page** (`web/src/app/(site)/about/page.tsx`) still has "[Founder name]" and three "[Name]" team entries.
5. **Category art.** "Herbs & Spices" and "Legumes & Nuts" show a placeholder tile in the app; the other six have illustrations.
6. **The support reply-time promise.** The app says a person "usually replies within a few hours". Keep it, or change it?

## 4. Should fix before launch (not blockers)

From the 23 Oct audit, still open:

1. **Order photos.** Order rows show a photo for every item, not just the first plus "+N" (website W-43/W-44 and the app's order list).
2. **Old phones keep getting alerts.** Drop a phone's push token when its session ends elsewhere, e.g. a password reset on another device.
3. **The problem-decision deadline.** The 24-hour deadline should be a setting on Admin → Fees & rules.
4. **Customer search.** Admin customer search by name needs a search index on `users.name`.
5. **App shop:**
   - a farm-location filter in search;
   - "See all" on Home opening a full Fresh Picks grid.

Also:

6. **App links for farmkeke.com.** Bill and order links in emails and texts open the website, not the app. Opening the app from them needs:
   - `apple-app-site-association` and `assetlinks.json` under `web/public/.well-known/`;
   - `associatedDomains` and `intentFilters` in `app.json`;
   - a new native build.
7. **Remove the old pickup-point and time-slot code,** and the hidden `/admin/pickup-points` page (recommended in report 16).
8. **Crash reporting.** There isn't any in the app or on the website. If something breaks on a customer's phone, you won't hear about it unless they tell you. Adding Sentry (free tier) to the app and the website is a small job.

## 5. Decisions waiting on you

- The delivery marking question in section 1, item 5.
- "Ask the farmer" before ordering (W-06). It goes to Farmkeke support today.
- Two-person approval for large refunds and payouts.
- Map pins in the app (`react-native-maps` plus a Google Maps key) and QR scanning of pickup codes (`expo-camera`). Both need a native build.
- Smaller numbers:
  - the ₦50,000 delivery-price ceiling;
  - at most 3 unpaid delivery checkouts;
  - low stock at 3 units;
  - the 30-minute window to set a PIN after the code.
- Offering push notifications to guests.
- Whether the farm sees the buyer's street on delivery orders. It's hidden today.

## 6. Suggested order

1. **Code, about a day:**
   - the blockers in section 1;
   - the delivery decision, once you've picked;
   - items 1 to 5 of section 4.
2. **Setup, in parallel:**
   - Termii key and sender ID;
   - Resend domain;
   - Vercel production;
   - EAS and Firebase.
3. **Production backend:**
   - deploy;
   - settings;
   - seed, then clean up the sample areas and points;
   - the Founder account;
   - real areas, riders and fees.
4. **Paystack live:**
   - the key;
   - the webhook;
   - Transfers;
   - balance funding;
   - one real payment and refund.
5. **EAS builds on real phones:**
   - a full run as a shopper (pickup and delivery) and as a farmer (sign-up, approval, a listing, an order, a payout);
   - push on both platforms.
6. **Store submission:** icon, screenshots, privacy forms and review accounts. On Google Play, the 14-day closed test if it applies.
