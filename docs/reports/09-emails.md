# Phase 9 - Transactional emails: shopper, account and farm

Date: 19 Oct 2026
Plan: the phase 9 email brief; Screen Inventory section 5 (notification events); `farmkeke-docs/PRD.md`; website designs W-42d, W-44, W-48, W-49, W-51 to W-58; app screens F-09a to F-09d.

Result:

- Every user-facing event now has an email: 21 shopper emails, 8 account emails and 23 farm emails (52 in all, counting variants).
- All 279 live functions and 5 live HTTP routes are still defined, with the same names, arguments and return shapes. New functions and routes were only added.
- **Nothing was deployed.** No `convex dev`, `convex deploy`, `convex env set`, or `convex run` on a mutation or action. `npx convex codegen` was run. It prints "Uploading functions to Convex..." but, per its own help text, it doesn't change the code running on the deployment.

## 1. What was built, by file

### Schema and config

- `convex/schema.ts`: new table `notificationThrottles` (`key`, `lastAt`; indexes `by_key` and `by_lastAt`). It holds the once-per-window gates for message emails and low-stock alerts. No existing table changed.
- `convex/convex.config.ts`: new `EMAIL_ASSETS_URL: v.optional(v.string())`.

### Templates (`convex/lib/emails.ts`)

- Links now use env `WEBSITE_URL` (default `https://farmkeke.com`). The help line and the logo link use it too.
- The logo comes from `wordmarkUrl()`. It uses `${EMAIL_ASSETS_URL}/wordmark.png` when that is set. Otherwise it uses `${CONVEX_SITE_URL}/email/wordmark.png`. The old `https://farmkeke.com/brand/wordmark.png` is only a last fallback, for when neither is set (tests and previews).
- New links: `chat`, `notifications`, `signIn`, `forgotPassword`, `contact`, `openApp`.
- A small composer, `compose()`, builds every new email from the same building blocks as the original 12. Each email gets:
  - an H1 heading
  - blocks that each have a plain-text twin
  - one lime button
  - the help line
  - a footer saying why it was sent
- Every string from users or the database is escaped (`esc`). There is a new quote block for messages and a "In the Farmkeke app: A → B → C" block for farm emails.
- New shopper templates:
  - `orderPreparingEmail`
  - `orderCancelledEmail`
  - `pickupReminderEmail`
  - `pickupWindowEndedEmail`
  - `confirmReminderEmail`
  - `reviewReminderEmail`
  - `chatMessageEmail`
  - `disputeMessageEmail`
  - `supportReplyEmail`
- New account templates:
  - `passwordChangedEmail`
  - `emailChangedNoticeEmail` (to the old address)
  - `emailChangedConfirmEmail` (to the new address)
  - `accountDeletionEmail` (waiting for N orders, or deleted)
  - `guestOrdersAddedEmail`
- New farm templates:
  - applications: `applicationReceivedEmail`, `applicationApprovedEmail`, `applicationRejectedEmail`, `applicationMoreInfoEmail`
  - orders: `farmNewOrderEmail`, `farmDeadlineEmail`, `farmDeadlineExtendedEmail`, `farmOrderEndedEmail` (cancelled or expired), `farmRiderAssignedEmail`
  - problem reports: `farmProblemReportedEmail`, `farmReplyReminderEmail` (reminder or overdue), `farmProblemDecisionEmail`
  - messages: `farmMessageEmail` (chat, problem report or support)
  - money: `farmPaymentReleasedEmail`, `farmPayoutSentEmail`, `farmPayoutFailedEmail`, `farmPayoutAccountChangedEmail`
  - listings: `farmListingEmail` (approved, sent back or taken down), `farmLowStockEmail`
  - reviews: `farmReviewEmail`
- Farm emails' button is "Open the Farmkeke app". It goes to `${CONVEX_SITE_URL}/open-app`, or to the website's `/get-the-app` when that isn't known. The body says where to look in the app, for example "Switch to farmer mode > Orders > Order FK-10234".

### Logo and app hand-off (`convex/http.ts`, `convex/lib/wordmarkPng.ts`)

- `convex/lib/wordmarkPng.ts` is `web/public/brand/wordmark.png` (705x135, 33,876 bytes) as base64, with `wordmarkPng()` to decode it.
- New route `GET /email/wordmark.png` serves the PNG. Headers:
  - `Content-Type: image/png`
  - `Cache-Control: public, max-age=31536000, immutable`
- New route `GET /open-app` is a small page in the same style as `/reset-password`. It opens `farmkeke://`, and has a "Get the app" link to the website.
- Every existing route is unchanged.

