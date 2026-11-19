# Sign-up code by voice call, and text delivery status

Date: 19 November 2026

**Why.** A farmer sign-up code sent to an MTN number never arrived. Termii accepted it, charged for it and showed it as "Sent", but MTN never confirmed delivery. That points at the "Farmkeke" sender ID not being cleared on MTN, which can't be fixed in code.

**What this adds:**
- a backup way to get the code (a voice call);
- a way for staff to see which texts actually arrived.

## 1. What was built, by file

### Backend

- **`convex/lib/sms.ts`:**
  - `callWithCode` uses Termii's Voice Call (`POST /api/sms/otp/call` with `api_key`, `phone_number` and `code`) to call the phone and read a code out.
  - `deliveryOf` turns Termii's report words into delivered, failed (failed, rejected, expired, DND and so on) or still on its way.
- **`convex/phoneAuth.ts`:**
  - `sendCode` takes `by: "voice"`, which issues a fresh code (it never starts with 0, because Termii takes it as a number) and calls instead of texting.
  - The new code replaces the texted one, and calls count toward the same limits (5 codes an hour per number, 300 an hour overall).
  - Every code sent, by text or call, is now logged in `smsLog` as "Sign-up code (hidden)". The code itself is never stored.
  - A failed call returns `CALL_FAILED`.
- **`convex/schema.ts`:** `smsLog` gains:
  - `kind`: code, notification or test;
  - `channel`: sms or voice;
  - `delivery`: pending, delivered or failed;
  - `deliveryStatus` (Termii's own words) and `deliveryAt`;
  - the indexes `by_providerReference`, `by_to` and `by_delivery`.
- **`convex/notifications/store.ts`, `deliver.ts`:** logged texts are tagged by kind, and texts Termii accepted start as "pending".
- **`convex/texts.ts`** (new): `recordDelivery` matches a report to its text by Termii's message ID. Failing that, it uses the newest text to that number from the last two days. It records the outcome, and a late "Sent" never undoes "Delivered".
- **`convex/http.ts`:** `POST /termii/delivery`, the delivery-report webhook.
  - It needs `?key=` to equal `TERMII_WEBHOOK_KEY`, and returns 503 until that is set.
  - With `TERMII_WEBHOOK_SECRET` set, the `X-Termii-Signature` header must be the HMAC-SHA512 of the body.
  - It accepts one report or a list.
- **`convex/admin/texts.ts`** (new):
  - `list`: paginated, newest first, filterable by delivery;
  - `summary`: counts since a given time.
  - Both are for staff with support.view or platform.manage.
- **`convex/convex.config.ts`:** declares `TERMII_WEBHOOK_KEY` and `TERMII_WEBHOOK_SECRET`.

### App

- **`app/sell/code.tsx`:** once the 30-second resend timer runs out, a "Didn't get the text?" card and a **Call me with the code** button appear.
  - Calling shows "Calling you now. Answer to hear your code.", changes the line to "We're calling 0803 *** 4567 to read it out", and restarts the timer.
  - The same screen serves Forgot PIN.
- **`src/features/sell/usePhoneAuth.ts`:** `send(phone, "voice")`, plus a message for `CALL_FAILED`.

### Admin Portal

- **Text messages** (`/admin/texts`, under Customer care):
  - **Counts for the last 24 hours:** total (and code calls), delivered with a rate, not delivered (including texts Termii refused), and waiting for the network.
  - **Filters:** All, Not delivered, Waiting and Delivered.
  - **The table** shows the time, number, what it was (calls get a phone icon), the message (codes hidden), and the delivery outcome with Termii's own words and time.
  - **If no report has ever arrived**, a note explains how to set up the webhook.

### Docs

- **`docs/LAUNCH-READINESS-2026-11-18.md`:** the Termii section now covers MTN sender ID registration and the delivery-report webhook.

## 2. Deviations from the spec and why

- **Termii's documentation couldn't be read from this session.** developers.termii.com was added to the environment's network, but the docs fetcher still couldn't resolve it, and a direct download was blocked by the session's permission checks. Built from Termii's API as I know it, and tolerant where unsure:
  - **Voice call:** a call counts as placed on any 2xx response; the reference is taken from `message_id`, `pinId` or `pin_id`.
  - **Reports:** the ID is read from `message_id`, `messageId` or `id`; the number from `receiver`, `to` or `phone_number`; and the status from `status`, `message_status` or `delivery_status`.
  - **Matching:** when the ID doesn't match, a report falls back to the newest text to that number. Termii's dashboard shows `sig_…` IDs, which may differ from the API's `message_id`.
  - **Signature:** only checked when `TERMII_WEBHOOK_SECRET` is set, so a wrong guess about Termii's signing can't block reports. The key in the URL is always required.

## 3. Bugs found and fixed

- **Sign-up codes weren't logged anywhere,** so a code that never arrived was invisible to staff. Every code is now logged, without the code.

## 4. Verification

- **`convex-tests/texts.test.ts`** (new, 7 tests):
  - report words map to the right outcome;
  - a texted code is logged without the code, waiting for its report;
  - Call me with the code: Termii's call gets a 6-digit numeric code that doesn't start with 0, that code passes, and the earlier texted one doesn't;
  - a refused call is logged as not sent and returns `CALL_FAILED`;
  - reports update the right text by ID, or else by number, and "Delivered" sticks;
  - the webhook refuses a wrong key (401), non-JSON (400), a missing status (400) and a bad signature (401), accepts a good one, and returns 503 without a key;
  - staff lists, the Not delivered filter, and the counts; signed-out callers are refused.
- `cd convex-tests && npx vitest run`: 16 files, **111 tests passed**.
- `npm run typecheck` (app and backend): no errors.
- `cd web && npx tsc --noEmit` and `npx eslint src`: no errors (one existing warning in `adminOps.ts`).
- `cd web && npx next build --experimental-build-mode compile`: compiled successfully.
- **Screenshots:**
  - the code screen in the app's web build, after the 30-second timer, shows the card and the button;
  - the Text messages page, in the real portal frame with sample data through a temporary preview page (deleted, not committed).
- **Generated files:** `convex/_generated/api.d.ts` and `server.d.ts` updated by hand (codegen needs a deployment). The website's function specs and `web/src/convex/api.ts` and `admin.ts` were regenerated with the repo's scripts.

## 5. Open questions and guesses

- **Does Termii's voice call work on your account?** Some accounts need voice turned on by Termii. If "Call me with the code" shows "We couldn't call that number", the Termii error is on the Text messages page; ask Termii to enable voice.
- **Termii's webhook settings:** where the delivery-report URL goes in the Termii dashboard, and whether reports are signed, couldn't be checked against the docs. Send one test text after setting it up, and check that it changes from "Waiting" on the Text messages page.
- **Call cost:** a voice call costs more than a text. Calls only happen when the farmer taps the button, after the timer, and count toward the same hourly limits.

## 6. What's next

1. Deploy Convex (`npx convex deploy`, and `npx convex dev --once` for dev), then rebuild the app.
2. On Convex: set `TERMII_WEBHOOK_KEY` to a long random string.
3. In the Termii dashboard, set the delivery report webhook to `https://<deployment>.convex.site/termii/delivery?key=<that string>`.
4. Ask Termii to register "Farmkeke" on MTN, and for a shared pre-cleared sender ID to use meanwhile.
