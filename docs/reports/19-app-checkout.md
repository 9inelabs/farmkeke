# Phase 19: Mobile app checkout (batch B)

Batch B of the app work (build plan section 7). Shoppers can now check out from the app:

- **Delivery:** the order goes to the farms unpaid, and the shopper pays one bill once delivery is priced.
- **Pickup:** the shopper pays now through Paystack in an in-app browser and collects at the farm with a 4-digit code.

Guests can save their details as an account afterwards. Two fixes from the founder's review of phase 18 are also in this report: the location screen's logo, and the chosen toast.

## 1. What was built, by file

### Fixes from the phase 18 review

- `app/(onboarding)/location.tsx`, `src/components/ui/Wordmark.tsx`:
  - The wordmark is centred, as in the design.
  - It now uses one sharp source, 668 x 122, cropped from the website's wordmark. The old 160px image was blurry when scaled up. The `@2x` and `@3x` files are removed.
- `src/components/feedback/ToastHost.tsx` (new) and `src/store/toast.ts` (new): the **Island** toast the founder chose is now the app's only toast.
  - Faster: about 0.25s in and 0.3s out.
  - A new message while one is showing swaps the text in place, with a small pulse, instead of closing and reopening.
  - It can be interrupted mid-exit without a jump.
  - `showToast({ message, tone, action })` works from anywhere. An action is either a link ("View cart") or a callback ("Undo").
  - The four demo motions and `/dev/toasts` are removed, as is the old `AddedToast`.

### Checkout

- `src/features/checkout/draft.ts` (new): what's filled in across the steps (contact, delivery or pickup, address, the unpaid pickup checkout, the last placed checkout). It's kept on the phone, in the same shape as the website's draft.
- `src/features/checkout/useQuote.ts` (new): the cart checked by `checkout.quote` for delivery or pickup in the chosen area. Also `groupByFarm` and `plural`.
- `src/features/checkout/CheckoutShell.tsx` (new): the frame every step shares:
  - a back link that names the previous step;
  - "Step n of 4" with a lime progress bar;
  - the step title, its content, and the main button pinned at the bottom.
  - If the cart becomes empty, it goes back to the cart.
- `app/checkout/index.tsx` (**M-39 Contact**):
  - Name, phone and an optional email, prefilled from `checkout.contactDefaults`.
  - Nigerian mobile numbers are checked the same way as on the website.
  - Guests see "Have an account? Sign in", and a note that only this phone can confirm delivery.
- `app/checkout/method.tsx` (**M-33 Delivery or pickup**):
  - Two option cards. Home delivery is "Priced later"; pickup at the farm is "No fee", with the farms' areas listed.
  - An item a farm only offers one way blocks the other way, with the item named.
  - Delivery needs an area; "Change area" opens Choose your area, which now returns to checkout (`?from=checkout`).
- `app/checkout/details.tsx`:
  - **M-34 Delivery address:**
    - Saved addresses in the area, for signed-in shoppers. The first one is used automatically.
    - Street, landmark, the area with "Change", and a note for the rider (200 characters).
    - "How you'll pay": three steps explaining the bill.
    - Guests without an email give one here, for the bill.
  - **M-35 Drop-off pin:** "Use my location" sets the pin from the phone's position. The pin is optional.
  - **Pickup:** each farm with its area and hand-over hours.
- `app/checkout/review.tsx` (**M-41 Order review**, **M-42 How escrow works**):
  - Contact and delivery or pickup, each with Edit.
  - One card per farm ("Order 1 · …"), with its items and subtotal.
  - A tap-to-open escrow sheet, and the total.
  - The button is "Place order" for delivery, or "Pay ₦…" for pickup.
  - Guests get a guest identity first (`useEnsureIdentity`, new in `src/lib/session.ts`). Each `checkout.place` error has its own message, with a link to the step that fixes it.
  - If the cart changed, it goes back to the cart and its changes sheet.
- `app/checkout/pay/[checkoutId].tsx`, the payment screens:
  - **M-43 Payment method:** card, bank transfer or USSD, under the total and "Held safely".
  - **M-44 In progress:** "Confirming your payment". It asks Paystack every 4 seconds, and moves to M-46 after 30 seconds.
  - **M-45 Failed:** the reason, "Try again", and "Change payment method".
  - **M-46 Waiting for your bank:** it checks every 15 seconds, and has "Check again".
  - **Expired** and **not found** states.
