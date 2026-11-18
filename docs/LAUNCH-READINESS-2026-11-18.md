# Launch readiness: 18 Nov 2026

Replaces `LAUNCH-READINESS-2026-10-25.md`. Since then, payments have moved to the Paystack split, so farms are paid by Paystack directly and there are no payouts or Transfers.

## Health today

- **Code:**
  - typechecks pass for the backend (`convex/`), the app and the website;
  - 104 backend tests pass;
  - the app bundles for Android, iOS and web;
  - the website compiles;
  - there are no TODOs left in the code.
- **The app starts cleanly.** The web build opens on the welcome screens with no errors.
- **The likely reason "the app doesn't load correctly": the backend isn't deployed.** Almost every recent change needs the new Convex code on the deployment the app points to. Without it, screens call functions that don't exist yet, and load forever or show an error.
  - `orders.consumer.markArrived` ("It's arrived");
  - the phone sign-up (`phoneAuth.*`);
  - the farmer profile step (`farmerApplications.saveProfile`);
  - the farmer sign-up photos (`sitePhotos.farmerSignup`);
  - the new earnings, Admin Money and split payment code.
- **Fix:**
  - dev: `npx convex dev --once` (or `npx convex deploy` for dev);
  - production: `npx convex deploy`, then reload the app.
- **Running the app locally** needs `.env.local` with `EXPO_PUBLIC_CONVEX_URL`, written by `npx convex dev`. Without it the app stops on launch.

## 1. Do first

1. **Deploy Convex** to dev, then production.
2. **Check the website deploy finished on Vercel.** The latest `main` has the new home page, banner, sticky store top and checkout summary.
3. **Send the Paystack email** once farmkeke.com shows the new wording (/buyer-protection; /escrow redirects there).

## 2. Paystack (the split)

1. **Test mode on dev, start to finish:**
   - test key set, then approve a test farm, and check its subaccount appears in the Paystack dashboard;
   - a two-farm order, both farms accept, pay with a test card, and check the split (each farm's flat share, and the fee shared proportionally);
   - cancel one order from Admin, then check the refund, the farm's debt, and that the farm's next share is reduced.
2. **Live:**
   - set `PAYSTACK_SECRET_KEY` (`sk_live_…`) on production; existing farms are set up with Paystack within the hour (cron);
   - set the webhook to `https://abundant-ram-87.convex.site/paystack/webhook`;
   - make one real low-value payment and refund it.
3. **Keep money in the Paystack balance.** Refunds come from Farmkeke's balance, and default daily settlement empties it.
4. **Never open production without the key.** Without it the "Pay now (test)" button appears.

## 3. Setup outside the code

- **Convex production settings:**
  - `JWT_PRIVATE_KEY`, `JWKS` (new keys);
  - `SITE_URL`, `WEBSITE_URL`;
  - Resend (`AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, `EMAIL_REPLY_TO`);
  - Termii (`TERMII_API_KEY`, `TERMII_SENDER_ID`, `TERMII_CHANNEL=dnd`);
  - Paystack.
- **Starting data:**
  - `seed:run` (categories and units only; sample areas are in `seed:sampleAreas`, for dev only);
  - the Founder account (`admin/setup:createFounder`);
  - real service areas and delivery prices, riders, and the fees page.
- **Termii:**
  - a new API key (the old one was in a session log);
  - an approved sender ID.
  - Farmers can't sign up without texts.
  - Guests need an email for their bill until texts work.
- **Resend:** verify farmkeke.com, and set up a real support@farmkeke.com inbox.
- **Vercel:**
  - production `NEXT_PUBLIC_CONVEX_URL=https://abundant-ram-87.convex.cloud`;
  - `NEXT_PUBLIC_SITE_URL=https://farmkeke.com`.
- **Push notifications:**
  - `eas init` (the app has no EAS project ID yet; without it push is quietly off);
  - Firebase for Android (`google-services.json` and the FCM key);
  - an Apple push key on the first iOS build.

## 4. Store submission

1. **App icon.** `assets/icon.png` is the full wordmark on white, unreadable at home-screen size. It needs a square mark (e.g. an "fk" monogram), and the Android adaptive icon needs the same.
2. **Listings:** screenshots (iPhone 6.9" and 6.5", Android phone), descriptions and keywords, the support URL and the privacy URL.
3. **Privacy forms:** Apple App Privacy and Google Data safety. The app collects name, phone, email, address, precise location, photos, the push token and purchase history. It shares data with Paystack and Termii.
4. **Reviewer accounts on production:** a shopper (email and password) and a farmer (phone and PIN).
5. **Google Play:** a personal developer account needs a 14-day closed test with 12 testers. An organisation account (D-U-N-S) doesn't.

## 5. Still to build or decide

| Item | Status |
| --- | --- |
| About page names | Four placeholders: "[Founder name]" and three "[Name]" |
| Map pins for shoppers | Planned for the first store release; needs a native build and a Google Maps key |
| App links (email and text links open the app) | Not done: `.well-known` files, `associatedDomains`, `intentFilters` and a native build |
| Crash reporting | None in the app or on the website (e.g. Sentry free tier) |
| Forgiving a farm's debt | Works; the farm isn't told and no ledger row is written |
| Old payout data model | Old tables and fields (payouts, held money) can go later with a migration |
| Staffing pay and budget | Open on the staffing board |

## 6. Done since 25 Oct

- **Code blockers:**
  - the app's legal screens;
  - the EAS production URL;
  - dev screens hidden in release builds;
  - the iOS encryption flag.
- **Legal and content:**
  - legal pages out of draft, and the refund policy finalised;
  - Contact page details;
  - category art.
- **Features:**
  - QR pickup scanning;
  - Admin Messages;
  - the delivery-marking decision.
- **Payments:**
  - the Paystack split, end to end in code;
  - buyer protection wording everywhere;
  - Admin Money (payments, refunds, farm accounts);
  - refunds paid by Farmkeke and recovered from farms.
- **Website:**
  - the Next.js security patch (16.4.6);
  - the hero, the farmer section, the promotion banner and the sticky store top;
  - every Nigerian state in the area pickers (app and website).
