# Phase 14: Admin Portal money

Branch: `admin-portal`. This is phase 5 of the Admin Portal plan. It covers the escrow money Farmkeke holds, releasing it to farms, holds, payouts, refunds and payment reconciliation. The commission screen was built in phase 3 (Fees and rules).

## 1. What was built, by file

### Backend (`convex/`)

The money functions already existed (`admin/ledger.ts`, `admin/payments.ts`) and gained permission checks in phase 10. One addition:

- `admin/ledger.ts`: new `summary`, read from the first 1,000 held orders:
  - money held now;
  - orders on hold, confirmed but still held, and delivered but unconfirmed;
  - payouts waiting to send;
  - failed payouts and refunds.

### Website (`web/src/`)

New sidebar group "Money": Release queue, Escrow ledger, Payouts to farms, Refunds, Reconciliation (the badge counts failed payouts and refunds).

- `app/admin/(portal)/money/`, the release queue:
  - totals: held now, waiting to pay out, on hold, failures;
  - three lists: delivered but not confirmed (call the shopper, then release), confirmed but still held (lift the hold), and problem reported (links to the decision);
  - release and hold or lift-hold buttons, each with a reason.
- `money/escrow/`: every order by where its money is (held, paid to the farm, refunded, split), with release and hold on held orders.
- `money/payouts/`: waiting to send, failed and sent, with bank, order count, and any test-mode or "sending" flag.
- `money/payouts/[payoutId]`: the orders in the payout, each with the product total, Farmkeke's commission and the farm's share; its money movements; and **Send again** for a failed payout, which uses a new Paystack reference.
- `money/refunds/`: in progress and failed, and refunded. **Send again** on failed refunds warns staff to check the Paystack transaction first, because refunds have no idempotency key.
- `money/reconciliation/`:
  - payments that didn't match their checkout (refund or dismiss);
  - Paystack events Farmkeke couldn't place (mark checked);
  - counts of failed payouts and refunds;
  - **Check the bank list** against Paystack's;
  - a test-mode notice while there's no Paystack secret key.
- Order page (`orders/[orderId]`): the Money panel now lists every money movement on the order (held, released, commission, delivery fee, refund, paid out) and has release and hold.
- `components/admin/MoneyActions.tsx` (new): release and hold, used on all three of those screens.
- `convex/returns/adminMoney.ts` (new); labels for money movements, payout and refund statuses, and the money audit actions.

## 2. Deviations from the spec and why

- **The money totals are capped.** `summary` reads at most 1,000 held orders, because Convex has no count operator. If there are more, the tile shows "1000+". Exact totals at scale need an aggregate (`@convex-dev/aggregate`), which is noted in section 5.
- **Payouts are only sent from the backend.** Staff can't trigger a payout by hand; they can only retry a failed one. Payouts are created and sent by the backend when orders are released, as before.

## 3. Bugs found and fixed

- **A dialog description was garbled.** The refund retry dialog's text was written with a shell-escaped template that broke the TypeScript parser. Typecheck caught it; rewritten as a template string.
- No backend bugs were found in this phase. The existing money functions were read in full before building the screens.

## 4. Verification

- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **34 passed, 1 failed.** The failure is the same `storefront.test.ts` Windows-path sample test.
- New test in `convex-tests/admin.test.ts`:
  - four orders give the right held total, holds, to-release and unconfirmed counts;
  - the release queue puts each order in the right list;
  - Operations can see money but can't hold it.
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes.
- **Visual check at 390px and 1440px**, with the sample-data preview: the release queue, escrow ledger, payouts, a failed payout, refunds, reconciliation, and the order page with its money movements. No page errors and no horizontal scroll.

## 5. Open questions or guesses

- **Exact totals at scale:** add `@convex-dev/aggregate` on orders by escrow state when held orders pass about 1,000.
- **Two-person approval for large refunds or payouts** was on the "later" list in the plan, and isn't built. Today one person with `money.manage` can retry and release.
- **Live payments:** payments are still in test mode on the live deployment (no `PAYSTACK_SECRET_KEY`). The reconciliation screen says so.

## 6. What's next

Phase 6:
- a dashboard with today's numbers;
- global search (order number, email, phone, farm name) from the top bar;
- CSV exports for orders, payouts and customers;
- maintenance mode and app status;
- final checks.
