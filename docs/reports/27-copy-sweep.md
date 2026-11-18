# Phase 3: Wording sweep for the Paystack split

Date: 18 November 2026

Phases 1 and 2 changed how money moves: Farmkeke no longer holds shoppers' money, every order is paid after the farm accepts, and problems are reported within a day of delivery. Phase 3 brings every word the shopper, farmer and staff read in line with that:

- the website;
- the app;
- the Admin Portal;
- the emails;
- in-app notifications;
- the help content.

"Held safely", "escrow", "confirm receipt", "released to the farm" and "payouts" are gone from everything a person reads. Refund timing is "3 to 10 working days" everywhere.

## 1. What was built, by file

### Website: pages

- **`/escrow` moved to `/buyer-protection`** (`src/app/(site)/buyer-protection/page.tsx`).
  - The page is rewritten.
  - The flow: the farm accepts, you pay, you check everything, a day to report.
  - What happens when things go wrong: not charged, we look into it, a full or part refund, and 3 to 10 working days for a refund to show.
  - "Good to know" points.
- **Redirects** (`next.config.ts`):
  - `/escrow` goes to `/buyer-protection`;
  - `/orders/:id/released` goes to `/orders/:id`;
  - both are permanent.
- **Routes and links**: the route is renamed `buyerProtection` in `lib/routes.ts`, and the footer, sitemap, product page, help centre, how-it-works and shop page are updated.
- **Home page** (`(site)/page.tsx`): description, FAQs, trust row, "Buyer protection" card, the four steps, the farmer document list and the hero mock-ups.
- **Other public pages** (`how-it-works`, `sell`, `about`): the steps, the delivery and pickup tables, order statuses, and the farmer flow ("Get paid when the buyer pays").
- **Site-wide description** (`layout.tsx`), shop and category pages, cart, product page and sign-in panels (`AuthLayouts.tsx`): "you pay only once the farm accepts".
- **Help centre** (`components/site/HelpCenter.tsx`):
  - new "When do I pay?" and "What protects me" answers;
  - the farmer-paid, refund-timing and problem answers are rewritten;
  - "I already confirmed" becomes "It's been more than a day".

### Website: checkout and orders

- **Checkout review**: "Place order" for pickup too (not "Pay ₦X"), the nothing-to-pay note, and a "Buyer protection" panel.
- **Checkout details**: pickup copy, plus an email field for guests (see section 3).
- **Checkout contact**: wording updated.
- **Order-placed and pay pages**: the pickup steps include the bill; "₦X paid" instead of "held safely".
- **Order page**: view-only text, the payment line and the cancelled-order refund timing.
- **Problem, problem-sent, find-order and review pages**: wording updated.
- **Refund page**: 3 to 10 working days; "Refunded by Farmkeke" instead of "Released to the farm".
- **Removed**: the "Payment released" page (`(focus)/orders/[orderId]/released`) and its route.
- **Guest-orders and account-created notes**: wording updated.
- **Farmer terms** (`content/legal/farmer-terms.json`): "payouts" becomes "getting paid", and the section is now "Payment and commission". Synced to the app.

### Admin Portal

- **Rules page**: "Shoppers can report a problem for … hours" replaces "Delivered but not confirmed"; the farm-deadline and decide-time notes are updated.
- **Other pages**:
  - Problem reports list: description;
  - Refunds: 3 to 10 working days;
  - Dispatch: the delivered-step note;
  - Reconciliation: header comment.
- **Labels**:
  - audit labels for the new actions (forgive debt, Paystack retry);
  - the application "payout" section is now "Bank account".
- **Permission and role descriptions** (`convex/lib/permissions.ts`): no escrow, release or payout wording.

### App

- **Onboarding**: the third welcome slide and the "Pay safely" line.
- **Checkout review**:
  - "Place order" for pickup;
  - a "Buyer protection" card and sheet (was "How your money is protected");
  - the missing-email message.
- **Checkout details**:
  - pickup copy;
  - an email field for guests on pickup (see section 3);
  - the delivery bill steps.
- **Other checkout and order screens** (contact step, order-placed, find order, refund, problem, problem-sent, dispute and review): wording; refunds show "Refunded by Farmkeke", 3 to 10 working days, and contact support after 10.
- **Shared components**: `EscrowCard` is renamed `ProtectionCard` ("Buyer protection"), used on Home, the product page and the dev gallery.
- **Shopper screens** (problem form, pay flow, orders list, account menu, notifications empty state): wording updated.
- **Farmer screens** (order steps, completed-orders empty state, problem banner, push primer sample, bank account toast, support screen, sell pages): wording updated.
- **Help content**:
  - `src/content/help.ts`: new FAQs on when you pay, when the farmer is paid and what protects you; the "How Farmkeke works" steps are rewritten.
  - `src/content/farmerHelp.ts`: getting paid and refund debts.

### Emails (`convex/lib/emails.ts`) and notifications

- **Welcome**: the four steps.
- **Order placed or paid**:
  - "Nothing to pay yet" before payment, and "₦X paid. Paystack has sent each farm its share" after;
  - a farm that doesn't accept means "you aren't charged".
- **We've got your order**: delivery and pickup versions.
- **The bill**:
  - works for pickup (no delivery row);
  - it no longer says "held safely".
