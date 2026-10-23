# Phase 20: Mobile app orders (batch C)

Batch C of the app work (build plan section 7). Shoppers can now:

- see their orders and follow each one to the end;
- pay a delivery bill in the app;
- show their pickup code, with a QR code;
- confirm receipt, which releases the money;
- see refunds.

Guests can look up an order placed on another phone. Every screen uses existing Convex functions; there are no backend changes.

## 1. What was built, by file

### Shared

- `src/features/orders/format.ts` (new): dates in Nigerian time, written the way the website writes them ("Sat 17 Oct, 10:41", "17 Oct", "today"), and `shortName` ("Chinedu O.").
- `src/features/orders/status.ts` (new): the shopper's wording for each order status:
  - badges, with a tone for each;
  - the timing line on order cards ("Delivered today, 10:52", "Your bill is ready. Pay now");
  - each status's position on the normal order path, used for the timeline.
- `src/features/orders/steps.ts` (new): the order timeline, the same steps as the website:
  - **Delivery:** placed, accepted, bill, packed, out for delivery (with the rider), delivered, confirm.
  - **Pickup:** paid, accepted and packed, ready at the farm, collected, confirm.
  - **Ended early:** declined, expired or cancelled, with whether money was taken or refunded.
- `src/features/orders/useOrder.ts` (new): loads an order.
  - The owner (account, or the guest's phone) gets the full order from `orders.consumer.get`.
  - After Find my order on another phone, the order is view-only (`orders.consumer.find`).
- `src/features/orders/PickupQr.tsx` (new): the pickup code as a QR code, drawn on the phone with `qrcode`'s encoder and `react-native-svg`.
- `src/components/ui/Timeline.tsx` (new): a vertical timeline. Done steps are ticked in forest, the current step is ringed in lime, and later steps are grey.

### Screens

- `app/(shop)/orders.tsx`: **M-60 Orders** and **M-61 No orders yet**:
  - "My Orders" with an Active / Past switch.
  - **Active cards:** photo, number and farm, date, delivery or pickup, total, status badge, "Held", and the timing line. Delivered orders get a "Confirm" button; ready bills get "Pay bill".
  - **Past rows:** a badge, and the items in short.
  - "Ordered on another phone? Find order" sits at the bottom of both the list and the empty state.
- `app/find-order.tsx`: **M-62 Find my order**: order number and phone number, with clear errors.
- `app/order/[id]/index.tsx` and `src/features/orders/OrderView.tsx`, the order screen:
  - **M-63 Order tracking:**
    - The order number, farm, how it's coming and when it was ordered, with its badges.
    - The "Your bill is ready" banner.
    - The pickup code card: four digits and a small QR code; tap to enlarge.
    - The **Next step** card (dark for delivery). It gives the one action that fits: pay the bill, "I received everything", "I've collected my order", or "Buy again". When that action isn't possible yet, the button is greyed out with a reason.
    - The progress timeline. While the order is out for delivery, a rider card with "Call" sits on that step.
    - Where to collect for pickup: farm, address, hours, "Collect by", Directions and "Call the farm".
    - The items and totals; where it's being delivered; where the payment stands, linking to the refund; and help.
  - **M-71 Order declined or expired:** what happened, in the farm's words when it declined, and whether money was taken or refunded. "View refund" and "Shop similar items".
  - **View-only:** after Find my order on another phone. A notice explains that only the ordering phone can confirm, or an account with the same email. Then the timeline and the items.
- `app/order/[id]/code.tsx`: **M-64 Pickup code**, full screen on forest:
  - big digits and a large QR code;
  - a reminder only to hand the code over when collecting;
  - where to collect and by when.
- `app/order/[id]/confirm.tsx`: **M-65 Confirm receipt**:
  - Every item starts ticked; untick anything missing or damaged, and confirming is blocked.
  - It says how much is released to the farm, and that this can't be undone.
  - "Confirm and release payment" calls `orders.consumer.confirmReceipt`.
- `app/order/[id]/released.tsx`: **M-66 Payment released**: "Thanks for confirming", how much went to the farm, "Buy again" and "Back to my orders".
- `app/order/[id]/refund.tsx`: **M-72 Refund status** (`payments.refunds.forOrder`):
  - The amount and where it's up to: being sent, on its way, or in your account.
  - The timeline: decided, sent, with your bank, in your account.
  - The method and the refund reference, which can be selected and copied.
  - "Not received after 7 working days?"
- **Paying a delivery bill:**
  - `src/features/checkout/PayFlow.tsx` was moved out of the checkout pay route and now works with a checkout id or with a bill's pay token.
  - For a bill, it shows products plus delivery and the "pay by" time.
  - Guests opening a bill link get a guest identity first.
  - Once paid, the owner returns to the order. Someone paying another person's bill sees "Bill paid. Thank you".
  - New states for bills: not ready yet, expired (order cancelled, no charge), and not found.
- `app/pay/[token].tsx` (new) is the bill route: `farmkeke://pay/<token>`, and the `/pay/…` links in bill notifications. `app/checkout/pay/[checkoutId].tsx` is now a thin wrapper.
- `app/order-placed/[checkoutId].tsx`:
  - The "Your bill is ready" banner has a Pay button.
  - "Track your order" opens the order itself when there's only one.
- `app/dev/orders.tsx` (new): sample orders drawn with the real order screen, so each state can be checked in the browser preview without placing orders. Open `/dev/orders`; the states are out for delivery, bill ready, pickup ready, delivered, completed, declined and view-only. Nothing there touches the backend.
- `package.json`: `qrcode` (and `@types/qrcode` for development). `src/types/qrcode-core.d.ts` types the encoder on its own.

## 2. Deviations from the spec and why

- **Report a problem, order chat, disputes and ratings** (M-67 to M-69, M-73 and M-74) are batch D, which is next. Until then:
  - "There's a problem" on Confirm receipt opens an email to support@farmkeke.com with the order number.
  - The order screen's help card offers Help and FAQ, and contacting support.
  - "Rate your order" on Payment released is left out.
- **Pickup points:** there are none any more (report 16). Older orders that used one still show its name on the timeline. New ones show the farm, its address and its hours.
- **M-64 Pickup code** is reached from the code card on the order. It isn't a separate step in the flow, so the code is always one tap away.
- **M-71** is the order screen's own state for ended orders, not a separate route, so notification links (`/order/<id>`) always land in the right place.

## 3. Bugs found and fixed

- The tracking screen's hint under the confirm button ("Available once the order is delivered") was worked out from conditions that didn't match its button. Each case now sets its own hint.
- The order route and the sample page both need the order screen, so it was moved into `src/features/orders/OrderView.tsx`. The route only loads the order.
- During verification the preview server had stopped, so it was restarted. This was not an app bug.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 8 files, 53 tests passed.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and screenshotted it with Playwright at 390 x 844:
  - Orders, empty as a guest.
  - Find my order: empty with errors, then not found.
  - An order that can't be opened, and a bill link that can't be found.
  - The order screen in all seven sample states.
  - No console errors on any of them.
- **Not run against real orders.** The preview uses the live backend, and there are no test orders on it. Confirm receipt, paying a bill and the refund screen are typechecked against the generated Convex API, and call the same functions as the website. Some screens weren't viewed in the browser at all, because they need a real order:
  - the full-screen pickup code;
  - Confirm receipt;
  - Payment released;
  - Refund status;
  - the bill's payment method screen.

## 5. Open questions or decisions that had to be guessed

- **May I place one test order on the live backend, or is there a test deployment I could use?** Either would let these screens be checked end to end: confirm, release, a refund, and a bill. The request from report 19 still stands.
- **Bill links on phones.** Bill links in notifications are app paths (`/pay/<token>`). The links in emails and texts point at farmkeke.com and open the website. Opening the app from those web links needs app links set up for the domain: `apple-app-site-association` and `assetlinks.json`, plus the app's signing details. Set that up before launch?

## 6. What's next

Batch D, after-sale:

- M-67 to M-69: report a problem, problem reported, and the dispute detail.
- M-73: rate and review.
- M-74 and M-75: order chat, and Messages.
- M-87 and M-91: the inbox, and support.

These replace the email links above.
