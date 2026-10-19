# Phase 5 - Closing the website's backend gaps

Date: 19 Oct 2026
Brief: the 20 gaps in `web/BUILD-STATUS.md` "Backend gaps found", built in `convex/` and on the website together, with each website workaround removed.

Result:

- 19 gaps closed, 1 closed with a deviation (W-51c: linking by email, not phone). Two older items stay open (see section 5).
- Only arguments, fields, indexes and functions were added. All 283 live functions and 7 HTTP routes keep their names and arguments. The app's calls still work unchanged.
- **Nothing was deployed.** No `convex dev`, `convex deploy`, `convex env set`, or `convex run` on a mutation or action. `npx convex codegen` was run.
- The run was interrupted once (the computer shut down). A half-written `convex/disputes.ts.tmp.*` was compared with `convex/disputes.ts`: its one missing line (storing `itemQuantities` when a line is partly affected) was added, and the temp file deleted.

## 1. What was built, by file

### Backend

- `convex/schema.ts` (all optional, added):
  - `orderAddress.note`; `addresses.directions`; `accountDeletions.reason`; `listings.soldOutAt`, `restockedAt`; `farmStats.replyMinutes`; `paymentAttempts.startedAt`; `conversations.awaitingFarmSince`; `reviews.itemRatings`; `favorites.notify`, `notifiedAt`, `lastSeenAt`; `supportTickets.listingId`, `farmId`; `users.guestLinkToken`, `guestLinkExpiresAt`; `platformSettings.slotCapacity`, `slotCapacities`; `disputes.itemQuantities`, `farmStance`.
  - `disputes.reason` gains `short` and `other` (new `disputeReason` validator); new `disputeStance`.
  - New indexes: `orders.by_window_day_and_address_serviceAreaId`, `orders.by_contact_email`, `users.by_guestLinkToken`, `favorites.by_listingId_and_notify`.
- `convex/checkout.ts`:
  - `quote` farms add `responseTimeHours` (median, null with no history) and `acceptsWithinHours`.
  - `deliveryWindows` takes optional `serviceAreaId`. It keeps `days[].slots` (open slots only) and adds `days[].allSlots` and `allDays`, where every slot is `{ from, to, open, reason?: "full" | "too_soon" }`. Capacity applies only when the area is known.
  - `pickupPoints` takes optional `farmIds` and `now`, and returns `readyDay` per point: the first day the farms can hand over, moved to the point's next opening day.
  - `place`: `address.note` (max 200, `NOTE_TOO_LONG`), stored on the checkout and orders, falling back to a saved address's `directions`; saved as `directions` with `saveAs`. A full slot throws `WINDOW_FULL`; a cart with two farms needs two places.
- `convex/lib/settings.ts`: `slotCapacityReader` (area + slot, then area, then default; null = no limit).
- `convex/admin/fees.ts`: `get` returns the capacities; new staff mutation `setSlotCapacity({ capacity, serviceAreaId?, from?, reason })` (operations, audited).
- `convex/payments/checkout.ts`, `convex/lib/paystack.ts`: attempts store `startedAt`, and the card's brand and last 4 from verify / webhook data, also for failed payments and saved cards. `get.lastAttempt` adds `channel`, `cardBrand`, `cardLast4`, `startedAt`.
- `convex/orders/consumer.ts`:
  - `placedSummary` adds `address` (street, landmark, area, LGA, state, note), `pickupPoint` and `window`.
  - The view-only order (`find`) adds `linkEmailHint` ("a***@gmail.com") and hides the note.
  - New `linkableGuestOrders` (count, email, verified), `linkGuestOrdersByEmail`, `confirmGuestOrdersLink({ token })`, `recentItems({ limit? })`.
  - `moveOrderToAccount` moves an order with its checkout, chat, problem report, refunds and review. `claimGuestOrders` uses it too.