- **Accepted, preparing, on its way, ready for pickup**: "report it within a day" replaces "confirm receipt".
- **Delivered or collected**: rewritten. It gives the time the order closes ("Report a problem by …").
- **Farm didn't accept**:
  - an unpaid version ("You weren't charged"), used for every order since the split;
  - the paid version keeps the refund.
- **Problem received, decision and refund sent**:
  - no held money;
  - Farmkeke sends refunds;
  - 3 to 10 working days, and contact support after 10.
- **Farmkeke cancelled**: the refund comes from Farmkeke, in 3 to 10 working days.
- **Pickup window ended, account deletion and guest orders**: no held money or confirm wording.
- **Farm emails:**
  - New order: "When they pay, Paystack sends your share straight to your bank".
  - Order ended: "The shopper wasn't charged".
  - Problem reported: "your part may come off your next orders".
  - Decision: what the farm owes back, from the refund's `farmDebtKobo`.
  - Bank account changed: renamed from "payout account".
- **Removed**: the "Thanks for confirming / payment released" email and its `order_completed` mapping. Nothing sends it since phase 2.
- **`notifications/store.ts`**: passes `unpaid`, the delivered email's report-by time, `pickup` for the received email, and the farm's debt for the farm decision email.
- **In-app notifications**: problem report opened, farm declined after payment, Farmkeke cancelled, bank account changed, and the alert group description.
- **`scripts/render-email-previews.mjs`**: samples updated. All 49 previews in `farmkeke-docs/email-previews/` were re-rendered; the stale previews (confirm reminder, payment released, payouts) are gone.
- **`crons.ts`**: the refund resend job is renamed.
- **Code comments**: comments that described the held-money model are updated (`orders/system.ts`, `disputes.ts`, `lib/orders.ts`, `schema.ts`, `accountsInternal.ts`).

### Tests

- **`convex-tests/emails.test.ts`**: the delivered email has the new subject, gives the report-by time, and mentions neither held money nor confirming receipt.

## 2. Deviations from the spec and why

- **The plan counted 41 "held safely" places.** I searched for every variant ("held", "escrow", "confirm receipt or delivery", "release", "payout", the old refund timings) and changed everything visible. The final search finds nothing in visible copy.
- **Internal names kept.** The `escrow` order field, the `payout` application-section key, `/farm/payout-account` and the `onboarding-escrow.jpg` file name stay as they are. Renaming them would mean a migration or broken links for no visible gain.
- **Policy dates not changed.** The farmer terms wording changes ("getting paid", "Payment and commission") don't change any rules, so the "updated" date stays 17 November 2026.

## 3. Bugs found and fixed

- **Pickup checkout said "Pay ₦X" (app and website).** Since phase 1, pickup orders are placed unpaid and billed after the farm accepts. Both checkout review screens now say "Place order" and explain the bill.
- **Pickup guests could hit a dead end on a missing email.** Pickup orders need an email for the bill while texts aren't sending. The pickup details step had no email field, so the "Add your email" link led nowhere. The website and the app now ask guests for an email on the pickup details step, as delivery does.
- **The "We've got your order" email said "Delivery is priced once a rider is arranged" for pickup orders.** Since phase 1, pickup orders get this email too. It now has a pickup version.
- **The bill email showed a ₦0 delivery row** and said "delivery included" for pickup bills. Both are now shown only when there is a delivery fee.
- **The "farm didn't accept" email promised a full refund** for orders that were never paid. It now says the shopper wasn't charged.
- **Stale build types**: `web/.next` was left over from yesterday's build attempt and broke `tsc` after the page moves. It was removed (it isn't committed).

## 4. Verification

- `cd convex-tests && npx vitest run`: 15 files, 100 tests passed.
- `npx tsc -p convex --noEmit`: no errors.
- `npx tsc --noEmit` (the app): no errors. `--noUnusedLocals` was also run over the changed files: the only finding is an unused `View` import in `app/checkout/index.tsx`, which was there before this phase.
- `cd web && npx tsc --noEmit`: no errors.
- `cd web && npx eslint src`: no errors (the one existing warning in `adminOps.ts`).
- `node scripts/render-email-previews.mjs`: 49 emails rendered. A search of the output for held, escrow, confirm receipt, released to, payout and "few working days" finds nothing except a file name.
- `node scripts/sync-legal.mjs`: 7 legal documents copied to the app.
- **Final search** of `app`, `src`, `web/src` and `convex` for "held safely", "stays held", "until you confirm", "confirm receipt or delivery", "before you confirm", "I received everything", "5 to 10", "7 working days", "few working days", "escrow protection" and "released to": no visible copy left. The only remaining hit is the old audit label for staff releases made before the split.

## 5. Open questions and guesses

- **Onboarding slide title.** It stays "Your money stays safe". The body now reads "You only pay once the farm accepts, and we step in if anything arrives wrong", which fits the slide's fixed layout. A new title would need checking against the design.
- **Refund follow-up.** Refunds now point shoppers to support after 10 working days (it was 7), to match the 3 to 10 day range.
- **Hero mock-up badge.** On the home page mock-up, the badge reads "Farm accepted" instead of "Held safely".

## 6. What's next

- **Phase 4, checks:**
  - a full website build where Convex is reachable;
  - a look at the new and changed pages on a phone;
  - one Paystack test-mode payment end to end, checking the split and the subaccount;
  - a test refund, checking the farm debt;
  - a delivered order closing after a day.
- **Deploy order:** Convex first, then the website and an app build. The redirects in `next.config.ts` take effect with the website deploy.
