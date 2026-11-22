# 32. Simpler order flow and fewer texts (APK correction #11)

Built from `docs/APK-CORRECTIONS-2026-11-22.md` section #11 and the owner's
"#11 decisions (owner, 22 Nov)". Nothing was committed, pushed or deployed.

## 1. What was built, by file

### Part A: texts

- `convex/lib/alerts.ts`: `SMS_KINDS` is now `shop: bill_ready` and
  `farm: payout_account_changed` only. `ready_for_pickup`,
  `application_received`, `application_approved` and `order_new` are push,
  in-app and email (where they already email). The settings rows'
  `smsAvailable` comes from `SMS_KINDS`, so the SMS switch disappears from
  shop "Order updates" and farm "New orders and deadlines" by itself (it stays
  on the locked "Payments" rows, which still text). Phone sign-up and
  forgot-PIN codes in `convex/phoneAuth.ts` are unchanged.
- `app/dev/alerts.tsx`: the sample settings rows match (no SMS for order
  updates or farm orders).
- Copy that promised a text for events that no longer text (or never did):
  - `app/sell/submitted.tsx`: "We text you the decision" is now "We tell you
    the decision: in the app, by notification and by email".
  - `web/src/app/(site)/sell/page.tsx`: new-order alerts are "in the app, by
    push notification and by email"; the application decision is "in the app
    and by email".
  - `src/content/legal/privacy.json` and `web/src/content/legal/privacy.json`:
    texts are for "a few important ones, such as your bill" (no longer "when a
    pickup order is ready"). Updated date 22 November 2026.
  - `app/order-placed/[checkoutId].tsx`: "We'll text you at every step" is now
    "We'll keep you posted in the app and by email, and text you your bill".
  - `app/order/[id]/problem-sent.tsx`, `app/order/[id]/refund.tsx`,
    `web/src/app/(focus)/orders/[orderId]/refund/RefundView.tsx`,
    `src/features/checkout/PayFlow.tsx`,
    `web/src/app/(focus)/checkout/pay/[checkoutId]/PayView.tsx`, both order
    pages' "We'll text you with the outcome / when it's on its way": now "let
    you know" (none of those events text).
  - The bill is still texted, so "by email, text and in the app" for the bill
    stays everywhere it appears.

### Part B: the farm only accepts or declines

Backend:

- `convex/lib/orders.ts`
  - Status rules (`NEXT`): `accepted` can now go straight to
    `ready_for_collection`, `out_for_delivery`, `with_rider` or `delivered`;
    `preparing` and `ready_for_rider` can go to `out_for_delivery`,
    `with_rider`, `delivered` (and `preparing` to `ready_for_collection`), so
    older orders sitting in those statuses can be moved on by staff. All
    statuses stay in the schema.
  - New `canSayArrived` / `ARRIVABLE` (a paid delivery that is out for
    delivery or still waiting for the rider), `canSayCollected` /
    `COLLECTABLE` (a paid order at the farm or at a pickup point).
  - `deliveredByShopper` works from any `ARRIVABLE` status.
  - New `readyAtFarm` (moves an order to `ready_for_collection`) and
    `startPickupClock` (for a paid order ready at the farm: sets `collectBy`
    and `arrivedAt`, schedules the reminder and window end, and sends the
    `ready_for_pickup` notice with the code; does nothing unpaid or twice).
  - `markCheckoutPaid`: for billed orders, calls `startPickupClock`, so a
    pickup order accepted before payment gets its 3 days and its "ready to
    collect" notice the moment it's paid. The farm's "paid" message now says
    "A Farmkeke rider will collect it. Have it ready." or "The shopper can
    collect it now. You can scan their pickup code when they come."
  - `orderCore`: the rider shows on an order from `accepted` on (staff now
    assign riders to accepted orders that never become `ready_for_rider`).
- `convex/orders/farmer.ts`
  - Removed `startPreparing`, `markPacked`, `readyForRider` and
    `confirmHandover`.
  - `accept`: pickup at the farm moves straight on to `ready_for_collection`
    (`readyAtFarm`); older pickup-point orders stay `accepted` for staff.
    Shopper messages no longer say "will start preparing it".
  - Tabs: `new`, `accepted` (every accepted, not-yet-closed status, including
    the old ones), `completed`, `cancelled`, `disputed`. The list validator
    still accepts `to_prepare` and `with_rider` from older app builds and
    shows the accepted orders for both.
  - `dashboard`: counts are `{ new, accepted, disputed }`; `toPrepare` is gone.
  - `get().next`: `accept`; `waiting_for_payment`; `rider_collecting` (paid
    delivery waiting for the Farmkeke rider, nothing for the farm to tap);
    `confirm_collection` (paid pickup at the farm: the optional scan); or null.
  - `confirmCollection` (the QR/code scan) is unchanged.
- `convex/orders/consumer.ts`
  - New `markCollected`: the shopper (only the identity that placed the
    order) says they have a paid pickup order (`ready_for_collection` or
    `at_pickup_point`). Idempotent; `NOT_PAID_YET` before payment;
    `NOT_READY_TO_COLLECT` otherwise.
  - `markArrived`: now works for a paid delivery that staff haven't yet
    marked out for delivery too.
  - The order view has `canMarkCollected`; `canMarkArrived` uses
    `canSayArrived`.
- `convex/admin/dispatch.ts`
  - Board: "Ready for a rider" holds every paid order still at the farm
    (`accepted`, `preparing`, `ready_for_rider`), with or without a rider.
    "No rider" and "collection late" flags apply to all of them.
  - `recordStep`: `collected_from_farm` (shown as "Out for delivery") from
    `accepted`/`preparing`/`ready_for_rider`; `delivered` also straight from
    those (paid deliveries only); new `ready_at_farm` step for older
    pickup-at-farm orders left in `accepted`/`preparing` (starts the pickup
    clock and notice); `collected_by_consumer` needs the code only at a
    pickup point (at the farm the code is optional but must match if given).
    Every step except `ready_at_farm` and `dropped_at_pickup_point` needs the
    order paid. Marking delivered/collected after the shopper already did is a
    no-op that returns the status. Pickup-at-farm orders can't be sent "out
    for delivery".
  - The farm's rider message is "Have it ready." (was "packed and ready").
- `convex/admin/orders.ts`: the "stuck" view no longer flags "not preparing";
  paid orders still at the farm are flagged `no_rider`,
  `not_collected_from_farm` (rider collection 2h late, or 48h since payment),
  or `not_ready` (an older pickup-at-farm order staff need to mark ready).
- `convex/admin/riders.ts`: a rider's active jobs include accepted orders
  assigned to them.
- `convex/lib/emails.ts`: "Order accepted" no longer says "they're getting it
  ready now"; pickup at the farm says the bill comes next and the code follows
  once paid. The rider-assigned email says "Have it ready" and "There's
  nothing to mark in the app". The "being prepared" email is kept (older
  notifications, previews) with a comment that nothing raises it now.

