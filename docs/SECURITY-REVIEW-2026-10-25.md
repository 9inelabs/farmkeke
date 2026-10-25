# Security review: 25 Oct 2026

A security check of the mobile app, the website and the Admin Portal, and the Convex backend they all share. It had two parts:

1. **A code review:**
   - every one of the 284 functions the apps can call;
   - the backend's public web addresses (the Paystack webhook and the return pages);
   - sign-in for shoppers, farmers and staff;
   - uploads, payments and payouts;
   - the website's headers and redirects;
   - how the app stores its login;
   - the packages each part depends on;
   - the git history, for leaked keys.
2. **Attack attempts** against a private, in-memory copy of the backend, in `convex-tests/security.test.ts`. They play:
   - an attacker who isn't signed in;
   - a guest;
   - another shopper;
   - another farm;
   - staff whose role is too small;
   - staff who never entered the emailed code.

   They try to read or change other people's data, pay less than the price, fake a Paystack payment, guess codes and PINs, and promote themselves.

Nothing was run against the live dev or production backend, and no real payments were made. This environment's network policy also blocks the live sites, so the deployed website's headers were checked on a local copy.

## The short answer

The backend is solid where it matters most. Every attack in the suite was refused:

- admin access;
- other people's orders, addresses, chats, problem reports, support tickets and saved cards;
- other farms' orders and listings;
- tampered prices and quantities;
- fake or short Paystack payments;
- guessed bill links;
- staff promoting themselves.

The review found **five real weaknesses**, all fixed in this change:

- two **high**: guessing a farmer's PIN, and changing the payout bank account without the PIN;
- two **medium**: text-message cost abuse, and missing website security headers;
- one **low**: SVG uploads.

It also found smaller gaps, closed alongside them. A few things remain for you, mostly outside the code (section 4).

## 1. What held up

The defences already in place, all confirmed by the attack tests:

- **Admin Portal access.**
  - Every admin function checks for an approved staff member whose session passed the emailed 6-digit code, and checks the role's permissions.
  - A password alone isn't enough.
  - Staff sessions expire after 12 hours.
  - Staff can't change their own role or switch themselves off.
- **Ownership.**
  - Orders, checkouts, chats, problem reports, reviews, support tickets, addresses, saved cards, notifications and payouts are each checked against the signed-in person.
  - Asking for someone else's returns nothing; acting on someone else's is refused.
- **Farms.** A farm can only see and act on its own orders, packing slips, listings and payouts.
- **Prices come from the server.** A cart that claims ₦0.01, a negative or fractional quantity, or a million units is refused, and no checkout is created.
- **Payments.**
  - Paystack webhooks need a valid signature, compared in constant time, and every charge is re-checked with Paystack before use.
  - A payment for less than the bill is recorded as a mismatch, not as paid.
  - "Pay now (test)" refuses once a Paystack key is set.
- **Bill links** are 192-bit random tokens. A guessed or empty token gets nothing.
- **Find my order** needs the order number and its phone. Even then it hides the pickup code, the phone number and the street.
- **Sign-up codes.**
  - 6 digits, 10 minutes, 5 wrong tries per code, and 5 codes per number per hour.
  - Only a proved phone can be taken over by a code.
- **Passwords:** at least 8 characters with a letter and a number, and 5 wrong tries per hour per account.
- **Website:**
  - no unsafe HTML;
  - the only raw HTML is QR codes from a library and SEO data with `<` escaped;
  - sign-in redirects only go to pages on the same site, so there are no open redirects;
  - admin CSV exports already neutralise spreadsheet formulas in names.
- **Emails** escape everything customers type.
- **The app** keeps its login tokens in the phone's secure keychain (`expo-secure-store`). Only the backend's public address is bundled into it. Notification taps only open the app's own screens.
- **Secrets:** no keys anywhere in the git history, and no `.env` or key files tracked.
- **Website packages:** `npm audit` finds no known vulnerabilities.