- `convex/lib/orders.ts`: `orderCore.address.note` (farm `orders/farmer.get`, staff); stock changes call `noteStockChange`.
- `convex/admin/dispatch.ts`: `dropOff.note`, `latitude`, `longitude`. `convex/admin/orders.ts`: `riderNote`.
- `convex/lib/passwordProvider.ts`: the `reset` flow takes `returnTo: "web"`. It travels to the email sender as Convex Auth's `redirectTo: "?returnTo=web"`. New exported `resetLink()`: the web link is `${WEBSITE_URL ?? "https://farmkeke.com"}/reset-password?email=&code=`, otherwise the Convex bridge.
- `convex/http.ts`: `/reset-password` tries the app, then goes to the website after 1.5 seconds (cancelled if the page is hidden), with a "No app?" link.
- `convex/account.ts`: `updateProfile` takes optional `phone` (validated by `lib/phone.ts`; "" removes it). A farmer's number can't be taken by anyone, and a farmer can't take a number someone has (`PHONE_TAKEN`, `PHONE_REQUIRED`). `deleteAccount` takes optional `reason` (500 characters), stored on `accountDeletions`.
- `convex/accountsInternal.ts`: `deleteUserData` stores the reason. `replaceEmail` now clears `emailVerificationTime` and any guest-orders link.
- `convex/addresses.ts`: `create` / `update` take `directions` (200), `latitude`, `longitude` (both or neither). Left out on `update` = unchanged.
- `convex/lib/restock.ts` (new), `convex/lib/listingCounts.ts`: record sold out / back in stock, and schedule `favorites.notifyBackInStock` when a listing becomes buyable.
- `convex/favorites.ts`: `list` adds `backInStock`, `notify`, `farmId`, `unitId`. New `markSeen`, `setNotify({ listingId, on })`, internal `notifyBackInStock`: one `back_in_stock` notification per subscriber, then the switch turns off.
- `convex/lib/disputes.ts`, `convex/disputes.ts`:
  - `open` takes reasons `short` ("Less than I ordered") and `other` ("Something else"), and `itemQuantities`. The amount is the value of the affected units, never the delivery fee.
  - New `generateUploadUrl` (rate limited).
  - `respond` takes `stance`.
  - Views add `affectedQuantity`, `affectedUnitLabel`, `affectedKobo` per item, and `farmResponse.stance` / `stanceLabel` (consumer, farmer and staff). Rows add `farmStance`.
- `convex/notifications/store.ts`: one shared `REASON_LABELS`; the problem emails list "Fresh tomatoes: 1 of 2 baskets"; new back-in-stock email mapping.
- `convex/notifications/deliver.ts`: new account email `guest_orders_confirm`.
- `convex/lib/emails.ts`: `guestOrdersConfirmEmail`, `backInStockEmail`, links `product` and `linkGuestOrders`.
- `convex/reviews.ts`: `submit` takes `itemRatings` (validated); reviews return `itemRatings`.
- `convex/support.ts`: `open` takes `listingId` and `farmId` (unknown ids are dropped); `ticketView.about` for staff.
- `convex/storefront.ts`: `categoryListings` and `search` take `subtypes: string[]` (`subtype` kept).
- `convex/chat.ts`, `convex/lib/shop.ts`, `convex/shopStats.ts`:
  - Each farm answer to a shopper's message records the minutes it took.
  - `thread` adds `replyNote` ("Usually replies within an hour" / "within N hours" / "within a day") and `replyTimeMinutes`.
  - `rebuild` backfills the reply times from past messages.
