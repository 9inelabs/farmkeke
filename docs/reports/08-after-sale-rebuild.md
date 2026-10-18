# Phase 3b - After-sale rebuild: disputes, chat, reviews, notifications, support, admin tools

Date: 18 Oct 2026
Plan: rebuild brief for Phase 3b; `docs/build-plan.md` (Phases 8 and 9); Screen Inventory sections 4 to 6; `farmkeke-docs/PRD.md` order rules; website designs W-43 to W-58 and W-86.

Result:

- Every live function in scope is defined again, with the live file paths, names and argument validators.
- Coverage: 259 of 266 live functions, and 5 of 5 HTTP routes. The 7 missing functions are all in `storefront.js`, which is Phase 3c.
- **Nothing was deployed.** The live deployment still shows 271 functions.

## 1. What was built, by file

### Schema (`convex/schema.ts`)

Only optional fields and indexes were added. No existing field changed.

- `accountDeletions`: new index `by_userId`.
- `orders`: new indexes `by_status` and `by_riderId`.
- `notifications`: new field `smsTo`, the phone to text if the preferences allow it.
- `disputes`: new field `lastMessageAt`.
- `conversations`: new fields `consumerReadAt` and `farmerReadAt`, for the "Read" marks on W-58.
- `supportTickets`:
  - new fields `lastFrom` and `preview`
  - new index `by_lastMessageAt`

### Shared libraries

- `convex/lib/emails.ts`: the 12 email templates, moved from `farmkeke-docs/pending-backend/emails/templates.ts`. The design and the wording are unchanged, and they use the wordmark `https://farmkeke.com/brand/wordmark.png`. Fixes and additions:
  - The "Report a problem" link in the delivered email now opens `/orders/<id>/problem` (W-53). Before, it opened the dispute page.
  - The order confirmation now throws a clear error when it is given no orders.
  - New label helpers: `clockLabel`, `windowLabel` ("Sun 18 Oct, 9am – 12pm") and `hoursLines`.
- `convex/lib/alerts.ts`: the alert types for the W-48, M-88 and F-75 preferences screens.
  - Each notification kind belongs to one alert type.
  - Each alert type has push, SMS and email switches, with defaults taken from W-48.
  - "Payments and refunds" is locked on, on both sides.
  - `channelOn` resolves a preference in this order:
    1. a row for this alert and this channel
    2. a row for the whole alert
    3. the default
- `convex/lib/disputes.ts`: the case view and the list row.
  - Staff messages with an audience are shown only to that side.
- `convex/lib/notify.ts`:
  - `notify()` now stores `smsTo` and schedules `notifications/deliver.send`. This replaces the 3a stub, which wrote an `smsLog` row straight away.
  - `notifyConsumer` always passes the contact phone. `plan` then decides whether a text is sent.
  - New: `markReadBatch`.
- `convex/lib/orders.ts`: `releaseOrder` now also tells the shopper "Thanks for confirming" (kind `order_completed`, which triggers the payment-released email).
  - It does this only when the shopper confirmed the order. Staff releases and dispute splits don't send it.

### Notifications

- `convex/notifications.ts`:
  - `list` (paginated), `unreadCount` (capped at 99), `markRead` and `markAllRead`
  - `registerPushToken`: checks the Expo token format, and moves a token to whoever is now signed in on that phone
  - `removePushToken`
  - `preferences({ side })` and `setPreference({ alert, channel?, on, side })`
    - With no channel, the switch applies to the whole alert.
    - A locked alert gives `ALERT_LOCKED`; an unknown one gives `UNKNOWN_ALERT`.
- `convex/notifications/store.ts`:
  - `plan`: applies the preferences and builds what to send.
    - **Push:** every push token, if push is on for that alert.
    - **SMS:** farms always get it. Guests always get it. A signed-in shopper gets it only when no push went out.
    - **Email:** only for shopping-side order emails.
  - `dropTokens` and `markAllReadBatch`.
  - `create` and `logSms` are kept from 3a.
