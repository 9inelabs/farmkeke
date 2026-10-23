# Phase 22: Mobile app farmer mode (batch E)

Batch E of the app work (build plan section 7). Farmers can now run their orders and money from the app:

- see what needs doing on the dashboard, with live figures;
- accept or decline new orders, prepare and pack them, and hand them to a rider;
- take the buyer's pickup code at the farm;
- reply to a problem report;
- chat with buyers;
- see earnings, activity and payouts, and change the payout account;
- read their reviews.

The farmer screens share a new, quieter "console" look:

- a grey canvas with white cards;
- one dark forest card per screen for the main figure or the next step;
- large numbers, and short labels.

Every screen uses existing Convex functions; there are no backend changes.

## 1. What was built, by file

### Shared farmer pieces

- `src/features/farm/ui.tsx` (new): the farmer building blocks:
  - `FarmHeader`, `Section`, `Card` and `Hero` (the dark card with a large figure and up to three smaller ones);
  - `Tile` and `Countdown` ("21h 14m left", amber under 6 hours and red under 2);
  - `FarmOrderRow`, `LinkRow`, `MoneyLine` and `EmptyCard`;
  - `TabStrip`: scrolling tab pills with counts, the chosen one in forest;
  - `RoundButton` and `Fact` (a small label over a value).
- `src/features/farm/status.ts` (new): the farmer's tabs and their order, each order state in the farmer's words, and the decline reasons.
- `src/features/farm/money.tsx` (new): a ledger row (released, fee, paid to bank) and a payout row.
- `src/lib/useNow.ts` (new): the time, ticking once a minute, for countdowns.
- `src/components/ui/BottomSheet.tsx`: sheets now rise above the keyboard, for the decline note and the pickup code.
- `src/features/chat/ChatThread.tsx`: `startAtTop` opens a thread on its header instead of the newest message. Both problem-report screens use it, so the case details show first.
- `src/features/chat/MessagesScreen.tsx` (new): the Messages list, now shared by shoppers (`/messages`) and farms (`/farm-messages`).

### Tabs

- **F-10 Dashboard** (`src/features/farm/DashboardView.tsx`, `app/(farm)/dashboard.tsx`):
  - The greeting and the farm's name, with the bell (farm notifications, F-11).
  - Setup progress until it's done, and a note while holiday mode is on.
  - "Held for you", with New, To prepare and Out counts.
  - Tiles for rating, unread chats and low stock. Each one opens its screen.
  - "Needs your reply", each with its countdown, and "To prepare".
  - Listings running low, and "Add a listing".
- **F-40 Orders** (`src/features/farm/OrdersView.tsx`, `app/(farm)/sales.tsx`):
  - Tabs with counts: New, To prepare, Out, Completed, Disputed and Cancelled.
  - New orders show the time left to reply; the rest show where they're up to.
  - The Orders tab icon carries a badge for new orders (`app/(farm)/_layout.tsx`).
  - A Messages button in the header has a dot while chats are unread.
- **F-60 Earnings** (`src/features/farm/EarningsView.tsx`, `app/(farm)/earnings.tsx`):
  - "Total earned", with the last payout, and Held, Sending and Paid out.
  - A warning when a payout couldn't be sent.
  - Links to the payout account, all activity and payouts.
  - The latest activity, and recent payouts.
  - A line on Farmkeke's fee, from the live commission rate.
- **Farm** (`app/(farm)/farm.tsx`), restyled:
  - The farm card.
  - Settings, Money (payout account, payouts, activity), Buyers (reviews, messages, notifications) and Help.
  - Switch to shopping.
  - The old "contact support to change your bank" note is gone; the account is now edited in the app.
- **Listings** (`app/(farm)/listings.tsx`): the same canvas, tab strip and white cards. Nothing about how it works changed.

### Order screens

- `app/farm-order/[id]/index.tsx`, `src/features/farm/FarmOrderView.tsx`: **F-41 to F-47**, one order:
  - The number, when it was placed, its state, delivery or pickup, and the countdown while it's new.
  - A dark **Next step** card with a five-part stage bar: Accept, Prepare, Pack, Ready, Hand over.
  - After the hand-over the same card says where things are: on its way, waiting for the buyer, or complete.
  - **You earn**: products, Farmkeke's fee and its percentage, and whether the money is held, not paid yet, or paid out.
  - The items, with a link to the packing slip.
  - The buyer's first name and phone, and the delivery area or "at your farm" with the collect-by time.
  - The rider, with Call, once one is assigned. Call and Message the buyer.
  - The order's history, from "Order received" to "Paid to you".
  - Contact support.
  - A problem report shows a red card that opens the case. Declined, expired and cancelled orders say what happened.
  - The step's button is pinned at the bottom:
    - Decline and Accept order;
    - Start preparing;
    - Mark as packed;
    - Ready for rider, or Ready to collect;
    - Hand over;
    - Enter pickup code;
    - a "Waiting for payment" bar while a delivery bill is unpaid.
  - Each step confirms with the Island toast. Errors are in plain words: the time to reply has passed, the order has already moved on, or selling is paused.