- `scripts/render-email-previews.mjs` and `farmkeke-docs/email-previews/`: `back-in-stock.html`, `guest-orders-confirm.html` (54 emails).
- `web/convex-spec/live-function-spec.json`: 17 entries patched, 8 added (args from the local functions' `exportArgs()`, keys sorted like the live spec). Then `web/src/convex/api.ts` was regenerated.

### Website

- Cart (`CartView.tsx`, `bits.tsx`): "Owerri North · Usually accepts within 2 hours", or "Accepts within 24 hours" with no history.
- W-23 / W-24 (`DetailsStep.tsx`, new `components/maps/PinMap.tsx` and `LetteredPointsMap.tsx`):
  - slots from `allDays`: slots that are too soon are hidden, as in the design's "Today" row; full slots say "Full"
  - a real OpenStreetMap drop-off pin you can drag
  - the note is limited to 200 characters
  - the saved address prefills the note and pin from the backend
  - W-24 has a real map with A, B, C DivIcon pins, and "Ready from …" per point
- W-25 (`ReviewStep.tsx`): sends `address.note`, with messages for `WINDOW_FULL` and `NOTE_TOO_LONG`.
- W-27 / W-29: the pay page already read `cardLast4` / `startedAt`; it now gets them.
- W-30 (`PlacedView.tsx`): uses the server's address and pickup point. It falls back to this browser's checkout only when the backend predates the fields.
- W-42a / W-42b: the reset requests send `returnTo: "web"`.
- W-42 / W-44 (new `GuestOrdersByEmail.tsx`, `AccountCreatedView.tsx`, `OrdersView.tsx`):
  - "We found N earlier orders · Placed as a guest with {email}" → "Add them to my account"
  - W-44 opens the emailed `?link=` once and confirms
- W-51c (`OrderView.tsx`): "Use a***@gmail.com and this order will be added". The card shows only when the order has an email.
- W-43 (`OverviewView.tsx`): Buy again from `recentItems`.
- W-45 (`ProfileView.tsx`): the phone field is editable, with its errors under the field.
- W-46 / W-46b (`AddressesView.tsx`):
  - directions and pin are saved on the address
  - "Set pin" opens an OpenStreetMap pin
  - values in `localStorage["fk.addressExtras.v1"]` are moved to the account once, then the key is deleted
  - `components/account/addressExtras.ts` was removed
- W-47 (`SavedView.tsx`):
  - "Back in stock" comes from the server; tags shown on this visit stay until the page closes, then `markSeen`
  - "Notify me" is a per-item switch (`aria-pressed`)
- W-49 (`DeleteAccountView.tsx`): sends the reason. On `waiting_for_orders` it stays signed in and says the account will be deleted when the orders are done.
- W-53 (`ProblemView.tsx`): real reasons, `itemQuantities`, `disputes.generateUploadUrl`, and the note as typed (no prefixes).
- W-54 (`DisputeView.tsx`): "Fresh tomatoes · 1 of 2 baskets" and "Farm's response: Agrees to refund".
- W-57 (`ReviewView.tsx`): sends the stars per item.
- W-58: already read `replyNote`; it now gets it.
- W-03 / W-05 (`Filters.tsx`, `filters-shared.ts`):
  - several types: `?type=a,b`, checkboxes on W-03, chips on W-05, one active chip each
  - one type is still sent as `subtype`
- W-06 / W-86 (`ContactForm.tsx`, `contact/page.tsx`): `ContactFormFromLink` reads `?farm=` and `?product=` inside `<Suspense>`, shows "About: {product} from {farm}", and sends `listingId` / `farmId`.
- New `components/system/QuietBoundary.tsx`: optional sections that call new functions (Buy again, found guest orders) hide themselves against the old deployment instead of breaking the page.

## 2. Deviations from the spec and why

- **Guest orders: email proof before linking.** Sign-up doesn't verify email (owner's decision: welcome email only). Matching on the account's email alone would let anyone sign up with someone else's address and take their guest orders, pickup codes included. So `linkGuestOrdersByEmail` links at once only when the email is already verified. Otherwise it emails a one-time link (24 hours) to that address, and opening it while signed in adds the orders and marks the email verified. Until then only a count is shown. Phone numbers are never used, as the brief says. Changing the account's email clears the verification and any pending link.
- **W-51c copy.** The design says "create an account with the same phone number" and "Use +234 803 *** 4567". Since linking is by email only, it now says "the same email" and shows the masked email. The card is hidden when the order has no email, because nothing could be added.
- **W-23 too-soon slots are hidden**, as in the design's "Today" row. Only "Full" slots show as closed. A backend without `allDays` still shows "Not available".
- **W-23 also uses the real map** (the brief named W-24 and W-46b), so the drawn placeholder is gone everywhere.
- **Slot capacity counts orders, not drop-offs.** A two-farm cart takes two places, and `deliveryWindows` marks a slot full when this cart wouldn't fit. The default is no limit.
- **W-49 result for "waiting":** there is no designed screen. A short card on the same page says the account will be deleted once the orders are done.
- **"Notify me" is one-shot.** It sends one email (and push), then switches off. Preferences still apply to the email (back-in-stock emails are on by default).

## 3. Bugs found and fixed