- `convex/notifications/deliver.ts`:
  - `send` delivers one notification:
    - **Push:** Expo push API, with `fetch`, 100 messages per request.
    - **SMS:** an `smsLog` row with status "recorded". Nothing is texted.
    - **Email:** Resend, through `sendEmail`.
  - `retryPush`: retries after HTTP 429 or 5xx, with backoff, up to 4 tries.
  - `receipts`: reads Expo's receipts 15 minutes later and drops tokens that are `DeviceNotRegistered`.
  - New internal action `welcome`, for the welcome email.
  - Email never throws. With no `AUTH_RESEND_KEY`, it logs when `AUTH_DEV_LOG_EMAILS` is "true" and otherwise skips quietly.
- **Emails wired:**

  | Email | Trigger (notification kind) | Notes |
  | --- | --- | --- |
  | Order confirmation | `order_placed` | One email per checkout, sent with its first order's notification |
  | Order accepted | `order_accepted` | |
  | Out for delivery | `out_for_delivery` | |
  | Ready for pickup | `ready_for_pickup` | Includes the pickup code |
  | Delivered / collected | `order_delivered`, `order_collected` | Asks the shopper to check and confirm |
  | Farm didn't accept | `order_declined`, `order_expired` | Full refund |
  | Problem report received | `dispute_opened` | |
  | Problem decision | `dispute_resolved` | |
  | Refund sent | `refund_issued` | |
  | Payment released | `order_completed` | Thanks, and asks for a review |
  | Welcome | Sign-up | |

  - The recipient is the account's email. A guest gets an email only if they gave one at checkout.
- `convex/lib/passwordProvider.ts`: sign-up now also schedules `notifications/deliver.welcome`. Nothing else in the provider changed.

### Chat (`convex/chat.ts`)

- One conversation per order, between the "shop" side and the "farm" side.
- `partyOf` allows only the order's owner or that farm's owner. The optional `side` argument must match the caller.
- The functions:
  - `thread`, `messages` (paginated) and `send`
    - `send` takes up to 4 photos, each checked with `validateImageUpload`.
    - `send` is throttled to 20 messages a minute (`messageThrottles`), with `RATE_LIMITED` after that.
  - `markRead`, `unread({ side })`, `listMine`, `listForFarm` and `generateUploadUrl`
  - `nudge` (internal):
    - It sends one alert per burst of messages, a minute after the first unread one, and at most once every 10 minutes.
    - It doesn't send at all if the message was already read.
    - Shoppers get push or SMS; farmers get push only.
- Chat is closed for unpaid, declined, expired and cancelled orders.

### Disputes

- `convex/disputes.ts`: the shopper and farm side of a problem report.
  - `open`:
    - **Who:** only the device or identity that placed the order.
    - **When:** only on a delivered or collected order, and before it is confirmed. It gives `ALREADY_REPORTED` if there is already a report, and `ALREADY_CONFIRMED` after confirmation.
    - **What:** a reason, the affected item indexes (all items for `not_received`), a note and up to 6 photos.
    - **Effects:**
      - creates case number `DSP-1001` onwards
      - sets the farm's reply deadline 12 hours ahead and the decision deadline 24 hours ahead (from the settings)
      - moves the order to `disputed`; the money stays held, so the order can't be confirmed or released
      - alerts the farm by push and SMS, and sends the shopper the "report received" email
  - `respond`: the farm replies once, and the case moves to `farmer_responded`.
  - `sendMessage({ as })` and `markRead({ as })`: messages from the shopper or the farm; both of them and staff see them.
  - `get`, `forOrder`, `forFarmOrder` and `mine`.
- `convex/admin/disputes.ts`: the A-70 to A-72 staff tools.
  - `list`, `get` (with the order, contacts, notes and assignee), `assign`, `addNote`, `markRead`, and `sendMessage` to one party.
  - `resolve` (support or finance staff, audited with the reason):

    | Outcome | Refund | Release to farm | Order ends as | Escrow |
    | --- | --- | --- | --- | --- |
    | `released` | None | Product total | `completed` | `released` |
    | `refunded` | Full, delivery fee included (`refundOrder` full) | None | `cancelled` | `refunded` |
    | `split` | `refundKobo`, part refund, never the delivery fee | `releaseKobo` (defaults to the rest), `releaseOrder` split | `completed` | `split` |

    - For a split, `refundKobo` plus `releaseKobo` must equal the product total, or it fails with `AMOUNTS_DONT_ADD_UP`.
    - Both parties are notified, and the shopper gets the decision email.

