# Website build status

Last updated: 19 Oct 2026

Read `web/BUILD-GUIDE.md` first. It covers the design sources, shared components, the rendering rules, accessibility and motion. This file says what's done, what's left, and who owns what while two sessions work at once.

## Two sessions work at the same time

| Session | Owns | Branch |
|---|---|---|
| Local (owner's PC) | `convex/` (the backend rebuild, phases 3c and 3d), `web/src/app/(shop)/shop/**`, `web/src/app/(site)/**`, `web/src/components/shop/**`, `web/src/components/area/**`, `web/src/components/site/**` | `main` |
| Cloud (Claude Code on the web) | Every remaining screen listed below | `web-remaining-screens` |

**Cloud session rules:**
- **Never edit `convex/`.** Read it only, to learn exact return shapes.
- **Don't edit the files the local session owns.**
- Shared files can be **added to** but should not be rewritten. Shared files are `web/src/components/ui/**`, `components/layout/**`, `components/brand/**`, `lib/**`, `app/globals.css`, `src/convex/api.ts` and `src/convex/returns/common.ts`. List every change to a shared file at the bottom of this file, under "Shared-file changes", so the merge is easy.
- Work and push on the branch `web-remaining-screens`. Don't push to `main`. The owner merges.

## Backend facts for the cloud session

- The Convex source in `convex/` was rebuilt in phases 3a and 3b. It has the same function names and arguments as the live deployment. **It is the source of truth for return shapes.** For example, `convex/orders/consumer.ts` shows exactly what `orders.consumer.get` returns.
  - Reports: `docs/reports/06-ordering-payments-rebuild.md` and `docs/reports/08-after-sale-rebuild.md`.
- Until phase 3d deploys it, the live deployment still runs the older compiled code. Shapes may differ slightly until then, so build against `convex/` and read optional fields defensively.
- Call functions through `api` from `@/convex/api`, which is generated from `web/convex-spec/live-function-spec.json`. Type returns in your own `src/convex/returns/<area>.ts`.
- If you need an argument that's only in the rebuilt code, add a local `makeFunctionReference` in your own file and note it below. Example: the optional `returnTo: "web" | "app"` on `payments/checkout:start`.
- The cloud session has no Convex login. Never run `npx convex …`.

## Done

| Area | Screens | Routes |
|---|---|---|
| Landing and information | Main, W-00, W-60, W-80 to W-87 | `/`, `/sell`, `/how-it-works`, `/escrow`, `/pickup-locations`, `/get-the-app`, `/about`, `/help`, `/contact`, `/legal/[doc]` |
| Shop | W-01 to W-07, W-09, W-09b, W-10 | `/shop`, `/shop/categories`, `/shop/category/[slug]`, `/shop/search`, `/shop/product/[id]`, `/shop/farm/[id]`, area picker, `sitemap.ts`, `robots.ts` |
| System, part 1 | W-S1, W-S3 page, W-S5, W-S6, W-88 | `app/not-found.tsx`, `/maintenance`, `/session-expired`, `ConnectionStatus`, `CookieBanner` |

## Left to build (cloud session)

Build in this order. Commit and push after each group.

### A. Cart, checkout and payment

- **W-08 Mini-cart drawer:** `src/components/cart/MiniCart.tsx`, currently a stub returning null. It's mounted in the root layout and opened with `miniCart.open()` from `@/lib/cart`.
- **W-20, W-20b, W-20c Cart, Cart empty, Items changed:** `/cart` in `src/app/(shop)/cart/`
- **W-21 Contact:** `/checkout`
- **W-22 Delivery or pickup:** `/checkout/delivery`
- **W-23 Address and time / W-24 Pickup point:** `/checkout/details`
- **W-25 Review:** `/checkout/review`, in `src/app/(checkout)/checkout/…`
- **W-26 to W-29 Payment states:** `/checkout/pay/[checkoutId]` in `src/app/(focus)/checkout/pay/[checkoutId]/`
  - `payments/config.get` gives `{ live, testStep }`. In test mode, show "Pay now (test)", which calls `payments/checkout.markPaidTest`.
  - In live mode, `payments/checkout.start` returns `{ accessCode, authorizationUrl, reference }`. Use the Paystack Popup (`https://js.paystack.co/v2/inline.js`, `new PaystackPop().resumeTransaction(accessCode)`), or redirect to the authorization URL. Then poll `verify` and `get`.
- **W-30 Order confirmation:** `/order-placed/[checkoutId]` in `src/app/(focus)/order-placed/[checkoutId]/`
  - Offer guests "save your details as an account": `orders/consumer.startGuestClaim`, then `sessionStorage["fk.guestClaim"]`.
- **Guest checkout:** call `useEnsureIdentity()` before `checkout.place`. One order per farm. The cart lives in the browser (`@/lib/cart`), and `checkout.quote` gives server truth: changes, blockers, fees.

### B. Sign in and your account

- **W-40 to W-42e:** `/signin`, `/signup`, `/account-created`, `/forgot-password`, `/check-email`, `/reset-password`, `/password-changed`, `/link-expired`, in `src/app/(focus)/…`
  - Auth uses `useAuthActions()` with the `"password"` provider. Flows and error codes are in `src/lib/auth.ts` and `convex/lib/passwordProvider.ts`.
  - After sign-in or sign-up, claim guest orders if `sessionStorage["fk.guestClaim"]` is set.
- **W-43 to W-49:** `/account`, `/account/orders`, `/account/profile`, `/account/addresses`, `/account/saved`, `/account/notifications`, `/account/delete`, in `src/app/(account)/account/…`
  - Redirect guests and signed-out users to sign-in.
  - W-49 must warn about orders in progress before deleting. The backend finishes the deletion once they complete.

### C. Orders and after-sale

- **W-50 Find my order:** `/find-order`
- **W-51, W-51b, W-51c Tracking:** delivery, pickup code, and view-only. `/orders/[orderId]` in `src/app/(shop)/…`
- **W-52 Confirm receipt:** a modal
- **W-52b Payment released:** `/orders/[orderId]/released`
- **W-53 Report a problem:** `/orders/[orderId]/problem`
- **W-53b Problem reported:** `/orders/[orderId]/problem/sent`
- **W-54 Dispute detail:** `/orders/[orderId]/dispute`
- **W-56 Refund status:** `/orders/[orderId]/refund`
- **W-57 Rate and review:** `/orders/[orderId]/review`
- **W-58 Order chat:** `/orders/[orderId]/chat`
- **Where they go:** W-52b, W-53b, W-56, W-57 and W-58 are in `src/app/(focus)/orders/[orderId]/…`. The others are in `src/app/(shop)/orders/[orderId]/…`. A small helper already exists: `src/components/orders/format.ts`.

### D. System states, part 2

- **W-S2:** `src/app/error.tsx` and `src/app/global-error.tsx`
- **W-S3:** `src/components/system/MaintenanceGate.tsx` (stub). It redirects to `/maintenance` while `appConfig.maintenanceActive` is on, and never flashes while loading.
- **W-S4:** `loading.tsx` in `src/app/(shop)/`, `(account)/` and `(checkout)/`, using `src/components/system/skeletons/`

## Done when

- Every screen above matches its `farmkeke-docs/design/website/*.dc.html`:
  - word-for-word copy
  - exact CSS values
  - the same structure and icons
  - the 760px phone rules
- These pass in `web/`:
  - `npx tsc --noEmit --incremental false`
  - `npx eslint src`
  - `npx next build`
- `web/.env.local` exists locally and is never committed:
  ```
  NEXT_PUBLIC_CONVEX_URL=https://incredible-wolf-877.eu-west-1.convex.cloud
  NEXT_PUBLIC_CONVEX_SITE_URL=https://incredible-wolf-877.eu-west-1.convex.site
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- Each group gets a short entry in "Progress log" below.

## Progress log

(Cloud session: add a line per group, e.g. "A — done — notes".)

- Phase 4 (local) — done — shop pages W-01 to W-07, W-09, W-09b, W-10 restored to their designs with the Phase 3c data: product cards (farm + verified tick, freshness badge, distance, sold out), farm cards and rows (rating with count, product count, place and distance), W-02 counts and subtypes, W-03/W-04 Type, Harvested, Distance and Top-rated filters with the Nearest sort, W-05 every filter group, W-06 "Ships within", delivery fee for the chosen area, distance, "More from" and subtype, W-07 stats, category chips and delivery/pickup, W-09b phone or email. The chosen area now stores latitude/longitude (`src/lib/area.ts`, optional, backfilled for older saved values).
- **A — done** — W-08 mini-cart, W-20/20b/20c cart, W-21 to W-25 checkout, W-26 to W-29 payment, W-30 confirmation. `tsc` and `eslint src` pass. `next build` compiles and typechecks, then stops prerendering the local session's `/shop` page because this cloud environment's network policy blocks `incredible-wolf-877.eu-west-1.convex.cloud`. Checked at 390px and 1440px in the dev server with browser-only data (cart, mini-cart, checkout steps): no sideways scroll. Payment and confirmation pages need the live backend, so they weren't checked in the browser.
- **B — done** — W-40 to W-42e sign in, sign up and password reset; W-43 to W-49 account pages; the W-52 confirm-receipt modal (used here and in group C). `tsc` and `eslint src` pass. Same `next build` network block as A. Checked at 390px and 1440px: the sign-in, sign-up and password pages (no sideways scroll), and `/account` sends a signed-out visitor to `/signin?next=/account`. The signed-in account pages need the live backend, so they weren't checked in the browser.
- **C — done** — W-50 Find my order; W-51, W-51b and W-51c tracking; W-52 (built in B); W-52b; W-53 and W-53b; W-54; W-56; W-57; W-58. `tsc` and `eslint src` pass. Same `next build` network block. Checked at 390px and 1440px: W-50 matches, and an unknown order id shows the "couldn't open this order" state (no sideways scroll). The other order pages need live order data, so they weren't checked in the browser.
- **D — done** — W-S2 `app/error.tsx` and `app/global-error.tsx` (shared `components/system/ErrorView.tsx`); W-S3 `MaintenanceGate` now covers the page while it redirects, so nothing flashes, and still waits while the config loads; W-S4 `loading.tsx` in `(shop)`, `(account)` and `(checkout)`, using `components/system/skeletons/` (Shop, Account, Checkout). The skeletons use the shared `Skeleton` pulse, not the design's shimmer, because the guide allows no custom CSS animations. `tsc` and `eslint src` pass. `next build --debug-prerender`, which carries on after errors, prerendered all 59 routes. Only `/shop` (local session) failed, on `getaddrinfo ENOTFOUND incredible-wolf-877.eu-west-1.convex.cloud`, because this cloud environment's network policy blocks that host. Run `npx next build` again where Convex is reachable.
- **After D** — merged `main` (phase 3c, phase 3d and the refreshed `api.ts`) into `web-remaining-screens` with no conflicts. Now that the live backend accepts it, the pay page passes `returnTo: "web"` to `payments/checkout.start`. `tsc`, `eslint src` and `next build --debug-prerender` gave the same results as above.
- **Full build** — once Convex was allowed in this environment's network settings, `NODE_USE_ENV_PROXY=1 npx next build` passed: all 59 routes, `/shop` included. The cloud sandbox needs `NODE_USE_ENV_PROXY=1` so Node's fetch uses its proxy; a normal machine just runs `npx next build`. Checked with live data at 390px and 1440px: the cart (a planted price change showed as "Items changed"), delivery or pickup, address and time, pickup point and review. That check fixed three things: "1 item changed since you added it" (it said "them"), the pickup count now names the LGA, and dates show "Mon 26 Oct" in every browser (no comma). No orders were placed, so payment, confirmation, account and order pages still need checking with a test account.
- **Phase 5 (local) — backend gaps closed in Phase 5** (not deployed; the website parts that call new arguments or functions need the deploy). Report: `docs/reports/10-phase5-gaps.md`.
  - W-20 cart "Usually accepts within N hours": `checkout.quote` farms send `responseTimeHours` and `acceptsWithinHours` — closed in Phase 5.
  - W-58 "Usually replies within an hour": `chat.thread` sends `replyNote` and `replyTimeMinutes` from the farm's recent replies — closed in Phase 5.
  - W-23 "Note for the rider": `checkout.place` `address.note` (200 characters), shown to the farm (`orders/farmer.get`) and dispatch — closed in Phase 5.
  - W-23 "Full" slots: `checkout.deliveryWindows` takes `serviceAreaId` and returns `allDays` / `days[].allSlots` with `reason: "full" | "too_soon"`; capacity is `admin/fees.setSlotCapacity` — closed in Phase 5.
  - W-24 "Ready from …" per pickup point (`checkout.pickupPoints` `readyDay` with `farmIds` and `now`) and a real OpenStreetMap map with A, B, C pins — closed in Phase 5.
  - W-27 "Card ending 4081" and W-29 "Transfer started 10:41": `payments/checkout.get` `lastAttempt.cardLast4`, `cardBrand`, `startedAt` — closed in Phase 5.
  - W-30 delivery address and pickup point from `orders/consumer.placedSummary` — closed in Phase 5.
  - W-42 password reset link opens the website (`returnTo: "web"`); the app's bridge page falls back to the website after 1.5 seconds — closed in Phase 5.
  - W-41 / W-42 / W-44 / W-51c guest orders found by email (never by phone): `linkableGuestOrders`, `linkGuestOrdersByEmail`, `confirmGuestOrdersLink` — closed in Phase 5.
  - W-45 change phone number (`account.updateProfile` `phone`) — closed in Phase 5.
  - W-46 / W-46b directions and map pin stored on the address (OpenStreetMap pin); `addressExtras.ts` removed after a one-time move of this browser's values — closed in Phase 5. W-23 uses the same map.
  - W-47 "Back in stock" tag and per-item "Notify me" (`favorites.list` `backInStock` / `notify`, `favorites.setNotify`, `favorites.markSeen`, back-in-stock email) — closed in Phase 5.
  - W-49 deletion result (`{ status }`) and the "Why are you leaving?" reason — closed in Phase 5.
  - W-53 reasons "Less than I ordered" and "Something else", `itemQuantities`, and `disputes.generateUploadUrl`; no note prefixes — closed in Phase 5.
  - W-54 "Farm's response: Agrees to refund" (`disputes.respond` `stance`) and "1 of 2 baskets" — closed in Phase 5.
  - W-57 per-item ratings (`reviews.submit` `itemRatings`) — closed in Phase 5.
  - W-43 "Buy again" (`orders/consumer.recentItems`) — closed in Phase 5.
  - W-03 / W-05 several types at once (`subtypes`; `?type=a,b`) — closed in Phase 5.
  - W-06 "Ask a question": `/contact?farm=&product=` shows "About: {product} from {farm}" and the ticket stores `listingId` / `farmId` — closed in Phase 5.

## Shared-file changes

(Cloud session: list every change to a shared file here.)

- `lib/cart.ts`: added a `lastAdded` memory store. `cart.add` records the item's name, `miniCart.close` clears it, and `miniCart.useLastAdded` reads it, for W-08's "Fresh tomatoes added to your cart".
- `lib/auth.ts`: `Viewer` gains `isGuest?`; `useViewer` treats `isAnonymous || isGuest` as a guest. The rebuilt `users.viewer` returns `isGuest`, not `isAnonymous`.
- `components/ui/Dialog.tsx`: optional `titleClassName`, `headerClassName` and `footerClassName` on `Modal` and `Drawer`. Defaults are unchanged. Used by W-08 for its 20px title and lined header and footer.
- `components/ui/Steps.tsx`: optional `labels` on `CheckoutSteps`. W-24 names step 2 "Pickup".
- `components/ui/Dialog.tsx` (group B): optional `bodyClassName` on `Modal` and `Drawer` to set the body padding (W-52 and W-46b use 32px and 28px).
- `app/layout.tsx` (group B): mounts `<SessionKeeper />` from `components/account/SessionKeeper.tsx` next to the other global pieces. It signs out on the next visit after the browser closes when "Keep me signed in" was unticked (W-40).
- No shared files changed in group C.
- Group D: `components/system/MaintenanceGate.tsx` (the stub assigned to this session) keeps its redirect and adds the full-screen cover; `components/system/skeletons/` is new.
- `components/layout/SimpleHeaders.tsx`: exported `NARROW_WRAP` (1160px, as in the checkout and order designs) and an optional `wrapClassName` on `CheckoutHeader` and `MinimalHeader`. The default is still `wrap`.
- Phase 5 (local): new `components/maps/PinMap.tsx` and `LetteredPointsMap.tsx` (OpenStreetMap, client-only), `components/system/QuietBoundary.tsx`, `components/account/GuestOrdersByEmail.tsx`; `components/shop/bits.tsx` gains `cartAcceptsText`; `components/account/addressExtras.ts` removed; `lib/auth.ts` comment only.

## Backend gaps found

(List anything a screen needs that `convex/` doesn't provide. The local session builds it.)

Still open after Phase 5:

- **W-44 / W-43 order rows, a thumbnail per item:** `orderRow` has only the first item's photo. Rows show it plus a "+N" tile.
- **W-06 "Ask a question" as a farm conversation:** the question now goes to Farmkeke support as a ticket linked to the product and farm (closed in Phase 5, below). A direct shopper-to-farm thread before ordering is still not built.

Every other gap listed here before was closed in Phase 5; see the Progress log.

## Admin Portal (branch `admin-portal`)

The portal is at `/admin` (`src/app/admin/`, `src/components/admin/`). Reports: `docs/reports/10-admin-foundations.md` to `15-admin-dashboard-search.md`. It calls admin functions through `src/convex/admin.ts`, generated from the `convex/` code (`node scripts/local-spec.mjs --only admin/ > web/convex-spec/admin-function-spec.json`, then `npm --prefix web run gen:admin`).

Shared-file changes:
- `src/app/layout.tsx`: MiniCart, AreaPicker, CookieBanner and MaintenanceGate are wrapped in `SiteOnly` (new, `components/system/SiteOnly.tsx`), so they don't run under `/admin`.
- `src/app/robots.ts`: disallows `/admin`.
- `package.json`: `gen:admin` script.

## Delivery billing and farm pickup (Phase 16)

Report: `docs/reports/16-delivery-billing.md`.

- **Home delivery.** The checkout total is the produce only, and orders start unpaid (`placed`). Once the farms accept and staff price each delivery, the shopper gets one bill at `/pay/<token>`, by email, text and in the app. They have 12 hours to pay, and the rider collects only after payment.
- **Pickup.** It is at the farm, paid at checkout. The shopper gets the farm's address and a 4-digit code when the order is ready (`ready_for_collection`). The farmer enters the code to hand it over.
- **No time slots and no pickup points** on the website any more. `/pickup-locations` redirects to `/how-it-works`. The old finder, map and helpers are deleted.
- **Still to do:** connect the SMS provider. Until then, email is required for delivery orders. The mobile app also needs moving to this flow.
