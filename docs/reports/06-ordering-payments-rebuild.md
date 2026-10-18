# Phase 3a - Ordering, checkout, escrow and payments (rebuild)

Date: 18 Oct 2026
Plan: rebuild brief for Phase 3a; `docs/build-plan.md` (Phases 6 and 7); Screen Inventory "Escrow order states" and sections 3 to 6; `farmkeke-docs/PRD.md` order rules.

Result:

- The source for checkout, orders, escrow and Paystack payments is back in `convex/`. Every function name, file path and argument validator matches the live deployment (`incredible-wolf-877`).
- The schema now has all 52 live tables. Every one of the 337 exported live documents validates against it.
- **Nothing was deployed.** Before deploying in Phase 3d, read the codegen note under section 3.

Coverage for 3a: 69 of the 69 live functions in the 3a files are defined, plus the 5 of 5 live HTTP routes. Across the whole deployment it is 169 of 266; the rest belong to Phase 3b (section 5).

## 1. What was built, by file

### Schema and config

- `convex/schema.ts`:
  - 29 new tables, so all 52 live tables are covered:
    - checkouts, orders, orderEvents, riders, ledgerEntries, platformSettings
    - paymentAttempts, paymentRateLimits, unmatchedPaymentEvents
    - savedCards, refunds, payouts, payoutItems, payoutRecipients
    - notifications, notificationPrefs, pushTokens, smsLog
    - disputes, disputeMessages, disputeNotes
    - conversations, messages, messageThrottles
    - reviews, reviewStats, favorites, supportTickets, supportMessages
  - Field names follow the live documents: `checkouts`, `orders`, `orderEvents`, `ledgerEntries`, `paymentAttempts`, `notifications` and `smsLog`. The empty 3b tables are shaped from the live 3b function arguments.
  - New shared validators: `orderStatus`, `escrowState`, `fulfilment`, `orderItem`, `orderAddress`, `orderContact`, `deliveryWindow`, `actorKind`, `paymentMethod`, `refundStatus`, `payoutStatus` and `disputeStatus`.
  - The only change to an existing table is on `users`: two optional fields (`guestClaimToken`, `guestClaimExpiresAt`) and the index `by_guestClaimToken`.
  - There is an index for every query written.
- `convex/convex.config.ts`: declares `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYMENTS_TEST_STEP` and `WEBSITE_URL`, all `v.optional`.

### Shared libraries

- `convex/lib/orders.ts`:
  - **State machine:** an allowed-moves table, and `transition()`, which writes an `orderEvents` row with an actor for every change.
  - **Ledger:** `ledger()` writes one row per money movement.
  - **Numbers:** sequential order numbers (`FK-10001`, counter `order`), checkout references (`CK-10001`, counter `checkout`) and 6-digit pickup codes.
  - **Stock:** `takeStock` and `restoreStock`.
  - **Payment success:** `markCheckoutPaid`. Each order goes to `paid` with escrow `held`, `respondBy` is set 24 hours ahead, and `expireOne` is scheduled with `runAt`. It also writes a `hold` ledger row and notifies the farm and the consumer.
  - **Refunds:** `refundOrder`. A full refund includes the delivery fee; a part refund is capped at the product total. Each refund gets a `refunds` row and a pending ledger row, and `payments/refunds.send` is scheduled.
  - **Ending early:** `endWithFullRefund`, for decline, expiry and staff cancel.
  - **Release:** `releaseOrder` writes ledger rows for the farm's share (product total minus commission), the commission and the delivery fee. It creates a `payouts` row and its `payoutItems`, then schedules `payments/payouts.send` (automatic Paystack Transfer).
  - **Pickup clock:** `pickupDeadline` is for 3b dispatch to call when an order reaches the point.
  - **View builders:** `orderCore`, `orderRow` and friends. Their field names are ones the website's `returns/orders.ts` reader already understands.
- `convex/lib/paystack.ts`:
  - `paystack()`: a fetch wrapper; no Node runtime needed.
  - `validSignature()`: HMAC-SHA512 of the raw body with Web Crypto, compared in constant time.
  - `paymentsLive()`, `testStepOn()` and `websiteUrl()`.
  - `chargeArgs()`, which maps a Paystack transaction onto `settleCharge`'s arguments.
  - `paymentEmail()`: Paystack requires an email, and guests may not give one.