App (farmer):

- `src/features/farm/status.ts`: tabs New, Accepted, Completed, Disputed,
  Cancelled. Badges: accepted/preparing/ready_for_rider read "Awaiting
  payment", "Rider collecting" (delivery) or "Accepted".
- `src/features/farm/OrdersView.tsx`: one "Accepted" empty state.
- `src/features/farm/DashboardView.tsx`: header tiles New, Accepted,
  Problems; the "To prepare" section is gone.
- `src/features/farm/FarmOrderView.tsx`: stage bar Accept, Paid, With buyer,
  Closed. Steps: Accept (with "That's all you do"); "Bill sent to the buyer";
  "A Farmkeke rider collects it" (rider and time, "Nothing to tap"); "Buyer
  collecting" with "Scan pickup code" (optional). History shows Preparing,
  Packed and Ready for the rider only for older orders that have those times.
- `src/features/farm/OrderSheets.tsx`: `HandoverSheet` removed (the code sheet,
  which the PIN-keypad agent is also editing, is untouched).
- `app/farm-order/[id]/index.tsx`: only accept, decline and collect actions.
- `app/dev/farm.tsx`: samples follow the new steps and tabs.

App and website (shopper):

- `src/features/orders/steps.ts` and the website's
  `web/src/app/(shop)/orders/[orderId]/OrderView.tsx`: timelines are now
  Placed, Accepted, Bill paid, then "A Farmkeke rider brings it" / "Out for
  delivery", Delivered, Closes; or, for pickup at the farm, "Ready to collect
  at <farm>" (current once paid), Collected, Closes. Older pickup-point orders
  get a "A Farmkeke rider takes it to <point>" step. No "preparing" or
  "packed" steps.
