# Phase 1: Paystack split payments (backend money flow)

Date: 17 November 2026

Farmkeke no longer holds shoppers' money. Each approved farm is a Paystack
subaccount, and Paystack splits every payment the moment it is made. The
farm gets its products' total minus Farmkeke's commission. Farmkeke keeps
the commission and the delivery fee. Paystack's fee is shared in proportion
to each side's part.

Every order, pickup included, is now paid after the farm accepts. An order
closes by itself 24 hours after delivery or collection. Problems can be
reported until then. Farmkeke funds refunds, and the farm's part of a refund
is recovered from its next orders.

## 1. What was built, by file

### New files

- `convex/lib/split.ts`
  - `paysFor(order)`: which orders a payment pays for (accepted, not ended, not yet paid).
  - `ordersPaidBy(checkoutId)`.
  - `planSplit(checkoutId)`: each farm's part of the payment.
    - share = clamp(items total − commission − amount owed, 0, order total).
    - recovered = (items total − commission) − share. A negative value is a credit paid out.
  - `paystackSplit(parts, name)`: the body for `POST /split`.
    - `type: "flat"`, shares in kobo, `bearer_type: "all-proportional"`.
    - Returns null when no farm has a share.
- `convex/payments/subaccounts.ts`
  - `sync` (internal action): creates the farm's subaccount (`POST /subaccount`), or updates it (`PUT /subaccount/:code`).
  - `saveResult`: stores the code, or the error. Staff with `farmers.manage` are told once per new error.
  - `syncMissing` (cron): hourly retry for up to 20 active farms with no subaccount or with an error.
- `convex-tests/split.test.ts`. New tests:
  - a two-farm split, where one farm has a debt and one a credit;
  - the debt and credit limits;
  - subaccount create, update, failure alert and retry;
  - the 24-hour report window;
  - a full refund the farm isn't charged for.

### Changed files

- `convex/schema.ts`
  - `farms`: `paystackSubaccountCode`, `subaccountSyncedAt`, `subaccountError`, `owedKobo`.
  - `orders`: `farmShareKobo`, `commissionKobo`, `recoveredKobo`.
  - `paymentAttempts`: `split`, `splitCode`.
  - `refunds`: `farmDebtKobo`.
  - New ledger kinds: `farm_share`, `farm_debt`, `debt_recovered`.