### Delivery (`convex/notifications/store.ts`, `convex/notifications/deliver.ts`, `convex/lib/notify.ts`)

- `plan` now calls `emailFor`:
  - farm notifications go to the new `farmEmail`
  - shop `support_reply` goes to the new `supportEmail` (which works without an order)
  - everything else goes to `orderEmail`, as before
- `plan` also returns `emailThrottleKey` for message kinds (`chat_message`, `dispute_message`, `support_reply`). This is an added field; the existing fields are unchanged.
- `orderEmail` has new cases:
  - `order_preparing`, `order_cancelled`, `pickup_reminder`, `pickup_overdue`
  - `confirm_reminder`, `review_reminder`
  - `chat_message`, `dispute_message`
  - `order_packed`, which is push only and returns no email on purpose
- `farmEmail` covers every farm kind:
  - applications: `application_received`, `application_more_info`, `application_approved`, `application_rejected`
  - orders: `order_new`, `order_deadline`, `deadline_extended`, `order_expired`, `order_cancelled`, `rider_assigned`
  - problem reports: `dispute_opened`, `dispute_reply_reminder`, `dispute_reply_overdue`, `dispute_resolved`, `dispute_message`
  - money: `payment_released`, `payout_sent`, `payout_failed`, `payout_account_changed`
  - listings: `listing_approved`, `listing_sent_back`, `listing_unpublished`, `low_stock`
  - messages and reviews: `chat_message`, `support_reply`, `review_received`
- New `claimEmailSlot` (internal mutation) and `lib/notify.claimSlot`: a gate that lets one email through per key in each window. `deliver.send` claims a slot before sending a message email. The window is 30 minutes per person, side, kind and thread (the order, or the ticket). It runs in a mutation, so two deliveries can't both win.
- New `pruneThrottles` (internal mutation, daily cron in `crons.ts`) deletes throttle rows older than 2 days.
- New `deliver.accountEmail` (internal action) sends the security emails. They are always sent and ignore preferences. Its argument is a validated union:
  - `password_changed`
  - `email_changed`
  - `deletion_waiting`
  - `deletion_done`
  - `guest_orders_added`
- Email still uses the quiet-send pattern (`emailQuietly`), and every caller schedules it, so an email can never fail an order, payment or account change.

### Alert groups (`convex/lib/alerts.ts`)

- Shop "Order updates" now also lists `order_preparing`, `order_packed` and `pickup_reminder`. Shop defaults are unchanged.
- Farm email defaults:
  - **On:** Orders, Problem reports, Payments (still locked) and Listings
  - **Off:** Messages and Reviews
- Farm "Problem reports" adds `dispute_reply_overdue`. "Listings" adds `listing_unpublished`.
- New farm alert `application` (locked, hidden). Applicants have no farm and no F-75 settings yet, so the decision emails are always on. A new `hidden` flag keeps this alert out of `preferenceRows` and `findAlert`, so it isn't listed in W-48 / M-87 / F-75 and can't be changed. `alertOfKind` still finds it.

### Flows that now notify (and so email)

- `orders/farmer.ts`:
  - `startPreparing` sends the shopper `order_preparing` (email: "is preparing order").
  - `markPacked` sends `order_packed` (push or SMS only).
- `lib/orders.ts`:
  - `pickupDeadline` also schedules `orders/system.pickupReminder` a day before `collectBy`.
  - `markCheckoutPaid` calls the new `alertLowStock`. When an ordered unit falls to 3 or fewer, or below its minimum order, the farm gets `low_stock`. This happens at most once a day per listing unit.
- `orders/system.ts`: new `pickupReminder` (internal mutation), which sends `pickup_reminder`.
- `admin/orders.cancel`: already sent the shopper `order_cancelled`. That kind now has an email, with the full refund and delivery fee line.
- `disputes.replyOverdue`: now also sends the farm `dispute_reply_overdue`. Before, it only alerted staff.
- `payments/payouts.ts` `markPayout`: a failed payout now sends the farm `payout_failed`.
- `admin/listings.ts` `moderate`: approve, send back and unpublish send the farm `listing_approved`, `listing_sent_back` or `listing_unpublished`.
- `farmerApplications.submit`: sends `application_received`.
- `admin/farmerRequests.approve | requestMoreInfo | reject`: send `application_approved`, `application_more_info` or `application_rejected`.
- `account.changePassword`: schedules the password-changed email.
- `account.changeEmail`: schedules emails to both addresses, but only when the change succeeded.
- `lib/passwordProvider.ts`:
  - After a successful `reset-verification`, it schedules the password-changed email ("was reset with an email link").
  - The reset email itself now uses the shared design from `lib/emails.ts`, which has the same signature. `lib/email.ts`'s old function is kept.
