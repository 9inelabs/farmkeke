# Phase 4: Checks for the Paystack split

Date: 18 November 2026

Phase 4 tests and checks phases 1 to 3 as widely as this container allows:

- new tests for untested money paths;
- release bundles of the app;
- a compile of the website;
- phone-width screenshots of the changed pages;
- a dependency audit.

It found one real money bug, which is fixed and tested. It also found a security advisory on the website's Next.js version.

Two checks couldn't run here, because this container's network can't reach Paystack's website or the Convex deployment. See section 4.

## 1. What was built, by file

- **`convex/lib/bill.ts`**: new `rebillAfterCancel`. When an order in a bill that's already been sent is cancelled before payment:
  - the bill is re-totalled to the orders still to pay for, and the shopper gets a "your bill changed" notification with the same pay link and deadline;
  - if nothing is left, the checkout closes and any open payment pages are abandoned.
- **`convex/admin/orders.ts`**: staff cancel calls `rebillAfterCancel` for unpaid orders.
- **`convex/lib/orders.ts`**, `markCheckoutPaid`: a payment whose Paystack split includes an order cancelled after the payment page opened is now handled:
  - that farm's share, commission and any debt taken are recorded;
  - Farmkeke refunds the shopper in full for that order;
  - the farm owes its share back;
  - the shopper is told.
- **`convex-tests/split.test.ts`**: five new tests (section 4).

## 2. Deviations from the spec and why

- **Two checks couldn't run here.** The plan included a Paystack test-mode payment end to end and a full website build. Both need network access this container doesn't have: Paystack's site and API, and the Convex deployment. What could run is in section 4; what you need to run is in section 6.

## 3. Bugs found and fixed

- **Cancelling one farm's order after the bill went out (money bug).** The bill kept the old total until the shopper opened the payment page. If the shopper had already opened Paystack, they paid the old total, and Paystack's split still sent the cancelled farm its share. The backend only recorded the orders still live, so:
  - the shopper was overcharged for a cancelled order and never refunded;
  - the cancelled farm kept money for an order it didn't fill, with no record of it.

  Both are fixed (section 1) and tested against the live Paystack path.
- **Next.js security advisory.** Next.js 16.4.2 is affected by two moderate advisories: GHSA-mfr8-8qww-v76h and GHSA-vc7v-qv4w-wrv8, both cache leaks around `'use cache'`, which this site uses. They are fixed in 16.4.6. Not changed in this phase (see section 5).

## 4. Verification

- **Tests:** `cd convex-tests && npx vitest run`: 15 files, 104 tests passed. New tests:
  - a farm's order cancelled after the bill: the bill is re-totalled and the shopper told; with nothing left the checkout closes and can't be paid;
  - paid on Paystack after one farm's order was cancelled: the split covered both farms; the cancelled farm's share is recorded and owed back; the shopper is refunded that order in full through Paystack; the ledger is checked;
  - approving a farm creates its Paystack subaccount (live key, stubbed Paystack);
  - a saved-card payment sends `split_code` with `charge_authorization`;
  - the report window: still open a minute before 24 hours, closed a minute after; pickup orders can't be marked "It's arrived".
- **Typechecks:** `npx tsc -p convex --noEmit`, `npx tsc --noEmit` (the app) and `cd web && npx tsc --noEmit`: no errors.
- **App bundles:** `npx expo export --platform android` and `--platform ios`: both bundled (5.7 MB and 5.5 MB Hermes bundles), so there are no bundle-time import or module errors.
- **Website compile:** `cd web && npx next build --experimental-build-mode compile`:
  - compiled successfully, and TypeScript finished;
  - every route is in the route list, including `/buyer-protection`, `/admin/money`, `/admin/money/payments` and `/admin/money/farms`, and no `/escrow` or `/released` routes.
  - The full build (with prerendering) can't run here: prerendering `/shop` needs the Convex deployment, which this network refuses.
  - Next also stops every build and dev start once to show its security warning.
- **Website pages:** `next dev`, then Playwright at 390 px wide:
  - `/buyer-protection`, `/how-it-works`, `/sell` and `/help` have no sideways scrolling and none of the old wording ("held safely", "escrow", "confirm receipt", "until you confirm");
  - `/escrow` returns 308 to `/buyer-protection`;
  - the buyer protection page was checked by eye after scrolling through it, and looks right.
- **Dependency audit:**
  - `cd web && npm audit --omit=dev`: the Next.js advisory above.
  - `npm audit --omit=dev` (the app): 41 findings, mostly in Expo's build tooling (for example zod inside the Expo CLI). The suggested fix is a breaking Expo downgrade, so nothing was changed.
- **Paystack documentation:** fetching paystack.com/docs failed ("host not found"). The split, subaccount and `split_code` calls are tested only against a stubbed Paystack, and are not checked against Paystack's documentation in this phase.

## 5. Open questions and guesses

- **Next.js upgrade.** Upgrading to 16.4.6 is a patch release, but it changes a pinned dependency. It's left for your go-ahead.
- **Paying both the old and the new bill.** When a bill is re-totalled, the old Paystack page (old amount) is not cancelled at Paystack. If a shopper pays both, the second payment shows up under Reconciliation, as any double payment does.
- **Who owes a cancelled farm's share.** When an order is cancelled mid-payment, the farm is charged its share back by default, because it received money for an order it didn't fill. Staff can forgive it under Money, Farm accounts.

## 6. What's next (needs your environment)

- **Paystack test mode, end to end:**
  - set the Paystack test secret key on the dev deployment;
  - approve a test farm, and check the subaccount appears in the Paystack dashboard;
  - place a two-farm order, accept both, and pay with a Paystack test card;
  - check the split in the transaction (each farm's flat share, and the fee shared proportionally);
  - refund one order from Admin, then check the farm's debt and that the next order's share is reduced.
- **Full website build** where the Convex deployment is reachable, for example on Vercel.
- **Deploy order:** Convex first, then the website, then an app build.