- `convex/lib/settings.ts`: reads the A-84/A-85 settings, with defaults (5% commission, 24h response, 24h unconfirmed alert, 3-day pickup hold, 12h dispute reply). Also has `commissionOn()`.
- `convex/lib/notify.ts`: `notify`, `notifyConsumer` and `notifyFarm` write a `notifications` row. Where section 5 calls for SMS, they also write an `smsLog` row with status `recorded`. Also has `naira()` formatting.
- `convex/lib/rateLimit.ts`: a fixed-window limit on the `paymentRateLimits` table.

### Checkout: `convex/checkout.ts`

- `quote`: same shape as `samples/checkout.quote.json`, with `changes` (kinds: unavailable, sold_out, price, quantity), `deliveryBlockers` and `pickupBlockers`. The delivery fee is charged once per farm order.
- `listingForCart`: same shape as its sample.
- `deliveryWindows`: same shape as its sample (`days[].slots`, `readyDay`). It offers the next 14 days on which every farm in the cart is open, after the longest lead time, in Nigerian time, with slots 09–12, 12–15 and 15–18. `now` comes from the caller.
- `pickupPoints`: same shape as its sample, plus distance when a position is given (nearest first).
- `contactDefaults`: prefills contact details from the account, or from the identity's last checkout.
- `place`: re-checks the cart on the server and throws `CART_CHANGED`, `FULFILMENT_NOT_OFFERED` or `TOTAL_CHANGED` when it differs. It also:
  - validates the address or pickup point, the contact phone and the delivery window
  - holds stock
  - creates one checkout and one order per farm
  - can save the address to the account
  - can replace an earlier unpaid checkout
  - is limited to 20 per identity per hour
- `abandonStale` (internal): run by cron. Unpaid checkouts older than an hour are cancelled, and their stock goes back.

### Orders

- `convex/orders/consumer.ts`:
  - `list` and `get` (owner only).
  - `find`: Find my order by number and phone. The result is view-only, with no pickup code and no street address.
  - `placedSummary` (M-47).
  - `confirmReceipt`: allowed only once the order is delivered or collected, and only by the identity (device) that placed it. It completes the order, releases the money unless staff put it on hold, and schedules the review reminder a day later.
  - `startGuestClaim` and `claimGuestOrders`: a one-hour token links a guest's orders, checkouts and notifications to an account.