- `accountsInternal.deleteUserData`: sends "waiting for N orders" the first time a deletion waits, and "deleted" when it completes. `finishWaitingDeletions` sends "deleted" too. The address is read before the user row is erased.
- `orders/consumer.claimGuestOrders`: sends "guest orders added", with the order numbers.
- Welcome: unchanged. It already fires from the shared password sign-up (app and website), and `deliver.welcome` skips anonymous users. A new test checks both.

### Previews (`scripts/render-email-previews.mjs`, new)

- The script imports `convex/lib/emails.ts` directly, using Node 24 type stripping.
- A `module.registerHooks` hook replaces `../_generated/server` with `export const env = process.env`, and resolves extensionless imports to `.ts` files.
- It writes 52 emails to `farmkeke-docs/email-previews/<name>.html`, plus an `index.html` grouped as Shopper (21), Account (8) and Farmer (23). The index shows each subject, and each email's plain-text part can be expanded.
- In the previews, the logo loads from `web/public/brand`.

### Tests (`convex-tests/emails.test.ts`, new; 7 tests)

1. Delivery order, step by step, with the exact subjects. The shopper gets placed, accepted, preparing, on its way, delivered, the confirm reminder, thanks and the review reminder. No email for packed. The farm gets new order, rider, payment released and payout sent. The test also checks the plain-text link, that there is exactly one button, and the footer reason.
2. Pickup by a guest with an email: ready, the reminder (with the code), then window ended. Staff cancel sends the cancel email with the refund line, then the refund email. A guest without an email gets nothing.
3. Message throttling:
   - two chat emails within 20 minutes send one email
   - a support reply (no order) has its own window
   - after 30 minutes the chat can email again
   - with message emails turned off, nothing is sent
   - user text is HTML-escaped
4. Account emails:
   - password changed, and password reset
   - email changed, to the old and the new address, even with order updates turned off
   - deletion "waiting for 1 order", then "deleted"
   - guest orders added
   - welcome: accounts only, never anonymous users
5. Farm application approved, through the real `admin/farmerRequests.approve`. The hidden alert isn't listed.
6. Farm defaults: new order and deadline emails are on; chat and review emails are off; a farmer can turn message emails on.
7. `GET /email/wordmark.png` returns `image/png` with the PNG signature and 33,876 bytes, and `/open-app` works. Emails use the `CONVEX_SITE_URL` route, `EMAIL_ASSETS_URL` overrides it, and `WEBSITE_URL` (trailing slash trimmed) is used for links.

## 2. Deviations from the spec and why

- **Packed has no email.** `markPacked` sends a push or SMS. An email for it would arrive minutes after "being prepared", and two emails for one step is noise. `orderEmail` returns null for `order_packed` on purpose.
- **Farm email buttons go to `/open-app`, not deep links.** Mail clients strip `farmkeke://` links. Also, the app doesn't route the notification hrefs (`/farm-order/...`) yet, and opening an unknown path would show its "not found" screen. So the page opens the app at its start, and the email body says where to go.
- **The application alert is hidden and locked.** The brief says the application decision should be on by default. An applicant has no farm settings screen yet, so a switch would be unreachable. Listing it in F-75 would also confuse farmers who were approved long ago.
- **The throttle is a small table, not `@convex-dev/rate-limiter`.** The rate limiter is installed but not mounted in `convex.config.ts`. Mounting a component changes what a deploy does. The table gate runs in one mutation, so it can't race.
- **`dispute_message` emails farms by default.** It belongs to the farm's "Problem reports" alert, which is now on. It goes through the same 30-minute gate. The brief turns farm "messages" off, which covers chat and support replies.
- **The cancel email doesn't show the staff reason to the shopper.** `cancelReason` is the audit reason staff type for each other. The shopper email says "Farmkeke had to cancel". The farm email does show the reason, as its notification already did.
- **The shopper support reply has no "open the thread" button.** The website has no support thread page, and the shopping side of the app has none either. The email includes the reply text and says "Reply to this email to write back". The button goes to the order when there is one, otherwise to `/contact`.

## 3. Bugs found and fixed

