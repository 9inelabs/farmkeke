# Phase 16: Delivery priced per order, paid by bill; pickup at the farm

Branch: `claude/nice-hopper-p0xjj3`. Three commits: the backend (`d086613`), the admin portal (`bf3a99f`) and the website (this commit).

The new flow:

- **Home delivery.** The checkout total is the produce only. The order starts as `placed` (unpaid) and goes to each farm. When every farm has accepted or dropped out, and staff have assigned a rider and set each delivery price, one bill goes to the shopper by email, text and in the app. The shopper has 12 hours to pay, with a reminder at 6 hours. The rider collects only once the bill is paid. An unpaid bill cancels the orders and tells the farms.
- **Pickup.** The shopper pays the full total at checkout. When the farm has it ready, the order moves to `ready_for_collection` and the shopper gets the farm's address and a 4-digit code. They have 3 days to collect. The farmer enters the code to hand it over.
- **Riders.** Staff add riders in the admin portal with name, phone, vehicle, plate number, bike model and areas. Photo, ID, guarantor and bank details are optional.

## 1. What was built, by file

### Backend (`convex/`, commit `d086613`)

- `schema.ts`:
  - order statuses `placed` and `ready_for_collection`;
  - checkout status `awaiting_bill`, with `billedAt`, `payBy`, `payToken`, `abandonReason`;
  - indexes `by_payToken` and `by_contact_phone_and_status`;
  - orders gain `deliveryPricedAt` and `deliveryPricedBy`;
  - riders gain `bikeModel`;
  - `serviceAreas.deliveryFeeKobo` is optional.
- `lib/bill.ts` (new):
  - constants: 12 hours to pay, a reminder at 6 hours, at most 3 unpaid delivery checkouts per account or phone, and a ₦50,000 cap on a delivery price;
  - `checkBill`: sends the bill once no order is still waiting for the farm and every live order is priced. A checkout with no orders left closes as `no_orders_left`;
  - `remindBill` and `expireBill`. On expiry, orders are cancelled with `bill_not_paid`, stock goes back, the farm is told (`order_cancelled`) and so is the shopper (`bill_expired`);
  - `canPay` and `assertPayable`, which can fail with `BILL_NOT_READY`, `CHECKOUT_EXPIRED` or `ALREADY_PAID`.