- How the payment opens:
  - **Live payments:** `payments.checkout.start({ returnTo: "app" })` opens Paystack in an in-app browser (`expo-web-browser`). The backend's existing return page sends the shopper back to `farmkeke://checkout/pay/<id>`, which closes the browser.
  - **Browser preview:** Paystack opens in a new tab, and the screen waits for the answer.
  - **Test mode:** "Pay now (test)" calls `markPaidTest`. When payments are neither live nor in test mode, the screen says so and the button is off.
  - **Once paid:** the checkout screens are closed and the confirmation opens.
- `app/order-placed/[checkoutId].tsx` (**M-47 Order placed**, **M-49 Save your details**):
  - A lime tick and "Order placed. Thank you, Ada".
  - The orders, with "Held safely" or "Bill coming soon"; "Bill ready" when the delivery bill has arrived.
  - What happens next, "Track your orders" and "Continue shopping".
  - The cart is cleared once paid (pickup) or placed (delivery).
  - Guests can save their details: email plus password. This runs `startGuestClaim`, then sign-up, then `claimGuestOrders`.
  - If the email already has an account, "Sign in instead" keeps the claim. Signing in then moves the orders over (`src/store/claim.ts`, `src/features/auth/useGuestClaim.ts`, used by Sign in and Create account).
  - Swiping back is off on this screen.
- `app/(shop)/cart.tsx`: Checkout opens the new flow; the old holding screen is removed. Remove now shows "… removed · Undo" (M-30 "remove with undo").
- `src/lib/phone.ts` (new): `validPhone` and `displayPhone`.
- `src/components/icons`: Send, Copy and Share added.
- `package.json`: `expo-web-browser` ~57.0.3.

## 2. Deviations from the spec and why

- **No time slots or pickup points** (M-36, M-37, M-38), per report 16:
  - The note for the rider says when suits the shopper.
  - Pickup is at each farm.
- **M-35 has no draggable map.** The app has no map library, and installing one (`react-native-maps`) needs native keys and a build. "Use my location" sets the exact spot instead, and the street and landmark carry the rest. A map can come later.
- **M-48 Notification permission primer** is left for batch F, with push notifications. Asking for permission before push is set up would be an empty promise.
- **Contact comes first for everyone**, as on the website, so signed-in shoppers confirm their phone number for this order.
- **"Track your orders"** opens the Orders tab. The order screens arrive in batch C.

## 3. Bugs found and fixed

- The "Order placed" screen stayed on its loading skeleton forever when the order couldn't be found. `live ?? kept` turned the query's `null` into `undefined`. It now shows "We couldn't find this order".
- The error box on review mixed plain text and a link inside a `View`. On a phone that crashes ("Text strings must be rendered within a Text"). Both are now inside one `Text`.
- "Have an account? Sign in for faster checkout" wrapped awkwardly at 390pt; it's now one line.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and used Playwright at 390 x 844. With two farms in the cart, I went through:
  - Contact: empty, then errors, then filled.
  - Delivery or pickup.
  - The delivery address: empty with errors, then filled with the bill email.
  - Review for delivery, including the escrow sheet.
  - Pickup: the farms, then review with "Pay ₦7,700".
  - Pay and order-placed for a checkout that doesn't exist.
  - No console errors on any screen.
- **Not run: placing an order or paying.** The preview talks to the live backend, so pressing "Place order" or "Pay" would create real orders and notify the farms. A local backend couldn't be downloaded here (GitHub releases are blocked).
  - These screens call the same functions, with the same arguments, as the website's checkout, which is in use.
  - They are typechecked against the generated Convex API.
- The Island toast was recorded in the browser and checked frame by frame:
  - In: about 8 frames at 30fps. Out: about 9 frames.
  - A second add while it's open swaps the text in place.

## 5. Open questions or decisions that had to be guessed

- **May I place one test order on the live backend?** A pickup order paid with "Pay now (test)" would exercise place, pay and the confirmation end to end. It would show in the admin portal and notify the farm, so it needs your go-ahead, or a separate test deployment.
- **A map for the drop-off pin (M-35).** It would need `react-native-maps`, plus Google Maps keys for Android. Worth adding before launch?

## 6. What's next

Batch C, orders:

- M-60 to M-66, M-71 and M-72: order list and tracking, paying the delivery bill in the app, the pickup code, confirming receipt, and refunds.
- "Track your orders" and notifications will open real order screens.