- **Typecheck:** `new Response(wordmarkPng())` failed under TypeScript 6. `Uint8Array<ArrayBufferLike>` isn't a `BodyInit`. `wordmarkPng()` now returns `Uint8Array<ArrayBuffer>`, backed by a fresh `ArrayBuffer`.
- **The live reset email used an older design.** It came from `lib/email.ts`, with a text logo and different colours. The password provider now uses the matching template from `lib/emails.ts`, so every email has the same header, footer and logo.
- **Failed payouts were silent to the farm.** `markPayout("failed")` only updated the ledger. It now sends `payout_failed`.
- **The farm was never told when its reply time ran out.** `disputes.replyOverdue` only alerted staff. The farm now gets `dispute_reply_overdue`.
- **Things only seen while running:**
  - In `convex-test`, the deletion email went to the old address. The seeded test user had no password account, so `replaceEmail` returned `NO_ACCOUNT`. This was a test-setup problem, not a code bug. The test now creates the account and checks for `"OK"`.
  - The footer apostrophe is HTML-escaped (`You&#39;re`), so footer checks run against the text part.
  - Node 24 prints `MODULE_TYPELESS_PACKAGE_JSON` when it imports `emails.ts`, because the root `package.json` has no `"type"`. The preview script silences that one warning; the root `package.json` was left alone, since Expo depends on it.

## 4. Verification

All commands were run from the repo root unless noted.

| Command | Result |
| --- | --- |
| `npx convex codegen` | `_generated/api.d.ts` gained `lib/wordmarkPng`; `_generated/server.d.ts` gained `EMAIL_ASSETS_URL`. Typecheck passed. |
| `npx tsc --noEmit -p convex` | exit 0, no errors |
| `npx tsc --noEmit` | exit 0, no errors |
| `node scripts/check-coverage.mjs` | `Functions: 279/279 live functions defined locally`, `HTTP routes: 5/5`. Extras: `GET /email/wordmark.png`, `GET /open-app`, `notifications/deliver.accountEmail`, `notifications/store.claimEmailSlot`, `notifications/store.pruneThrottles`, `orders/system.pickupReminder` |
| `cd convex-tests && npm test` | `82 modules`, `Test Files 4 passed (4)`, `Tests 23 passed (23)` (16 existing and 7 new) |
| `node scripts/render-email-previews.mjs` | `52 emails written to farmkeke-docs\email-previews` |

The plain-text parts of the preparing, application received, new order and payout sent emails were also read through by hand from the index.

## 5. Open questions and decisions that had to be guessed

- **Replies to emails.** Every email says "Need help? Reply to this email". `sendEmail` sets no `reply_to`, so replies go to `AUTH_EMAIL_FROM`. If that is a no-reply address, either add a monitored `reply_to` such as support@farmkeke.com, or change the help line. This line predates this phase.
- **Low-stock threshold.** A unit counts as low at 3 or fewer, or below its minimum order. It is checked when an order is paid, not when the farmer edits stock. This is `LOW_STOCK_AT` in `lib/orders.ts`.
- **Pickup reminder timing.** It goes 24 hours before `collectBy`, and only when the hold is longer than a day. Its subject shows the collect-by date and time.
- **What happens after a pickup window ends.** The PRD doesn't say. The email says:
  1. Contact support.
  2. We agree on a new time to collect, or what to do with the food.
  3. Your money stays held.

  This matches the existing notification ("Contact Farmkeke support so we can sort it out").
- **Farm in-app paths are written from the current app tabs** (Dashboard, Orders, Listings, Earnings, Farm) and the Account "Selling" card. Some farm screens, such as Payout account, Reviews and Notifications, are still being built. If their names change, update the `inApp([...])` paths in `lib/emails.ts`.
- **The guest-orders email is treated as a security email.** It is always sent and ignores preferences, because it confirms that orders were linked to an account.
- **The emails don't link to `/account/notifications`.** The footer says "You can turn these emails off in Account, Notifications", matching W-48, but has no link. Each email keeps a single button.

## 6. What's next

- Owner:
  1. Before deploying, follow the Convex safety step: diff the function spec against the repo (`node scripts/check-coverage.mjs` shows 279/279).
  2. Deploy. The deploy adds the `notificationThrottles` table and the daily `prune notification throttles` cron.
  3. Optional: set `WEBSITE_URL` (it is already used for Paystack returns).
  4. Optional: set `EMAIL_ASSETS_URL` to a folder with `wordmark.png` once one is live. Until then, emails use `<deployment>.convex.site/email/wordmark.png`.
  5. Make sure `AUTH_RESEND_KEY` is set, and `AUTH_EMAIL_FROM` is on a domain verified in Resend.
- App: route notification hrefs (`/farm-order/<id>`, `/listing/<id>`, `/sell/status`) so push taps, and later `/open-app?to=`, can open the right screen.
- Website: a support thread page would let the support-reply email link to the conversation itself.