- `lib/orders.ts`:
  - new transitions for `placed` and `ready_for_collection`;
  - a 4-digit pickup code;
  - on payment, a delivery checkout holds the escrow and tells the farm (`order_paid`);
  - `collectFromView` (the farm's address and hours for pickup);
  - `orderCore` and `orderRow` gain `collectFrom`, `deliveryPricedAt`, `paid` and `checkoutId`.
- `lib/notify.ts`: links can be passed per notification (`opts.href`). `smsSending()` says whether SMS is live; it returns `false` for now.
- `lib/emails.ts`:
  - the pay link;
  - new emails: order received, bill ready (and the reminder), bill expired;
  - unpaid versions of the farm's new-order email and the cancellation email;
  - pickup emails say "at the farm".
- `notifications/store.ts`: `bill_ready` and `bill_reminder` always go by SMS to the phone given at checkout, for guests and signed-in shoppers alike. There are email templates for the new kinds.
- `lib/alerts.ts`: the bill alerts are payment alerts (always on). Farms get `order_paid` under orders.
- `checkout.ts`:
  - `quote` returns no delivery fee, plus `deliveryFeeLater` and each farm's `collectionArea` and `collectionHours`;
  - `place` ignores the pickup point and time slot. Delivery orders start as `placed` with a respond-by time;
  - new errors: `EMAIL_REQUIRED` (delivery needs an email while SMS is off) and `TOO_MANY_UNPAID`;
  - `place` returns `payNow`.
- `orders/system.ts`: farm expiry checks the bill. `billReminder` and `billExpired` are internal mutations.
- `orders/farmer.ts`:
  - accept and decline work on `placed` orders and check the bill;
  - accepting a delivery alerts staff to price it (`delivery_to_price`);
  - pickup orders go to `ready_for_collection`;
  - `confirmCollection({ orderId, code })` is new and rate-limited;
  - hand-over fails with `NOT_PAID_YET` while a bill is unpaid.
- `orders/consumer.ts`:
  - the shopper sees unpaid delivery orders;
  - `billView` gives each order's bill state;
  - the order list sets `billReady` when the bill is out.
- `payments/checkout.ts`: a new `bill({ token })` query. Payments can use the pay token, so any device with the link can pay. Only the owner can save a card. The Paystack callback returns to `/pay/<token>`.
- `admin/dispatch.ts`:
  - `setDeliveryPrice({ orderId, feeKobo, note })` needs a rider first (`NO_RIDER`) and fails with `BILL_ALREADY_SENT` once the bill is out;
  - `needsPriceCount`;
  - the board gains an "awaiting bill" list;
  - rider steps fail with `NOT_PAID_YET` while unpaid.
- `admin/orders.ts`: cancelling an unpaid order checks the bill. The stuck view adds "needs a delivery price" and "ready for collection". Order detail shows the bill and the rider's plate and model.
- `admin/riders.ts`: vehicle, plate (not for bicycles), bike model (motorbikes and tricycles) and areas are required. Photo, ID, guarantor and bank details are optional.
- `admin/areas.ts`, `storefront.ts`, `admin/dashboard.ts`: area fees are optional; the storefront returns no fee; the dashboard counts paid orders only.

### Admin portal (`web/src/app/admin/`, commit `bf3a99f`)

- Dispatch:
  - a "Price the delivery" column with a Set or Change price dialog;
  - bill badges;
  - the rider's vehicle on each row.
- Order page: a Bill panel with the same price dialog.
- Riders: vehicle, plate and bike model when adding a rider, and on the rider's profile.
- Areas: no fee field.
- Navigation: "Delivery areas"; Pickup points is no longer in the menu; a badge counts deliveries to price.
- Updated labels, rules and dashboard text, and regenerated `src/convex/admin.ts`, `src/convex/api.ts` and the spec files.

### Website (`web/src/`, this commit)

- `app/(focus)/pay/[token]/page.tsx` (new): the bill page. It works on any device, signed in or not.
- `app/(focus)/checkout/pay/[checkoutId]/PayView.tsx`:
  - takes an optional `payToken`;
  - shows the bill, the "paid" thanks, "not ready yet" and "expired" states.
- Checkout:
  - `checkout/delivery/DeliveryStep.tsx`: home delivery shows "Priced later"; pickup is at the farm, with each farm's area;
  - `checkout/details/DetailsStep.tsx`: delivery explains how paying works and asks guests for an email for the bill; pickup lists the farms. There is no time slot, only a note for the rider;
  - `checkout/review/ReviewStep.tsx`: delivery says "Place order" and goes to the order-placed page. It explains the `EMAIL_REQUIRED` and `TOO_MANY_UNPAID` errors;
  - `components/checkout/Shell.tsx`: summaries say "Added to your bill" and "Products total";
  - `components/checkout/draft.ts`: the time slot and pickup point are gone.
- `order-placed/[checkoutId]/PlacedView.tsx`: shows a Pay card once the bill is ready, and the steps to get there.
- `(shop)/orders/[orderId]/OrderView.tsx`:
  - the bill step in the timeline and a Pay card;
  - `CollectFromCard` (the farm's address, hours, directions and phone);
  - unpaid wording;
  - pickup steps say "at the farm". Older orders still show their pickup point.
- `components/orders/rows.ts`: "Waiting for your bill", "Your bill is ready. Pay now", "Ready to collect at the farm".
- `convex/returns/checkout.ts`, `convex/returns/orders.ts`: types for the new fields. `ready_for_collection` maps to the "at pickup" stage.
- `lib/routes.ts`: `payBill(token)`.
- Copy:
  - `ProductBuy`, `MiniCart`, `Filters` ("Pickup at the farm"), `AreaPicker` (shows the LGA instead of fee and points);
  - the landing page, how it works, escrow, sell, get the app, the shop page, the refund policy, the Help Centre FAQs (two answers rewritten, one new: "When do I pay for home delivery?") and the addresses page.
- Pickup locations:
  - `/pickup-locations` now permanently redirects to `/how-it-works`;
  - it was removed from both footers and the sitemap;
  - `components/site/PickupFinder.tsx`, `PickupMap.tsx`, `pickup.ts` and `components/maps/LetteredPointsMap.tsx` were deleted, because nothing uses them now.

### Tests (`convex-tests/`)

- `orderFlow.ts` (new): shared helpers that drive an order through the new flow:
  - placing a delivery order, then billing it (the farm accepts, a rider is assigned and the price is set);
  - paying by the test step;
  - getting a paid order, handing it over and delivering it.
- All six test files moved to the new flow. New cases:
  - several farms, with one letting the order expire;
  - paying by link from another identity;
  - a bill lapsing;
  - the unpaid caps;
  - every farm declining;
  - a live Paystack callback to `/pay/<token>`;
  - farm pickup with the code;
  - SMS logged for the bill.
- The slot-capacity test was removed, because there are no slots.

## 2. Deviations from the spec and why

- **Email is required for delivery orders for now.** The bill has to reach the shopper. Until an SMS provider is connected, the bill text is only logged (`smsLog`), so email is the dependable channel. When `smsSending()` returns `true`, the requirement lifts by itself.
- **The old pickup-point and time-slot code is kept on the backend.** `checkout.place` still accepts the `pickupPointId` and `window` arguments but ignores them. `areas.listPickupPoints` and `checkout.deliveryWindows` still exist. The admin Pickup points page is still at `/admin/pickup-points`, but not in the menu. This keeps older orders readable and keeps an old website build from failing outright during the deploy.
- **Delivery areas keep their records, without a fee.** Staff price each delivery by hand. There is a ₦50,000 ceiling to catch typing mistakes.
- **One bill per checkout, not one per farm.** As agreed: it goes out once every farm has answered, and farms that decline or time out drop out of it.

## 3. Bugs found and fixed

- Making `deliveryFeeKobo` optional broke the types in `checkout.ts`; fixed.
- `canPay` didn't narrow the checkout type. It is now an `asserts` function.
- `notifications/store.ts` used `links` without importing it; added.
- Shoppers couldn't see their own unpaid delivery orders, because the `visible` filter hid unpaid orders. A test found it; fixed.
- The bill SMS didn't appear in one test. Notifications are scheduled, so the test now advances the timers and flushes scheduled functions.
- After the website copy changes, `AreaPicker.tsx` still loaded the pickup-points list without using it. That query was removed, along with the unused imports.

Nothing surfaced only at bundle or run time. The production build passed first time, and the routes below were checked against the built site.

## 4. Verification

All commands were run from the repository root unless noted.

- `cd convex-tests && npm test`: 6 files, 45 tests passed.
- `npx tsc --noEmit -p convex`: no errors.
- `node scripts/local-spec.mjs`, compared with `web/convex-spec/live-function-spec.json`: identical, so the generated website API is current.
- `cd web && npx tsc --noEmit -p .`: no errors.
- `cd web && npx eslint src`: no errors or warnings.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: succeeded. `/pay/[token]` is listed as a partially prerendered route.
- `npx next start -p 3123` with curl:
  - `/pickup-locations` returns 308 to `/how-it-works`;
  - `/pay/abc` returns 200;
  - `/how-it-works` returns 200;
  - `/sitemap.xml` has no pickup entries.

The live Convex deployment doesn't have these functions yet, so the bill and checkout screens were checked by the tests and the typecheck, not against live data.

## 5. Open questions or guesses

- **The SMS provider is not connected.** Bill and reminder texts are written to `smsLog`. Connecting a provider means sending from `notifications/deliver.ts` instead of only logging, and making `smsSending()` in `lib/notify.ts` return `true`.
- **The ₦50,000 ceiling on a delivery price** is a guess at "clearly a typing mistake".
- **3 unpaid delivery checkouts per account or phone** is a guess, to stop someone tying up stock with orders they never pay.
- **Card saving on the pay link:** only the signed-in owner of the checkout can save a card. Someone paying from a shared link can't.
- **Farm pickup address.** The address, hand-over hours and phone come from the collection details each farm gave when it signed up in the app. Nothing checks them again before a pickup order goes to the farm.
- **The mobile app has not been updated.** It still uses the old checkout (fee at checkout, pickup points, time slots). Those arguments are now ignored, so a mobile delivery order would be placed unpaid with no bill page in the app. The app needs this flow before it ships.

## 6. What's next

- **Deploy the backend and the website together.** The website now expects the new functions (`payments.checkout.bill`, `orders.consumer.billView` and others). The old website would still try to take payment at checkout for delivery orders, and the backend now refuses that until the bill is out.
- Add the launch riders and delivery areas in the admin portal (items B4 and B5 in the information PDF). Agree a price guide for staff (B8).
- Connect the SMS provider. Then email can become optional for delivery.
- Bring the mobile app onto the new flow:
  - checkout without a fee or slot;
  - the bill screen and pay link;
  - pickup at the farm, with the farmer's code entry.
- Once older pickup-point orders have finished, remove the pickup-point and time-slot code and the admin Pickup points page.