- `convex/orders/farmer.ts`:
  - `list` (F-40 tabs), `counts` and `dashboard`.
  - `get`: includes the consumer's first name and phone, and the money net of commission.
  - `packingSlip`.
  - The steps: `accept` (before the deadline; suspended farms can't accept), `decline` (full refund; stock goes back unless the reason is out_of_stock), `startPreparing`, `markPacked`, `readyForRider` and `confirmHandover`.
- `convex/orders/system.ts`:
  - `expireOne`: runs at the deadline. The order expires and is refunded in full, both sides are notified, and the stock goes back. If the deadline was extended, it reschedules itself.
  - `expireUnanswered`: the cron safety net for expiry.
  - `remindFarmers`: a "deadline near" message about 4 hours before.
  - `flagUnconfirmed`: delivered or collected orders still unconfirmed a day later are flagged for A-61 and the consumer is reminded. Pickup orders past their window are flagged too.
  - `pickupWindowEnded`: extra; a per-order job for the 3-day pickup window.

### Payments

- `convex/payments/config.ts`: `get` returns `{ live, testStep }` as specified.
- `convex/payments/checkout.ts`:
  - `start` returns `{ accessCode, authorizationUrl, reference }`.
    - Its `callback_url` is `${WEBSITE_URL ?? "https://farmkeke.com"}/checkout/pay/<checkoutId>`.
    - The new optional `returnTo: "app"` uses `${CONVEX_SITE_URL}/paystack/return?checkoutId=…` instead.
    - Saved cards are charged with `charge_authorization`.
  - `verify`, `get` and `markPaidTest` (test step only).
  - Internal: `beginAttempt` (owner check, rate limit, reference `CK-10001-1`), `attemptOpened`, `openAttempts` and `settleCharge`.
  - `settleCharge` is idempotent. It checks the amount and currency. It saves reusable cards for accounts. When a checkout was already paid or abandoned, or the amount is wrong, it records a `mismatch`. A reference it doesn't know goes to `unmatchedPaymentEvents`.
- `convex/payments/refunds.ts`:
  - `forOrder`: open to the owner, the farm or staff.
  - `beginSend`, `send` (Paystack `POST /refund`), `finishSend` and `settleEvent` (`refund.*` webhooks).
- `convex/payments/payouts.ts`:
  - `list` and `get`, for the farmer.
  - The send path: `beginSend`, `send` (creates the transfer recipient if needed, then `POST /transfer`), `finishSend`, `saveRecipient`, `newReference` and `settleTransfer` (`transfer.*` webhooks).
- `convex/payments/bank.ts`:
  - `resolveAccount`: Paystack `/bank/resolve`.
  - `savePayoutAccount`: resolves the name, then calls `applyPayoutAccount`, which updates the farm, drops the old recipient, writes an audit row and alerts the farmer by push and SMS.
  - `lookupGate`: accounts only, 10 lookups per 10 minutes.
- `convex/payments/cards.ts`: `list`; `remove`, which also deactivates the authorization on Paystack; and `forget`.
- `convex/payments/processor.ts`: `run` (cron).
  - It re-sends refunds and payouts whose scheduled send never ran.
  - A refund that stalls mid-send is marked failed for staff to check, because Paystack refunds have no idempotency key.
  - A payout that stalls is retried with the same reference, so a duplicate is rejected instead of paying twice.
- `convex/http.ts`:
  - `/paystack/webhook` (POST) checks `x-paystack-signature` and returns 401 if it's wrong.
    - `charge.success` is re-checked with Paystack's verify endpoint before use.
    - `refund.*` events go to `refunds.settleEvent`, and `transfer.*` events go to `payouts.settleTransfer`.
  - `/paystack/return` (GET) verifies the reference, then opens `farmkeke://checkout/pay/<checkoutId>`.
  - The auth routes and `/reset-password` are unchanged.

### Admin, scheduling and stubs

- `convex/admin/fees.ts`:
  - `get` is open to any staff role.
  - `setCommission` (finance) takes basis points or `null`; `null` means the 5% default applies.
  - `setRules` (operations) sets the farmer response time and the unconfirmed-order alert.
  - Every change is audited.
- `convex/admin/ledger.ts`:
  - `entries` and `list` (paginated by escrow state).
  - `releaseQueue`: confirmed but on hold, unconfirmed after a day, and disputed.
  - `release` (finance): for delivered or collected orders; never disputed ones.
  - `setHold` (finance): lifting a hold on a confirmed order releases it.
  - Everything is audited.
- `convex/crons.ts`:
  - expiry sweep every 15 minutes
  - farmer reminders every 30 minutes
  - unconfirmed and overdue-pickup flags every hour
  - unpaid checkouts abandoned every 15 minutes
  - the payment processor every 10 minutes
- Stubs for 3b:
  - `convex/notifications/store.ts`: internal `create` (extra, wraps `lib/notify`) and the live `logSms`.
  - `convex/reviews.ts`: internal `remind`, which order completion schedules.
- `scripts/check-coverage.mjs`: compares the functions and HTTP routes defined in `convex/` against the live spec. It prints what's missing, extra or of the wrong kind, per file.
  - Options: `--only prefix,…` and `--list`.
  - It reads files only.

## 2. Deviations from the spec and why

- **Escrow states follow the live API**, not the brief's wording: `none | held | released | refunded | split`. The live `admin/ledger.list` only accepts these, and live orders already hold `escrow: "refunded"`. `split` is the brief's "part_refunded": part refunded, the rest released.
- **Order statuses follow the live `admin/orders.list` validator:** `awaiting_payment, paid, accepted, preparing, ready_for_rider, out_for_delivery, with_rider, at_pickup_point, delivered, collected, completed, declined, expired, cancelled, disputed`.
  - "Pending acceptance" is `paid`, which matches the live data.
  - "Packed" is a step inside `preparing` (`packedAt`), because the live status list has no `packed`.
  - Pickup orders go `ready_for_rider → with_rider → at_pickup_point → collected`. Delivery orders go `ready_for_rider → out_for_delivery → delivered`.
- **`start` has one extra optional argument, `returnTo`**, as the brief asked. Every other 3a validator is identical to the live spec.
- **Extra internal functions:**
  - `orders/system.pickupWindowEnded` handles the 3-day pickup window with `runAt`.
  - `notifications/store.create` is the requested stub.
  - The coverage checker reports both as "extra".
- **Pickup hold** is `max(3 days, the point's collectWithinDays)`. The PRD says 3 days, but the live pickup points say 2, so the shown value and the clock use at least 3.
- **No automatic release.** The money goes to the farm only when the consumer confirms or staff release it by hand (Screen Inventory: "Money never releases automatically"). "Automatic" applies to the payout: release triggers the Paystack Transfer straight away.
- **Abandoned unpaid orders become `cancelled`** with `cancelReason: "payment_not_completed"` (or `"replaced"`), and are hidden from the consumer's list. The live status list has no `abandoned` status for orders.
- **Stock is held at `place`**, not at payment. It goes back on abandon, expiry, or decline other than out_of_stock.

## 3. Bugs found and fixed

- **Notification amounts:** they used `toLocaleString("en-NG")`, which needs Intl in the Convex runtime. They now use a plain `naira()` formatter.
- **Stalled sends:** the first version of `payments/processor.run` re-sent stalled refunds, and gave stalled payouts a new reference. Either could have paid twice. Refunds are now marked failed for staff, and payouts are retried with the same reference.
- **CRLF:** `schema.ts` and `http.ts` use CRLF line endings, so string-replace edits needed newline normalising.
- **Codegen output, worth knowing for 3d:** `npx convex codegen` printed "Downloading current deployment state… Uploading functions to Convex…". Its help says it "doesn't modify the code running on the deployment". I checked straight after with the read-only `npx convex function-spec`: the live deployment still had the same 271 functions, none missing and none new.
- **Flow tests:** the payout send only runs once fake timers are advanced (`finishAllScheduledFunctions(vi.runAllTimers)`). This was a test fix, not a code fix.
- Nothing failed at typecheck.

## 4. Verification

All commands were run from the repo root unless noted.

- `npx convex codegen --help`: confirms it doesn't modify deployed code.
- `npx convex codegen --typecheck disable`: regenerated `_generated/`. The env types now include the four new variables.
- `npx convex function-spec` (read-only), compared with `web/convex-spec/live-function-spec.json`: 271 = 271, no differences. Nothing was pushed.
- `npx tsc --noEmit -p convex`: no errors.
- `node scripts/check-coverage.mjs --list --only checkout,orders/,payments/,admin/fees,admin/ledger,notifications/store,reviews`: every 3a file is ok.

  | File | Covered |
  | --- | --- |
  | checkout | 7/7 |
  | orders/consumer | 7/7 |
  | orders/farmer | 11/11 |
  | orders/system | 4/4 (+1 extra) |
  | payments/checkout | 8/8 |
  | payments/config | 1/1 |
  | payments/processor | 1/1 |
  | payments/refunds | 5/5 |
  | payments/payouts | 8/8 |
  | payments/cards | 3/3 |
  | payments/bank | 4/4 |
  | admin/fees | 3/3 |
  | admin/ledger | 5/5 |
  | HTTP routes | 5/5 |

  `notifications/store` (1/4) and `reviews` (1/7) are 3b files holding only the stubs.
- `node scripts/check-coverage.mjs`, all files: 169/266 functions and 5/5 routes. What's missing is listed in section 5.
- **Argument check:** I bundled the 3a modules with esbuild in the scratchpad, read each function's `exportArgs()`, and compared it with the live spec. 68 match exactly. The only difference is `payments/checkout.start`, which has the intended optional `returnTo`.
- **Schema check:** I bundled `schema.ts` and validated every document in `farmkeke-backups/2026-10-18/export/*/documents.jsonl` against its table validator. Result: 52 schema tables = 52 live tables, 337 documents checked, 0 failing.
- **Flow tests** (`convex-test` + vitest, installed in the scratchpad only; the repo's `package.json` is unchanged): 4 of 4 pass. I broke one expectation on purpose to confirm the assertions run.
  1. A guest orders from two farms (FK-10001, FK-10002) and pays with the test step.
     - The wrong farmer can't accept, and the consumer can't confirm before delivery.
     - Farm A goes through every step. Another device gets only the view-only Find my order, and can't confirm.
     - The guest confirms. The ledger reads: hold 1,000,000; release 855,000; commission 45,000 (5%); delivery fee 100,000; payout 855,000 done. The payout is simulated and sent, and the events carry their actors.
     - Farm B's order expires after 24 hours, with a full refund of 400,000 (simulated, processed) and its stock back. The review reminder is sent.
  2. A pickup order:
     - It gets a 6-digit code, and the point shows 3 days.
     - Staff fees default to 5%, and setCommission sets 10%.
     - The order is flagged unconfirmed on A-61. A hold blocks release, and the consumer's confirm keeps the money held. Lifting the hold releases it at 10%.
     - Audit rows are written, and the guest claim moves the orders to the account. A reused token fails.
  3. A price change gives `CART_CHANGED`. A decline (out_of_stock) gives a full refund and keeps the stock off. An abandoned checkout gives its stock back. With a secret key set, `markPaidTest` is refused.
  4. The live Paystack path, with fetch mocked:
     - `start` returns the three fields, with the website `callback_url`.
     - A bad signature gets 401. A good one is accepted, and a replay is a no-op.
     - The card is saved. The transfer recipient is created, and the transfer is made for 427,500 with reference `PO-FK-10001-1`. The `transfer.success` webhook marks it sent.
     - `verify` marks a second checkout paid. A decline triggers `POST /refund` for 450,000 against `CK-10002-1`, and the `refund.processed` webhook settles it.
     - An unknown transfer is recorded in `unmatchedPaymentEvents`.

## 5. Open questions and guesses

- **Deep link:** the app's return deep link is guessed as `farmkeke://checkout/pay/<checkoutId>?reference=…`. Change it in `http.ts` if the app's route differs.
- **Guest email:** Paystack needs an email. For guests with none, it uses `<phone digits>@guest.farmkeke.com`.
- **Return shapes:** shapes for functions with no sample were guessed: orders, payouts, refunds, the farmer dashboard, `placedSummary` and `payments/checkout.get`. They use field names the website's `returns/orders.ts` reader already accepts.
- **Order tabs:** the farmer tab "with_rider" covers with_rider, out_for_delivery, at_pickup_point, delivered and collected.
- **Notifications:** 3a only records notifications and SMS rows; nothing is pushed or texted yet. Guests get the SMS record on the shop side and farms get it for order events, per section 5.
- **Find my order** is a query, so it has no rate limit. It needs both the order number and the phone, and hides the pickup code and street.
- **Account deletion:** `accountsInternal.deleteUserData` (existing, unchanged) still deletes users who have orders in progress. Its comment expects a "waiting_for_orders" step once orders exist. That belongs in 3b or later.
- **Still missing for 3b** (97 functions):
  - admin/chat, admin/dispatch, admin/disputes, admin/orders, admin/payments, admin/riders, admin/support
  - chat, disputes, earnings, favorites
  - notifications and notifications/deliver, plus the rest of notifications/store
  - reviews, support
  - **storefront.js: 7 of 8 functions are missing locally** (categoryListings, collection, farm, farmAreas, popular, product, search). The website already calls them, so they must be rebuilt before 3d, or deploying would break the shop.

## 6. What's next

- Phase 3b:
  - disputes (the part refund and split release paths are ready: `refundOrder` with kind `part`, and `releaseOrder` with `split`)
  - admin/dispatch, which sets `delivered`, `collected` and `at_pickup_point` and calls `pickupDeadline`
  - admin/orders (cancel uses `endWithFullRefund`; extendDeadline patches `respondBy`, and `expireOne` reschedules itself)
  - admin/payments (retries use `newReference`)
  - riders, chat, reviews, favorites, earnings, notifications delivery, support, and the missing storefront functions
- Phase 3d:
  - run `node scripts/check-coverage.mjs` until it exits 0
  - clear the order and payment test rows
  - set `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` and `WEBSITE_URL`
  - point the Paystack webhook at `<CONVEX_SITE_URL>/paystack/webhook`
  - turn off OTP for transfers in Paystack, or payouts stay pending
  - then deploy