- `convex/checkout.ts`
  - Every checkout starts in `awaiting_bill`, and every order in `placed`. Each order gets the 24-hour accept deadline.
  - `payNow` is always false.
  - The unpaid-checkout cap and the email requirement (while SMS isn't sending) apply to pickup too.
- `convex/lib/bill.ts`
  - One bill flow for both delivery and pickup.
  - A pickup bill goes out as soon as every farm has answered.
  - The bill text mentions delivery only when there is a fee.
- `convex/payments/checkout.ts`
  - `beginAttempt` plans the split. If payments are live and a farm has no subaccount, it schedules a sync and refuses with `FARM_NOT_READY`.
  - The amount is recomputed from the orders still to pay for (see section 3).
  - `start` creates the Paystack split, then passes `split_code` to `/transaction/initialize` and `/transaction/charge_authorization`.
  - `settleCharge` passes the planned split to `markCheckoutPaid`.
- `convex/lib/orders.ts`
  - `markCheckoutPaid`:
    - marks each order `escrow: "released"` at once, with its share, commission and recovered amounts;
    - writes the `farm_share`, `commission`, `delivery_fee` and `debt_recovered` ledger entries;
    - lowers the farm's `owedKobo`;
    - tells the farm what Paystack is sending it.
  - `refundOrder`: for split orders, adds the farm's part of the refund to `owedKobo` and writes a `farm_debt` entry and a farm notification. This is skipped when `chargeFarm` is false.
  - `endWithFullRefund` refunds split-paid orders too.
- `convex/orders/system.ts`: `flagUnconfirmed` closes split orders 24 hours after delivery or collection and asks for a review. Legacy held orders keep the old reminder.
- `convex/disputes.ts`: a report after the window throws `REPORT_WINDOW_CLOSED`.
- `convex/admin/disputes.ts`, `resolve`, for split orders:
  - `refunded`: cancel and refund in full;
  - `split`: part refund;
  - `released`: no refund.
  - New `chargeFarm` argument.
- `convex/admin/orders.ts`: `cancel` gets `chargeFarm`, and refunds split-paid orders. Only delivery orders can be priced.
- `convex/orders/farmer.ts`:
  - `paymentPending` covers pickup.
  - A ready but unpaid pickup shows the `waiting_for_payment` step.
  - `confirmCollection` refuses unpaid orders with `NOT_PAID_YET`.
  - Pickup accept messages are updated.
- `convex/orders/consumer.ts`: the bill view and the "Bill ready" label work for pickup.
- `convex/admin/farmerRequests.ts` and `convex/payments/bank.ts`: approving a farm, or changing its bank account, schedules a subaccount sync.
- `convex/crons.ts`: the hourly "sync farm subaccounts" job.
- `convex/lib/paystack.ts`: the request helper accepts `PUT`.
- `convex/lib/alerts.ts`: farm `order_paid` and `farm_debt` alerts belong to the payments group.
- `convex/shopStats.ts`: the response-time rebuild measures from when the order was placed. Payment now comes after acceptance.
- `convex/notifications/store.ts` and `convex/lib/emails.ts`:
  - A pickup payment sends the "Paid: order …" email.
  - "You haven't paid anything yet" appears on accepted and preparing emails for unpaid pickup orders.
  - The pickup preheader no longer mentions a rider.
- `convex/admin/dispatch.ts`: delivery and collection messages tell the shopper they can report a problem within 24 hours.
- `web/convex-spec/admin-function-spec.json`, `web/src/convex/admin.ts`: regenerated for the new `chargeFarm` arguments.
- Tests updated for the new flow:
  - `convex-tests/{flow,after-sale,emails,security,storefront}.test.ts`;
  - `convex-tests/orderFlow.ts`.

## 2. Deviations from the spec and why

- The `escrow` field is kept rather than removed. A split order is `"released"` the moment it is paid. That keeps the app, website and Admin Portal working unchanged until phase 2.
- The legacy release, payout and confirm code stays for orders paid before the switch: `releaseOrder`, the admin hold and release actions, and `confirmReceipt`. Phase 2 removes it from the screens.
- `confirmReceipt` still works, but the order now closes by itself after 24 hours. The "I received everything" button comes out in phase 2.
- Some copy still says "held safely", including the farmer dashboard "held" figure and the dispute `heldKobo`, which is 0 for split orders. This is the phase 3 sweep.

## 3. Bugs found and fixed

- **Stale bill total.** If staff cancelled one farm's order after a multi-farm bill went out, the payment would still have charged the old total. Farmkeke would have kept the cancelled farm's money.
  - Fix: payment start recomputes the total from the orders still to pay for, and updates the checkout.
  - If nothing is left to pay, it refuses with `CHECKOUT_EXPIRED`.
- **Negative response times.** The response-time rebuild measured from payment to acceptance. Payment now comes after acceptance, so the result was negative (-0).
  - Fix: it measures from placement, or from payment for older orders paid first.
- **Wrong pickup email.** The pickup payment email went out as "Order placed", with copy about a rider.
  - Fix: every bill payment is now treated as a paid bill, with pickup wording.

## 4. Verification

- `cd convex-tests && npx vitest run`: 15 files, 99 tests passed.
- `npx tsc -p convex --noEmit`: no errors.
- `npx tsc --noEmit` (the app): no errors.
- `cd web && npx tsc --noEmit`: no errors, after the admin refs were regenerated.
- `node scripts/local-spec.mjs --only admin/ > web/convex-spec/admin-function-spec.json` and `npm --prefix web run gen:admin`: regenerated.

None of this has run against Paystack itself. The `/split`, `/subaccount` and `split_code` calls are tested against a stubbed Paystack only.

## 5. Open questions and guesses

- **Split per payment.** A new Paystack split is created for each payment attempt, so each farm's share can change with its debt. This needs checking in Paystack test mode, including that `bearer_type: "all-proportional"` is accepted on a flat split.
- **Subaccount `percentage_charge`.** This is set to the commission rate, as a default only. Every payment overrides it with its own split.
- **Farm debt formula.** On a part refund, the farm owes refunded items × (items total − commission) / items total. The delivery fee is never charged to the farm.
- **Credit cap.** A credit (negative `owedKobo`) is paid out only up to the order's total.
- **Guest email.** Pickup guests now need an email until Termii SMS is sending, the same as delivery guests.
- **Review reminder.** It goes out when the order closes, which is already a day after delivery, rather than a day after that.

## 6. What's next

- **Before going live:**
  - deploy Convex;
  - set up each existing farm's subaccount (the hourly job does this once a live Paystack key is set);
  - run one test-mode payment end to end.
- **Phase 2, screens:**
  - remove the confirm step in the app and on the website;
  - farmer earnings, including amounts owed;
  - Admin Money: payments, refunds, farm debts and subaccount status;
  - dispute outcomes and admin cancel with a "charge the farm" choice;
  - remove the legacy release, payout and escrow screens.
- **Phase 3, copy sweep:**
  - "held safely" (41 places);
  - the /escrow page becomes "Buyer protection";
  - emails and help;
  - refund timing of 3–10 working days.
- **Phase 4:** wider tests and checks.