## 2. Found and fixed

| # | Severity | What an attacker could do | Fix |
| --- | --- | --- | --- |
| 1 | High | **Guess a farmer's PIN.** Logging in by phone allowed 5 wrong PINs an hour per account, forever: 120 guesses a day against 10,000 possible PINs. Any buyer sees the farm's phone (the login name) on their order. One farmer's PIN fell in about 6 weeks on average, and across many farmers that's several break-ins a day. | After **5 wrong PINs in a row**, PIN log-in locks until the farmer sets a new PIN with a texted code (Forgot PIN). The right PIN resets the count. The app explains the lock and points to Forgot PIN. |
| 2 | High | **Redirect a farm's money.** Anyone holding a farmer's unlocked phone, or a stolen session, could change the payout bank account with no PIN or password. The farmer got a text, but the change took effect at once. | Changing the payout account now needs the farmer's **PIN (or password)**, asked in a "Confirm it's you" sheet. Wrong PINs here count towards the same lock, so this can't be used to guess a PIN either. |
| 3 | Medium | **Run up the SMS bill** ("SMS pumping"). The sign-up code limit was per number, so a script cycling through numbers could send unlimited texts at your cost. | At most **300 sign-up texts an hour across all numbers**, on top of 5 per number. |
| 4 | Medium | **Clickjacking.** The website, including the Admin Portal, sent no security headers, so another site could frame it and trick staff into clicking. | Every page now sends a header set (below). The Admin Portal is also never cached by shared caches, and never indexed. |
| 5 | Low | **Upload an SVG with a script.** Uploads accepted anything claiming to be an image, including SVG, which browsers run as a document. | Only photo formats are accepted: JPEG, PNG, WebP, HEIC/HEIF and GIF. |
| 6 | Low | **Flood someone's inbox** with password-reset emails, from the shop's or the Admin Portal's form. | At most **5 reset emails an hour per address**. The form looks the same either way, so it still can't be used to find out who has an account. |
| 7 | Low | **Fill storage with junk** through the chat and farmer-application upload links, which had no limit. | 60 an hour (chat) and 120 an hour (farm uploads) per person. Problem-report uploads already had a limit. |
| 8 | Low | A known memory-exhaustion bug in `zod` (the app's form-checking library). | Updated to 4.6.7. |

The header set from fix 4:

- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: no camera or microphone; location for this site only
- `Strict-Transport-Security` for two years

### Files changed

- **Backend:**
  - `convex/schema.ts`: two optional fields on users, `pinFailures` and `pinLockedAt`.
  - `convex/phoneAuth.ts`: the PIN lock (`pinFailed`, `pinCleared`, `credentialsOf`) and the hourly cap on all texts.
  - `convex/lib/phoneAuth.ts`: log-in checks the lock and counts wrong PINs; setting a new PIN unlocks.
  - `convex/lib/reauth.ts` (new): "confirm it's you" with a PIN or password.
  - `convex/payments/bank.ts`: payout account changes need it.
  - `convex/accountsInternal.ts`, `convex/lib/passwordProvider.ts` and `convex/lib/staffAuth.ts`: the reset-email cap.
  - `convex/lib/uploads.ts`: photo formats only.
  - `convex/chat.ts` and `convex/farmerApplications.ts`: upload-link limits.
- **App:**
  - `app/farm/payout-account.tsx`: the "Confirm it's you" sheet (PIN boxes, or a password field).
  - `src/features/sell/usePhoneAuth.ts` and `src/lib/errors.ts`: messages for a locked or wrong PIN.
  - `package.json`: zod 4.6.7.
- **Website:** `web/next.config.ts`, the security headers.
- **Tests:** `convex-tests/security.test.ts`, 14 tests. Ten are the attack suite; four prove the fixes:
  - the lock after 5 PINs;
  - a payout change refused without the PIN and with a wrong one;
  - SVG refused;
  - the text, email and upload caps.

## 3. Reviewed and left as they are

- **Support staff can see payouts.** The Support role includes viewing money, so they can answer "where's my payout?". It shows amounts and statuses, not bank numbers. Say if you'd rather they couldn't, and I'll take `money.view` off the built-in Support role.
- **"This email already has an account" at sign-up.** This tells someone whether an email is registered. Almost every shop does this, and hiding it makes sign-up confusing. Password reset doesn't reveal it.
- **4-digit PINs** remain, as you chose. With the new lock they're safe against guessing. A 6-digit PIN would add a margin; say if you want it.
- **Upload IDs aren't tied to who uploaded them.** A file's ID is a long random value that's never shown to other people, so it can't be guessed or reused in practice.
- **Build-tool packages in the app.** `npm audit` lists 16 issues, but all of them are in Expo's build and command-line tools (`@expo/cli`, `xcode`, `node-forge`, `shell-quote` and so on). They run on the developer's computer, not in the app on phones. They clear when the app moves to the next Expo SDK. `npm audit fix --force` would downgrade Expo to SDK 54, so don't run it.

## 4. Still to do (you)

1. **Deploy, then rebuild:**
   - `npx convex dev --once` (and the production deploy later) puts the backend fixes live;
   - the website picks up its headers on the next Vercel deploy;
   - the app needs a new build for the payout confirmation.
2. **Rotate the Termii API key.** It appeared in a session log on 21 Oct. Termii can also set a spending limit or alert, which is worth turning on alongside the 300-an-hour cap.
3. **New production sign-in keys.** Generate a new `JWT_PRIVATE_KEY` and `JWKS` for production rather than copying dev's.
4. **Paystack dashboard:**
   - restrict who on your team can see the secret key;
   - turn on two-factor sign-in.

   Turning "OTP for transfers" off (needed for automatic payouts) is safe, because only staff with finance permissions can retry payouts or decide refunds, and each action is logged.
5. **Two-factor sign-in on the services themselves:** Convex, Vercel, GitHub, Expo, Resend, Termii, Google Play and Apple. Someone who gets into one of these accounts gets around every control in the code.
6. **App links instead of `farmkeke://` links** for password resets and payment returns. On Android another app can claim the same `farmkeke://` scheme and catch those links. Verified farmkeke.com links (`assetlinks.json` and `apple-app-site-association`) can't be claimed. This is item 6 in section 4 of the launch readiness list.
7. **Hide the `/dev/...` sample screens in release builds.** They only show sample data, but they shouldn't ship. This is item 3 in section 1 of the launch readiness list.
8. **Later, a full Content-Security-Policy** that also limits where scripts load from. It needs testing against the live site (Convex, Paystack, OpenStreetMap tiles), so it wasn't added blind.
9. **Later, a hold on payouts to a new account,** e.g. 24 hours after the account changes, as banks do. With the PIN now required, this is a second layer, not a gap.
10. **A professional penetration test** before you scale, to look at the live system and its hosting, which this review couldn't reach.

## 5. Verification

- `cd convex-tests && npx vitest run`: 10 files, **79 tests pass**. That's the 65 from before plus the 14 in `security.test.ts`.
- `npx tsc --noEmit -p .` (app), `npx tsc --noEmit -p convex` and `cd web && npx tsc --noEmit -p .`: no errors.
- `npx eslint next.config.ts` (website): clean.
- `npx expo export --platform web`: builds.
- **The website's headers** were checked on a local dev server with `curl -D -`. All six are on every page; the Admin Portal also has `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- **`next build`** couldn't finish here: it needs to reach the Convex deployment, which this environment blocks. The same was true before this change. The config change is typechecked and the headers were seen working on the dev server.
- **Not seen on a phone:** the payout "Confirm it's you" sheet. It's typechecked, and the backend side is covered by the tests.
- `npm audit --omit=dev`: website clean; app as described in section 3.
- **Git history** searched for Paystack, Resend, Termii, Google and GitHub keys and private keys: none found.