- `src/features/orders/OrderView.tsx` and the website order page: "Collected"
  button for a paid pickup order waiting to be collected; "It's arrived" is
  the main button while out for delivery, and a secondary button while a paid
  delivery waits for the rider. Collect-at-the-farm card says "Ready once your
  bill is paid".
- `src/features/orders/status.ts`, `web/src/components/orders/rows.ts`:
  badges and row text without "Preparing"/"Being prepared"; an unpaid pickup
  at the farm reads "Waiting for your bill", not "Ready to collect".
- `web/src/convex/returns/orders.ts`: `canMarkCollected`.

Admin Portal:

- `web/src/app/admin/(portal)/dispatch/DispatchView.tsx`: "Ready for a rider"
  cards have "Out for delivery" (or "With the rider" for pickup-point orders)
  and "Delivered" buttons; older pickup-at-farm cards have "Ready to collect".
  "Collected by shopper" at the farm takes the code if staff have it, or a
  note saying who told them.
- `web/src/components/admin/labels.ts`: stuck-reason wording.
- `web/convex-spec/live-function-spec.json`, `web/convex-spec/admin-function-spec.json`,
  regenerated `web/src/convex/api.ts` and `web/src/convex/admin.ts`: only this
  change's functions were merged into the specs (`recordStep`'s new step,
  `markCollected`, `farmer.list`'s tabs, the four removed farmer mutations).
  Other agents' new functions in the checkout (`profilePhoto.*`,
  `storefront.farms`) were left out on purpose.

Help, how-it-works and terms:

- `src/content/help.ts`: no "the farm packs your order".
- `web/src/app/(site)/how-it-works/page.tsx`, `get-the-app/page.tsx`,
  `sell/page.tsx` ("Accept it" replaces "Pack the order"),
  `app/order-placed/[checkoutId].tsx`,
  `web/src/app/(focus)/order-placed/[checkoutId]/PlacedView.tsx`,
  `PayFlow.tsx`, `PayView.tsx`: no "packs"/"prepares" steps.
- `farmer-terms.json` (both copies, `sync-legal --check` passes), "Handling
  orders": accepting is the only step; Farmkeke records the delivery; the
  pickup code scan is optional and the shopper can confirm instead. The
  #5 agent's edits to the same file were kept (the date was already 22 Nov).

Tests (`convex-tests/`):

- `orderFlow.ts`: `handOver`/`deliver` no longer call farm steps (no
  `packed` option).
- `flow.test.ts`: the main delivery test checks the farm's next step,
  counts, dashboard, legacy tab names, staff/shopper refusals before payment,
  `rider_collecting`, the board, staff "out for delivery", and the new event
  list; the pickup test checks ready-at-accept, no clock before payment, the
  `ready_for_pickup` notice with the code after payment, and
  `markCollected` before payment. New test: shopper "Collected" (events,
  report window, closes a day later), staff collected without a code (wrong
  code still refused), staff "delivered" straight from accepted, shopper
  "It's arrived" before staff, and older `ready_for_rider` / `preparing`
  orders moved on by staff (including the `not_ready` stuck reason).
- `sms.test.ts`: only `bill_ready` and `payout_account_changed` text; the
  four dropped kinds don't, even for a guest with no push or email; the
  remaining texts are locked on.
- `after-sale.test.ts`: `ready_for_pickup` no longer texts, `bill_ready`
  does; "It's arrived" is refused unpaid and offered once paid; staff marking
  delivered after the shopper is a no-op.
- `emails.test.ts`, `phase5.test.ts`, `security.test.ts`,
  `storefront.test.ts`, `split.test.ts`: updated for the removed steps.

## 2. Deviations from the spec and why

- **Ready to collect "straight away", but the 3 days start at payment.** The
  order moves to `ready_for_collection` when the farm accepts, as decided. But
  every order is still unpaid at that point (the bill follows), and the farm
  must not hand over unpaid orders, so the shopper's 3 days, the pickup
  reminder and the "ready to collect" notice (with the code) start when the
  bill is paid. Otherwise an unpaid shopper would be told "collect it now" and
  lose part of their 3 days to the 12-hour bill.
- **"It's arrived" before "out for delivery".** The shopper can also say a
  paid delivery arrived while it is still `accepted` (staff may not have
  marked it out for delivery when the rider turns up). It's a secondary button
  there. Staff can likewise mark a paid delivery "Delivered" straight from
  `accepted`.