- `src/features/farm/OrderSheets.tsx` (new):
  - **F-42 Decline:** out of stock, can't prepare in time, or something else. A note is needed for "something else". The sheet says whether the buyer is refunded or wasn't charged.
  - **F-45 Hand to the rider:** the rider's name and phone, and every item to tick. Confirm stays off until all are ticked.
  - **Pickup code:** four digit boxes. The code is checked as soon as the fourth digit is in. A wrong code, or too many tries, gets a clear message.
- `app/farm-order/[id]/slip.tsx`, `src/features/farm/SlipView.tsx`: **F-49 Packing slip**:
  - A paper-style card: the farm, order number, buyer, area and the items.
  - Each line can be ticked while packing ("1 of 2 packed").
  - Share sends it as text.
- `app/farm-order/[id]/chat.tsx`: **F-83 Order chat** with the buyer, with photos. The order sits at the top.
- `app/farm-messages.tsx`: **F-83 Messages**, every buyer chat.
- `app/farm-dispute/[id].tsx`, `src/features/farm/DisputeView.tsx`: **F-48 Problem report** (the `/farm-dispute/<id>` link in notifications):
  - The case, the amount in question, and "Reply needed" with a countdown.
  - **Your reply:** Agree, Partly or Disagree; a note; up to six photos. It's sent once, with `disputes.respond`.
  - What the buyer reported, your reply once sent, the timeline, and Farmkeke's decision.
  - Messages with the buyer and Farmkeke support.

### Money and reviews

- `app/farm/transactions.tsx`: **F-61 Activity**, every release, fee and payout, loading more as you scroll.
- `app/payouts/index.tsx`: **F-63 Payouts**.
- `app/payouts/[id].tsx`, `src/features/farm/PayoutView.tsx`: **F-63 Payout detail** (the `/payouts/<id>` link in notifications):
  - The amount and its state, and "Test payout" when it was simulated.
  - The bank, the date, and the reference, which can be copied.
  - Each order it paid, with products, fee and amount, and the totals.
- `app/farm/payout-account.tsx`: **F-62 Payout account** (the `/farm/payout-account` link in notifications):
  - The current account on a dark card.
  - Choose the bank and type the 10 digits. The account is then looked up with the bank (`payments.bank.resolveAccount`), and the account name appears with a tick.
  - When payments aren't live there's no lookup, so the farmer types the name.
  - Save uses `savePayoutAccount`, which also texts the farmer.
- `app/farm/reviews.tsx`, `src/features/farm/ReviewsView.tsx`: **F-80 Reviews**:
  - The average and its stars, and bars for how many of each star.
  - Filters for All and each star count.
  - Each review: stars, date, comment, tags, and who and which order (it opens the order).

### Other

- **F-11:** the bell opens the notifications on the farm side (`/notifications?side=farm`, from batch D).
- `app/dev/farm.tsx` (new): the farmer screens with sample data, for checking in the browser preview without a farmer account.
  - Open `/dev/farm`. The chips at the top switch screens.
  - The sample order's steps work on that screen (the pickup code is 4821).
  - Nothing there touches the backend.

## 2. Deviations from the spec and why

- **Short labels throughout,** as asked: "Held", "Sending", "Paid out", "Reply needed". Explanations sit in one short line under a title, not in paragraphs.
- **The buyer's street address isn't shown to the farm.** The farm sees the area and the buyer's first name and phone. The rider has the address. This matches what `orders.farmer.get` is meant to share (F-44).
- **Pickup at the farm uses the buyer's 4-digit code,** entered by the farmer (`confirmCollection`), not a QR scan. Scanning would need the camera library and a native build. Typing four digits is just as quick.
- **The dispute reply stance** has three short choices (Agree, Partly, Disagree). The backend stores agrees, partly and disagrees, and the shopper sees "Agrees to refund", "Partly agrees" or "Disagrees".
- **"Total earned"** on Earnings is money released to the farm after Farmkeke's fee. Money still held is shown beside it, not added to it.
- **Listings** only got the new look. Its behaviour is unchanged from the earlier listings phase.