### Reviews (`convex/reviews.ts`)

- `forOrder`.
- `submit`:
  - only for the owner's completed order, once per order
  - 1 to 5 whole stars, up to 8 tags (duplicates removed), and a comment of up to 1,000 characters
  - The reviewer is shown as "Adaeze N.".
  - It sets `orders.reviewedAt`, updates `reviewStats`, and sends the farm a push.
- `summary`: `{ average, count, stars[5] }`, matching the website's sample.
- `listPublic` (paginated; hidden reviews are left out), `mySummary` and `listMine({ stars? })`.
- `remind` is kept from 3a.

### Favourites, support and earnings

- `convex/favorites.ts`: for signed-in accounts only.
  - `toggle` returns `{ saved }`, and allows up to 500 saved items.
  - `isSaved` takes a string id. It returns false for guests and for ids that aren't listings.
  - `list` returns the shop's `ListingSummary` cards, plus `available`, `unavailableReason` and `savedAt`.
- `convex/support.ts`: shopper and farmer support tickets.
  - `open` works for guests (their anonymous identity) and accounts.
    - It can link one of the caller's orders.
    - It creates ticket number `SUP-1001` onwards.
    - It is limited to 5 tickets an hour.
  - `send` reopens a resolved ticket. It is limited to 30 messages an hour.
  - Also: `markRead`, `mine`, `get`, `messages` (paginated), and `orderChoices` (the caller's 20 most recent paid orders).
- `convex/admin/support.ts`: `list`, `get`, `messages`, `reply` (notifies the person), `assign`, `markRead`, and `resolve` (audited).
- `convex/earnings.ts`:
  - `summary`: held (the farm's share, after commission), released, paid out, pending and failed payouts, commission, the last payout and the payout account.
  - `transactions`: the ledger's release, commission and payout rows, paginated.

### Admin tools

All of these are for staff only, and each change writes an `auditLog` row with its reason.

- `convex/admin/riders.ts`:
  - `list({ dayStart })`: active jobs and today's deliveries for each rider.
  - `create`, `update` and `setActive`.
- `convex/admin/dispatch.ts`:
  - `board({ now })`: columns, late flags, and the riders' loads.
  - `assignRider`: alerts the farm.
  - `recordStep`:

    | Step | Order moves to | Notes |
    | --- | --- | --- |
    | `collected_from_farm` | `out_for_delivery` or `with_rider` | Does nothing if the farm already confirmed the handover |
    | `dropped_at_pickup_point` | `at_pickup_point` | Starts `pickupDeadline`; sends the code to the shopper |
    | `delivered` | `delivered` | |
    | `collected_by_consumer` | `collected` | Needs the pickup code; a wrong one gives `WRONG_PICKUP_CODE` |

- `convex/admin/orders.ts`:
  - `list` (filters: status, fulfilment, farm and date range), `get` (with the timeline and actors) and `addNote`.
  - `cancel`: a full refund through `endWithFullRefund`.
    - The stock goes back if the order hadn't left the farm.
    - An unpaid order is cancelled without a refund.
  - `extendDeadline`: 1 to 72 hours. `expireOne` then reschedules itself.
  - `reassignRider`, and `stuck({ now })`.
- `convex/admin/payments.ts`:
  - `payouts`, `payout`, `refunds`, `refundsWaiting` and `reconciliation`.
  - `resolveMismatch`: refund or dismiss the payment.
  - `resolveUnmatched`.
  - `retryPayout`: gets a fresh reference through the new shared `freshReference` in `payments/payouts.ts`.
  - `retryRefund`: only for failed refunds.
  - `staffCheck` (internal) and `checkBankList`, which compares `lib/banks.ts` with Paystack's live bank list.
- `convex/admin/chat.ts`: `get` and `messages`, read-only.

### Account deletion fix

- `convex/accountsInternal.ts`:
  - `deleteUserData` now checks first for orders in progress: any paid order that hasn't ended, or money still held.
    - If there are any, it records `accountDeletions` "waiting_for_orders" (once per user), keeps the account working, and returns.
    - Otherwise it deletes as before. It now also deletes the user's favourites, push tokens, saved cards and notification preferences (W-49: "saved items and preferences are erased").
  - New internal `finishWaitingDeletions`, run every hour from `convex/crons.ts`, finishes the deletion once the orders have ended.
  - Order records are kept for accounting.
- `account.deleteAccount` is unchanged and still returns nothing.

## 2. Deviations from the spec and why

- **Extra internal functions:** `notifications/deliver.welcome` and `accountsInternal.finishWaitingDeletions`. The coverage checker lists them as "extra".
- **Disputes go through the order status:** opening a report moves the order to `disputed`, which the 3a state machine already supports. Confirming and releasing are blocked by that status.
- **Account consumers can now get SMS:** a signed-in shopper with no push token (or with push off) gets the SMS record. Screen Inventory section 5 says shopper alerts are "Push or SMS". In 3a, only guests got it.
- **Mismatch refunds have no ledger row:** a refund for a payment mismatch is attached to the checkout's first order, so a `refunds` row exists. It gets no ledger row, because that money never entered the order's escrow.
- **Unread markers:** unread is a timestamp comparison, not a per-message read flag.
  - Chat keeps counts and read times.
  - Disputes and tickets compare the last message time with each side's read time.

## 3. Bugs found and fixed

- **Email link:** the delivered email linked "Report a problem" to the dispute page instead of W-53. Fixed in the template.
- **Timing in tests:** with fake timers, a staff reply in the same millisecond as the ticket opening wasn't shown as unread, because the check is `lastMessageAt > userReadAt`. In real use time always moves on; the test now advances 1 second. The dispute deadline check now compares to the second, because `_creationTime` has a fractional part.
- **Bundle time:** nothing broke at bundle time or at runtime beyond the timing issue above. Both typechecks were clean on the first full run.

## 4. Verification

All commands were run from the repo root unless noted.

- `npx convex codegen --typecheck disable`: regenerated `_generated/`. This only writes local files.
- `npx tsc --noEmit -p convex`: no errors.
- `npx tsc --noEmit` (the app): no errors.
- `node scripts/check-coverage.mjs`: 259/266 functions and 5/5 HTTP routes.

  | File | Covered |
  | --- | --- |
  | chat | 9/9 |
  | disputes | 8/8 |
  | reviews | 7/7 |
  | favorites | 3/3 |
  | notifications | 8/8 |
  | notifications/store | 4/4 (+1 extra from 3a) |
  | notifications/deliver | 3/3 (+1 extra) |
  | support | 7/7 |
  | earnings | 2/2 |
  | admin/chat | 2/2 |
  | admin/dispatch | 3/3 |
  | admin/disputes | 7/7 |
  | admin/orders | 7/7 |
  | admin/payments | 11/11 |
  | admin/riders | 4/4 |
  | admin/support | 7/7 |
  | accountsInternal | 7/7 (+1 extra) |
  | Every 3a file | Still ok |
  | storefront | 1/8 (Phase 3c) |

- `npx convex function-spec` (read-only): **271 functions**, the same as before. Nothing was pushed.
- **Tests:** `convex-test` and vitest, run from the 3a scratchpad harness against the repo's `convex/`. The repo's `package.json` is unchanged.
  - Command: `npx vitest run`, in the scratchpad `flowtest/`.
  - Result: **10 of 10 pass**, which is the 4 tests from 3a (still passing with real notification delivery) plus 6 new ones.
  - I broke one expectation on purpose to confirm the assertions run.
  1. Chat permissions:
     - The shopper and the farm can chat. Another farm, another shopper, and a farm posing as the shop side all get null or `NOT_FOUND`.
     - Unread counts and `markRead` work, and staff can read the chat.
     - The 21st message within a minute gets `RATE_LIMITED`.
     - Each burst sends the farm one alert.
  2. Dispute:
     - It is refused before delivery. Dispatch then delivers the order (this also tests riders and dispatch).
     - Another identity is refused. A second report gets `ALREADY_REPORTED`, and confirm is blocked.
     - The farm has 12 hours to reply. The farm responds once.
     - A staff note sent to the farm is hidden from the shopper.
     - Amounts that don't add up are rejected, and an empty reason is rejected.
     - A split refunds 450,000 for one basket of tomatoes. The delivery fee (100,000) isn't refunded.
     - The ledger shows: release 427,500, commission 22,500, delivery fee 100,000. The payout of 427,500 is sent, and the escrow is `split`.
     - The decision is audited.
  3. Reviews:
     - Reviewing is refused before completion and for a wrong rating. The wrong identity gets `NOT_FOUND`, and a second review gets `ALREADY_REVIEWED`.
     - Tags are de-duplicated and the comment is trimmed. The reviewer shows as "Ada O.".
     - After two reviews, the summary is `{ average: 3.5, count: 2, stars: [0,1,0,0,1] }`, and the star filter works.
  4. Notification preferences:
     - **Defaults:** a push goes out and the SMS is skipped. The email goes to the account and contains the wordmark.
     - **Push off for order updates:** the SMS is recorded instead.
     - **The whole alert off:** nothing is sent.
     - Payments alerts are locked. Guests always get SMS, and get no email without one.
     - **End to end, with `fetch` mocked:**
       - The Expo push is sent, and a `DeviceNotRegistered` token is dropped.
       - Resend receives "Order placed: FK-10001".
       - Mark all read works.
  5. Support as a guest:
     - Signed-out users are refused. Guests can't open a farm-side ticket.
     - A guest opens SUP-1001, and other people can't read it or write to it.
     - The staff reply shows as unread, then as read after `markRead`.
     - Resolving needs a reason. Writing again reopens the ticket.
     - `orderChoices` lists the guest's order, and nobody can link someone else's order.
  6. Account deletion:
     - Favourites work: guests are refused, and an invalid id gives false.
     - Deleting with an order in progress gives "waiting_for_orders" (one row, even when called twice), and the user is kept.
     - Once the order is delivered and confirmed, `finishWaitingDeletions` deletes the user and their favourites. The row is marked completed, and the order is kept.

## 5. Open questions and decisions that had to be guessed

- **Deep links in notifications are guessed.** Change them in the code if the app's routes differ:
  - `/order/<id>/chat` and `/farm-order/<id>/chat`
  - `/farm-dispute/<id>`
  - `/support/<id>`
  - `/farm/reviews`
- **Who can do what (guessed):**
  - Resolving a dispute: support or finance.
  - Dispatch, cancel, deadline extension and riders: operations.
  - Money retries and reconciliation: finance.
  - Super admins can do everything.
- **Deletion while orders are open:** `deleteAccount` returns nothing, as before, so the app can't tell that the deletion is waiting. W-49 says "you can delete your account once it's completed". The website could check for orders in progress first, or the return shape could change in a later phase.
- **Staff alerts:** "Problem reported → admin alert" (A-12) isn't built. There is no staff notifications table; the open list in `admin/disputes.list` is the queue.
- **No reply-deadline reminder:** nothing reminds the farm about its 12-hour reply deadline. The deadline is shown only.
- **Push setup:**
  - Push goes to Expo without an access token. If "enhanced security" is turned on in Expo, an `EXPO_ACCESS_TOKEN` will be needed.
  - Pushes use the Android channel id "default".
- **Email amount:** the payment-released email shows the product total paid ("₦X has been paid to the farm"), not the farm's share after commission.
- **Farm order picker:** `support.orderChoices` for farms reads up to 300 of the farm's orders and sorts them in memory. This is fine at launch volumes.

## 6. What's next

- **Phase 3c:** rebuild the 7 missing `storefront.js` functions (the website already calls them).
- **Phase 3d:**
  1. Run `node scripts/check-coverage.mjs` until it exits 0.
  2. Set `AUTH_RESEND_KEY` and `AUTH_EMAIL_FROM` with a verified farmkeke.com domain.
  3. Choose an SMS provider (`deliver.send` is the place to add it).
  4. Deploy, following the 3a safety notes.