- **Existing bug:** `claimGuestOrders` moved orders and checkouts but not their chat, problem report, refunds or review. After claiming, W-54 and the chat list would refuse the account. It now uses `moveOrderToAccount`.
- **Security:** `replaceEmail` kept `emailVerificationTime`. With the new email matching, that would have let a verified account switch to someone else's address and link their orders at once. It is now cleared.
- **Found at runtime:**
  - The rider-note test first looked for a paid order on the dispatch board. The board only lists orders from "ready for rider" on, so the test now readies the order first. This was a test setup problem, not a code bug.
  - The first spec patch wrote argument keys in declaration order, which rewrote 220 lines. The patch now sorts keys like the live spec, so only real changes show (324 added lines, 1 changed).
  - The Bash tool couldn't run heredocs that contain apostrophes, so scripts were written to files first.

## 4. Verification

All commands were run from the repo root unless noted.

| Command | Result |
| --- | --- |
| `npx convex codegen` | Typecheck passed |
| `npx tsc --noEmit -p convex` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `node scripts/check-coverage.mjs` | `Functions: 291/291` (283 live + 8 new public ones added to the local spec), `HTTP routes: 7/7`, extra: `favorites.notifyBackInStock` (internal) |
| `cd convex-tests && npm test` | `Test Files 5 passed (5)`, `Tests 32 passed (32)` (23 existing and 9 new in `phase5.test.ts`) |
| `node scripts/render-email-previews.mjs` | `54 emails written` |
| `npm --prefix web run gen:api` | `wrote src/convex/api.ts` |
| `cd web && npx tsc --noEmit --incremental false` | exit 0 |
| `cd web && npx eslint src` | no problems |
| `cd web && npx next build` | passed, every route built |

The new tests in `phase5.test.ts`:

1. Slot capacity: unlimited by default; at its limit the slot is `full`; the old `days` shape still works; without an area no limit applies; `WINDOW_FULL`; a cancelled order frees its place.
2. The rider note reaches the farm, dispatch and `placedSummary`; `NOTE_TOO_LONG`.
3. Partial quantities: 1 of 2 baskets → ₦4,500, no delivery fee; `INVALID_QUANTITY`; stance "Agrees to refund" on both sides; `generateUploadUrl`.
4. Linking by email only:
   - an order with the account's phone but another email is never offered
   - nothing moves until the emailed token is used; a wrong token is refused
   - once verified, a later order links at once
5. Back in stock:
   - the tag shows after a restock, and `markSeen` resets it
   - Notify me sends exactly one email
6. Item ratings: stored and returned; an invalid index is refused.
7. Reset link:
   - `resetLink` for web (with and without `WEBSITE_URL`) and for the app
   - the real `auth:signIn` reset flow with and without `returnTo`
   - the bridge page has the app link, the website link and the 1.5-second fallback
8. Reads: quote response times, per-point `readyDay` (skips the point's closed Sunday), `startedAt`, `recentItems`, `replyNote` after a 30-minute reply, several subtypes, and a support ticket with the product and farm.
9. Profile phone: invalid, a farmer's number taken, saved normalised, and name-only calls leave it alone.

Not checked in a browser: the new pages and arguments need the deployed backend.

## 5. Open questions or decisions that had to be guessed

- **Wording:**
  - "Disagrees" and "Partly agrees" (only "Agrees to refund" is designed)
  - reply notes over an hour: "within N hours" / "within a day"
  - the W-44 link results
  - the W-46b pin hints
  - the W-49 waiting card
- **Slot capacity has no staff screen yet.** It's set with `admin/fees:setSlotCapacity`.
- **Still open:** a thumbnail for every item in order rows (W-43 / W-44), and a direct shopper-to-farm question thread. W-06 now goes to support with the product attached.
- **The website must ship after the deploy.** It sends new arguments that the current live deployment rejects. New queries are wrapped (`QuietBoundary`) or read defensively.

## 6. What's next

Owner:

1. Follow the Convex safety steps:
   - `git pull`
   - `node scripts/check-coverage.mjs`
   - `cd convex-tests && npm test`
   - `npx tsc --noEmit -p convex`
2. Deploy the backend. The deploy adds four indexes on small tables and no new environment variables.
3. Run `npx convex run shopStats:rebuild` once to fill reply times.
4. Optional: set slot limits with `admin/fees:setSlotCapacity`.
5. Optional: `WEBSITE_URL` (default `https://farmkeke.com`) now also sets the reset links.
6. Refresh `web/convex-spec` from live, then run `npm --prefix web run gen:api`.
7. Then deploy the website.
