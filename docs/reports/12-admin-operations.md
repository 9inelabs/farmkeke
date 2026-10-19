# Phase 12: Admin Portal operations

Branch: `admin-portal`. This is phase 3 of the Admin Portal plan. Its screens are what operations staff use every day:
- orders;
- the dispatch board;
- riders, with their new profiles and review;
- service areas and delivery fees;
- pickup points;
- the commission and order time limits.

## 1. What was built, by file

### Backend (`convex/`)

- `schema.ts`: rider profile fields on `riders`, all optional, plus new `riderIdType` and `riderVehicle` validators:
  - photo and home address;
  - ID type, number and photo;
  - vehicle type and plate number;
  - guarantor (name, phone, address, relationship);
  - bank (code, name, account number, account name);
  - review status, note, reviewer and review time.
- `admin/riders.ts`:
  - `create` takes an optional `pendingReview`. The portal adds riders switched off and waiting for review; without it, riders are created as before (approved and working).
  - New `get` returns the full profile with photo and ID links, what's still missing, recent deliveries and history.
  - New `saveProfile` (any part of the profile; checks the guarantor's phone, the bank code and a 10-digit account number), `review` (approve or don't approve, with a note) and `banks`.
  - New `pendingCount` for the sidebar badge.
  - Approving needs a complete profile. `setActive` refuses riders who aren't approved.
  - Riders added before profiles existed have no review status and count as approved, so the current dispatch flow is unchanged.
- `admin/uploads.ts` (new): `generateUploadUrl`, for pickup point photos and rider photos and IDs.
- `admin/areas.ts`:
  - Service areas can be renamed (no duplicates within a state), get a new LGA, and get a map position (latitude, longitude, radius). The position is checked to be inside Nigeria.
  - `listAllPickupPoints` now includes each point's `photoUrl`.
- `admin/fees.ts`: `setRules` also sets `pickupHoldDays` (1 to 14 days) and `disputeReplyHours` (1 to 72 hours). Both were already read everywhere through `getRules`, but couldn't be changed before.
- `admin/orders.ts`: new `findByNumber`, which accepts "FK-10234", "fk-10234" or "10234".

### Website (`web/src/`)

New sidebar group "Operations": Orders, Dispatch, Riders (with a badge for riders waiting for review), Areas and delivery fees, Pickup points, Fees and rules.

- `app/admin/(portal)/orders/`:
  - "Needs attention" (`orders.stuck`, each with its reason) and "All orders", filtered by status and by delivery or pickup;
  - find by order number.
- `orders/[orderId]` shows items and totals, the people involved, delivery or pickup details (the pickup code included), money, the timeline, and staff notes (read and add). Its actions:
  - give the farm more time (2 to 48 hours);
  - assign or change the rider;
  - cancel with a full refund;
  - links to the problem report and the order chat (those pages come in phase 4).
- `app/admin/(portal)/dispatch/`: four columns (ready for a rider, with a rider, at pickup points, delivered recently). Each card shows the farm, the drop-off, the shopper, the window, the rider and any "late" flag. Actions:
  - assign or change the rider, with the collection time;
  - record each step; collection by the shopper needs their pickup code;
  - the board refreshes its "late" checks every minute.
- `app/admin/(portal)/riders/`: tabs for working, waiting for review, switched off and not approved. "Add rider" takes the name, phone and areas, then opens the profile.
- `riders/[riderId]`: the profile (photo, ID, vehicle, guarantor, bank account), recent deliveries and history. Actions:
  - "Edit profile" in one dialog, with photo uploads;
  - review: approve, don't approve or withdraw approval, with a list of what's still missing;
  - switch on or off.
- `app/admin/(portal)/areas/`: areas grouped by state, with delivery fee, map position and on/off. Actions: create, edit (name, LGA, fee, map position), turn on or off.
- `app/admin/(portal)/pickup-points/`: cards with hours, phone, how long orders wait, a map link and open/closed. Actions: create or edit (opening-hours editor and photo upload), open or close.
- `app/admin/(portal)/rules/`:
  - the commission (`commission.manage`): set a percentage, or empty to use the 5% default;
  - the four order time limits (`fees.manage`), each with its default;
  - a link to the delivery fees.
- `components/admin/inputs.tsx` (new): `NairaField` (naira in, kobo saved), `HoursEditor` and `PhotoUpload` (to Convex storage, 10 MB limit, images only).
- `convex/returns/adminOps.ts` (new); new labels for order statuses, money states, stuck reasons, vehicles, ID types, rider review and timeline events.

## 2. Deviations from the spec and why

- **No rider app or self-sign-up.** As decided, staff add riders. Rider profiles are reviewed in the portal; a rider must be approved before they show on the dispatch board.
- **Rider bank accounts aren't checked with Paystack.** The farmer flow checks the account name through `payments/bank`; for riders the name is typed in and checked by staff. The rider's bank details are stored for paying riders, which is done outside Farmkeke today.
- **Older riders count as approved.** Riders created before this change (including from the backend tests) keep working, so dispatch doesn't break on deploy. Their profiles can be filled in later.
- **The map position is typed in.** Service areas and pickup points take latitude and longitude as numbers. A map picker can come later.

## 3. Bugs found and fixed

- **Pickup point photos weren't shown when editing.** The list query returned storage ids only, so the edit form had nothing to display. Added `photoUrl` to `listAllPickupPoints`.
- **Day labels:** dispatch and order screens use the site's `isoDayLabel`, not `shortDay`, which shows "Tue, 20 Oct" with a comma in Chrome (found on the website earlier).
- **Order timeline wording:** "consumer" now reads "shopper".
- **Test setup:** the order-search test first inserted incomplete orders; convex-test checks inserts against the schema, so it now builds a complete farm, checkout and order.

## 4. Verification

- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **32 passed, 1 failed.** The failure is the same `storefront.test.ts` Windows-path sample test as before.
- New test in `convex-tests/admin.test.ts`:
  - **service areas:** rename, refusing duplicates, map position outside Nigeria refused;
  - **order rules:** the new pickup hold and problem-report reply limits, out-of-range values refused; Operations can't change the commission;
  - **rider review:**
    - a new rider is added for review and counted;
    - can't be switched on or approved while incomplete;
    - a bad account number is refused;
    - a complete profile is saved (plate in capitals, bank name filled in) and approved, which switches the rider on;
    - riders added the old way are approved;
  - **order search:** finding an order by number, with or without "FK-".
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes.
- **Visual check at 390px and 1440px**, with the sample-data preview: areas, pickup points, fees and rules, riders, a rider waiting for review, dispatch, orders and an order. No page errors and no horizontal scroll.

## 5. Open questions or guesses

- **Farm more-time options:** 2, 6, 12, 24 or 48 hours (the backend allows 1 to 72).
- **Pickup orders:** a pickup point can keep orders longer than the platform rule, never shorter. This is how the backend already worked (`Math.max`).
- **Rider ID types and vehicles** are guesses for Nigeria: NIN, driver's licence, voter's card, passport; motorbike, tricycle (keke), car, van, bicycle. A plate number is needed for every vehicle except a bicycle.

## 6. What's next

Phase 4 (customers and care):
- customers (search, block or unblock, deletions);
- the support inbox;
- problem reports (disputes), with the decision;
- order chats.