## 3. Bugs found and fixed

- **Shoppers saw a raw code when a farm declined.** The order screen said `The farm said: "out_of_stock"`, because the backend stores the reason as a code. It now says "The farm ran out of what you ordered", or "The farm couldn't prepare it in time". For "something else" the screen just says the farm couldn't take the order, as the farm's note isn't shared with the buyer. The batch C sample now uses a real code.
- **A declined order still said "You earn ₦10,260" and "Payment: Paid".** Found in the sample screenshots. Ended orders now hide the earnings card, and the payment line says "Refunded" or "Not charged".
- **After a hand-over the order screen went blank at the top.** There was nothing more for the farm to do, so the next-step card disappeared, and with it any sign of where the order stood. It now shows "On its way", "Waiting for the buyer" or "Order complete".
- **The problem report opened scrolled to the newest message,** past the reply form. This showed only in the browser preview, because the chat list starts at the bottom. Both case screens, the farm's and the shopper's, now open at the top.
- **A notification link to a case with a malformed id** made the server reject the query. The farm case screen now checks the id's shape first, and its error boundary shows the same "We couldn't open this case" screen for anything the server refuses. Checked with a made-up id in the preview.
- **Text fields in bottom sheets sat behind the keyboard** on phones; sheets had no keyboard handling. Sheets now rise with the keyboard.
- **On the Dashboard, Earnings and Farm tabs, content slid under a fixed title,** which looked cut off. The title now scrolls with the page. Orders keeps its title and tabs fixed, so the tabs stay in reach.
- **Smaller fixes found in screenshots:** the bank row on Earnings cut the bank's name short, so it's now "Payout account" with the bank as its value. The "All" review count showed "99+"; counts now go to 999. The unpaid-bill title wrapped onto two lines and is now "Bill sent to the buyer".
- **The preview server** wasn't running at first. It was restarted; this was not an app bug.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 8 files, 53 tests passed.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and used Playwright at 390 x 844.
- **On the `/dev/farm` sample screens:**
  - Dashboard, and scrolled.
  - Orders, with counts.
  - A new order, scrolled through all of it.
  - The decline sheet; then Accept, which moved the order to Preparing, showed the toast, and updated the history.
  - Packing.
  - Hand to rider, before and after ticking the items.
  - Pickup: a wrong code ("That code isn't right") and the right one ("Collected").
  - Unpaid bill, Declined, Disputed.
  - Packing slip.
  - The case reply.
  - Earnings, and scrolled.
  - Payout detail.
  - Reviews.
  - No console errors on any of them.
- **On the real routes while signed out,** each showed its own empty or "couldn't open" screen, not an error:
  - `/farm-order/notanid` and its slip and chat;
  - `/farm-dispute/notanid`, and a well-formed id that isn't a case;
  - `/payouts` and `/payouts/x`;
  - `/farm/transactions`, `/farm/reviews` and `/farm/payout-account`;
  - `/farm-messages` and `/messages`.
  - The only console error was the server rejecting the made-up case id, and the screen handled it.
- **Not run against a real farm.** The preview uses the live backend, and I have no farmer login there and didn't create one. Accepting, declining, the hand-over, pickup codes, replying to a case and saving a bank account were not run against the live backend.
  - These screens are typechecked against the generated Convex API, and call the same functions the backend tests cover.
  - The farm tabs themselves (`/dashboard`, `/sales`, `/earnings`, `/farm`) only open for a farmer, so they were checked through the sample page, which draws the same views.

## 5. Open questions or decisions that had to be guessed

- **A test farm.** Can I have a farmer test account on a test deployment, or permission to make one on the live backend? It would let me run the whole order flow end to end, with the test order asked about in reports 19 to 21.
- **The pickup code by QR scan.** Should farmers be able to scan the buyer's QR code instead of typing it? It needs `expo-camera` and a native build.
- **Showing the buyer's street to the farm** on delivery orders. I kept it hidden, since the rider delivers. Is that right?
- **Low stock** is 3 or fewer units (`LOW_STOCK`), the same as the listings screen. Change it?

## 6. What's next

Batch F, notifications (M-48, M-88, F-12 and F-75 in the build plan):

- the permission primer, and notification preferences for shoppers and farms;
- Expo push tokens and deep links, so new orders, bills and messages reach the phone and open the right screen.