- **Staff "collected" at the farm without the code.** Staff are not at the
  farm, so the code is optional there (a note is required instead in the
  portal). At a pickup point the code is still required.
- **Removed farm mutations instead of keeping them.** `startPreparing`,
  `markPacked`, `readyForRider` and `confirmHandover` are deleted. An old APK
  that taps one of them will get a "function not found" error once this is
  deployed; old app builds' farm order tabs keep working (`to_prepare`,
  `with_rider` still accepted).
- **Farm tabs merged.** "To prepare" and "Out" became one "Accepted" tab, since
  the farm has nothing to do in either.

## 3. Bugs found and fixed

- An unpaid pickup at the farm in `ready_for_collection` would have read
  "Ready to collect at the farm" on the website's order list
  (`web/src/components/orders/rows.ts` checked the stage, which maps
  `ready_for_collection` to the pickup-point stage, before the unpaid check).
  It now reads "Waiting for your bill".
- The stuck view's "Accepted 2+ days ago, not preparing" would have flagged
  every accepted order after 2 days now that nothing moves orders to
  `preparing`. Replaced with reasons about the rider and payment.
- Dispatch only offered "Collected" for `ready_for_rider` orders with a rider;
  with no farm "ready" step, paid orders would have sat in "accepted" with no
  button. Fixed by the board and step changes above.
- Found only when running tests: the cancelled-while-paying split test and the
  pickup emails test assumed the old statuses and the "being prepared" email;
  both updated.
- `admin.test.ts > sign-in flows` timed out at 5s on two runs and passed on
  the third (the known flaky timeout; it doesn't touch orders).

## 4. Verification

- `npx tsc --noEmit -p convex`: exit 0.
- `npx tsc --noEmit -p .`: exit 0.
- `npx tsc --noEmit` in `web/`: exit 0.
- `node scripts/sync-legal.mjs --check`: "App legal text matches the website."
- `Set-Location 'C:\Users\Guesttt\Documents\farmkeke\convex-tests'; npm.cmd test`:
  - first two runs: 117 of 118 passed, the one failure being the
    `admin.test.ts` sign-in 5s timeout (after fixing the four order tests the
    first run surfaced);
  - final run: **17 files, 118 tests, all passed.**
- `node scripts/local-spec.mjs` compared with `web/convex-spec/live-function-spec.json`
  to find this change's function differences, then `npm --prefix web run gen:api`
  and `npm --prefix web run gen:admin`.

## 5. Open questions or decisions that had to be guessed

- **Orders nobody confirms.** A delivery staff never mark delivered (and the
  shopper never taps "It's arrived"), or a pickup nobody confirms, still
  doesn't close by itself: as before, staff see it in Dispatch and the stuck
  view (`delivery_late`, `not_collected`, pickup overdue notices). The owner
  chose "the shopper confirms", not "a fixed time after acceptance"; an
  automatic close after N days could be added if staff can't keep up.
- **Alert settings note (push agent's file).** `src/features/push/AlertSettingsView.tsx`
  still says "Texts only go out for bills and pickup codes" (shop) and "Texts
  only go out for new orders and bank changes" (farm). It should now read
  "Texts only go out for your bill" and "Texts only go out for bank account
  changes". Not edited here: that file belongs to the push agent.
- **Farmers rely on push for new orders.** With no new-order text, a farmer
  without working push only gets the email and the in-app list. #2 (push) is
  a must before launch, as the decision says.
- **Old APKs.** Farmers on an old build who tap "Start preparing" etc. will
  see an error after deploy. Worth releasing the new APK at the same time.
- **Pickup point orders.** Kept as before but driven by staff: out with the
  rider ("collected_from_farm" to `with_rider`) straight from `accepted`, then
  dropped at the point, then collected with the code. No new orders use
  pickup points.

## 6. What's next

- Push agent: update the SMS note in `AlertSettingsView.tsx` (above).
- Deploy the backend and the website together (the website's API references
  the new `markCollected` and `ready_at_farm` step), after the usual
  function-spec diff against the live deployment. Release the new APK at the
  same time.
- After deploy, have staff move any live orders sitting in `preparing` or
  `ready_for_rider` from Dispatch ("Out for delivery", "Delivered" or "Ready
  to collect").
