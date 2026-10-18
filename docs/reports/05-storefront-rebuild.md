# Phase 3c - Storefront rebuild and shop design data

Date: 18 Oct 2026
Plan: rebuild brief for Phase 3c. Also: `farmkeke-docs/pending-backend/README.md` ("Data the shop designs show…"), website designs W-01 to W-07 and W-09b, and the reports for 3a (`06-ordering-payments-rebuild.md`) and 3b (`08-after-sale-rebuild.md`).

Result:

- All 8 `storefront` functions are defined again. They keep their live names and arguments, and every field in the live samples.
- The design data the shop pages were missing is now returned, as new optional arguments and new fields.
- Coverage is **266 of 266** live functions and 5 of 5 HTTP routes.
- **Nothing was deployed.** The live deployment still shows 271 functions.

## 1. What was built, by file

### Schema (`convex/schema.ts`)

Only optional fields, widened validators, new tables and new indexes were added.

- `categories.subtypes`: optional, `[{ slug, name }]`, using the new shared validator `categorySubtype`.
- `listings`:
  - new optional field `subtype`, the slug of one of the category's subtypes
  - new index `by_categoryId_and_status_and_subtype`
  - new search index `search_name` on `name`, with filter fields `status` and `categoryId`
- `farms`: new search index `search_name` on `name`, with filter field `status`.
- `areaRequests`:
  - `email` is now optional
  - new optional field `phone`
  - new index `by_phone`
- `notifications.side`: the stored validator is now `storedNotificationSide`, which adds `"staff"`. Function arguments still use `notificationSide` (shop or farm), so no live signature changed.
- `disputes`: new optional fields `farmRemindedAt` and `farmReplyOverdueAt`.
- New table `listingCounts`, `{ scope, key, count }`, with index `by_scope_and_key`. It holds three kinds of counter:
  - `farm`: the farm's live listings
  - `category`: the live listings of open farms in that category
  - `subtype`: the same, for one subtype of a category
- New table `farmStats`, `{ farmId, responseHours[] }`, with index `by_farmId`: the farm's last 25 payment-to-acceptance times.

### New shared libraries

- `convex/lib/geo.ts`:
  - `haversineKm`
  - `shopperPoint`: validates the optional lat/lng arguments
  - `farmDistanceKm`: rounded to 0.1 km, or null when either position is unknown
- `convex/lib/listingCounts.ts`: keeps the counters up to date.
  - `farmIsOpen` (active and not on holiday) and `isShopListing` (live and not deleted)
  - `insertListing` and `patchListing`: every listing write in the repo now goes through these, and they update the counters from the before/after difference
  - `farmVisibilityChanged`: when a farm goes on holiday, comes back, is suspended or is reinstated, its live listings join or leave the category and subtype counts
  - `readCount`
- `convex/lib/shop.ts`: what the shop functions share.
  - The shared filter arguments `listFilterArgs` and the sort validator. The sorts are the 4 live ones plus `nearest` and `top_rated`.
  - `freshnessLabel`, which matches the website's helper: "Harvested today", "Harvested yesterday", "Harvested N days ago", and null after 14 days.
  - `ratingOf`, built on 3b's `reviewStats`, with the same rounding as `reviews.summary`.
  - `responseTimeHours` (the median, to one decimal place) and `recordResponseTime`.
  - `shopReader`, which caches farms, units, categories, ratings and counts within a query, and builds:
    - the listing card (`ListingSummary`)
    - the farm row (`FarmSummary`)
  - `checkFilters`, `passes`, `farmPasses`, `sortEntries` and `listPage`. In every grid, in-stock listings come before sold-out ones.

### Storefront (`convex/storefront.ts`)

Every read is through an index (or a search index) and bounded. No query reads the clock. Listings are shown only when they are live and not deleted, and their farm is active and not on holiday.

- `home`:
  - unchanged behaviour, with the new card and farm-row fields
  - new optional `lat`/`lng`: farm rows are then sorted by distance, after the shopper's own LGA
- `collection`:
  - `fresh` is the newest listings; `picked_today` is the ones harvested on `today`
  - in-stock only, like the home rows
  - takes all the shared filters and sorts
- `categoryListings`:
  - It reads up to 500 live listings of the category through `by_categoryId_and_status`, or through the subtype index when `subtype` is given. Then it filters, sorts (newest by default) and pages them with `limit`.
  - `category` adds `productCount` and `subtypes[{ slug, name, count }]` from the counters.
  - The response adds `farmCount`.
  - It still returns null for an unknown or hidden slug.
- `search`: full-text search with the two search indexes.
  - **Listings:** up to 200 listings whose name matches, best match first. After them come the live listings of up to 20 farms whose name matches. Then the shared filters and sorts apply.
  - **Farm rows:** farms whose name matches, then the farms selling what matched. Each row has `matchCount`, and the response adds `farmTotal`.
  - New optional `categorySlug`. Empty text returns an empty result.
- `product`:
  - null for an id that isn't a listing.
  - For a deleted listing (`removed`), one that isn't live (`not_live`), or one whose farm is suspended (`farm_unavailable`), it returns the unavailable shape: `{ available: false, name, imageUrl, reason, similar }`.
  - A farm on holiday gives the full detail with `available: false` and `reason: "farm_on_break"`.
  - New fields:
    - on the product: `inStock`, `freshness`, `subtype`, `priceKobo` and `moreFromFarm`
    - on `farm`: `onBreak`, `joinedAt`, `productCount`, `responseTimeHours`, `acceptsWithinHours` and `distanceKm`
    - for the optional `serviceAreaId`: `deliveryFeeKobo` and `deliveryArea`
  - `similar` shows the same category first, then the newest listings.
- `farm`:
  - null when the farm is unknown or suspended. While it is on holiday, `listings` is empty.
  - New fields:
    - `area`, `productCount` and `distanceKm`
    - `categories[{ slug, name, count }]`, and a `category` on each listing
    - `delivery` and `pickup`: true when any live listing offers them
    - `responseTimeHours` and `acceptsWithinHours`: the latter is the A-85 farmer response time, 24 by default
- `farmAreas`: the distinct `{ lga, state }` of open farms, sorted by state and then LGA.
- `popular`:
  - Listings are ranked by the quantity ordered in the last 300 paid orders, then topped up with the newest ones.
  - Buyable listings only; 12 by default.
  - New optional `limit`, `today`, `lat` and `lng`.

### Other changes

- `convex/catalog.ts`: new query `listCategoriesWithCounts` (W-02). Each visible category comes with `productCount` and `subtypes` with counts.
- `convex/admin/catalog.ts`: new `setSubtypes({ categoryId, subtypes, reason })`.
  - Operations staff only.
  - Up to 30 subtypes, with checked slugs and no duplicates.
  - Audited.
- `convex/listings.ts`:
  - `saveDetails` takes an optional `subtype`, checked against the category; an unknown one gives `UNKNOWN_SUBTYPE`. Changing the subtype counts as a content edit.
  - Every write goes through `patchListing` or `insertListing`.
  - `afterContentEdit` now reads the listing again before it sends the listing back to review, so the counters see the patched category.
- `convex/admin/listings.ts` and `convex/seed.ts`: listing writes go through the count helpers.
- `convex/farms.ts` (`updateAvailability`) and `convex/admin/farmers.ts` (`setSuspended`): both call `farmVisibilityChanged`.
- `convex/orders/farmer.ts`: `accept` records the time from payment to acceptance with `recordResponseTime`.
- `convex/shopStats.ts`: new internal `rebuild({ dryRun? })`, a one-off backfill.
  - It recomputes every counter from the live listings, and the response times from each accepted order's `paid` and `accepted` events in `orderEvents`.
  - It is safe to run again.
- `convex/areas.ts`: `requestArea` now takes `email` and/or `phone`.
  - At least one is required, or it gives `CONTACT_REQUIRED`.
  - The phone is normalised with `lib/phone.normalizeNigerianPhone`; a bad one gives `INVALID_PHONE`.
  - Repeat requests are de-duplicated by email or phone, for the same place.
- **Problem reports:**
  - `convex/lib/notify.ts`: new `notifyStaff`. It writes one `notifications` row with side `staff` for each support and operations user. These alerts are in-app only; they are never pushed, texted or emailed.
  - `convex/disputes.ts`:
    - `open` now alerts staff.
    - It schedules `replyReminder` (internal) for 2 hours before `farmReplyBy`. The reminder is a farm notification of kind `dispute_reply_reminder`, sent by push and SMS through 3b's `notifyFarm`.
    - It schedules `replyOverdue` (internal) at `farmReplyBy`. This sets `farmReplyOverdueAt` and alerts staff.
    - Both do nothing once the farm has replied.
  - `convex/lib/alerts.ts`: `dispute_reply_reminder` belongs to the farm's "Problem reports" alert.
  - `convex/lib/disputes.ts`: the case view and the list row add `farmReplyOverdue`.
  - `convex/notifications/store.ts`: `plan` skips `staff` rows.
  - `convex/admin/staff.ts`: new `alerts` (paginated), `unreadAlerts` (capped at 99) and `markAlertsRead({ notificationId? })`. These are for the signed-in staff member only.
- `convex/account.ts`: `deleteAccount` returns `{ status: "deleted" | "waiting_for_orders" }` instead of null.
  - The only caller in the repo is `app/settings/delete-account.tsx`, which awaits the action and ignores the result.
  - `src/` and `web/src` don't call it.

## 2. Deviations from the spec and why

- **Response time:** it is recorded when an order is accepted, and kept in `farmStats` (the last 25 samples). It is not recomputed from `orderEvents` on every page view, which would read up to a few hundred rows per product page. The backfill does read `orderEvents`: each sample is the time from the `paid` event to the `accepted` event, which is the same as `acceptedAt - paidAt`.
- **Counters:** they are counter documents rather than `@convex-dev/aggregate`. Only simple totals per key are needed, and listing writes are infrequent.
  - The farm count includes the farm's live listings even while it is on holiday, so the farm's own numbers stay stable.
  - The category and subtype counts include only open farms.
  - Stock doesn't affect any count, so the stock taken by orders (`lib/orders.takeStock`) doesn't touch the counters.
- **Sold-out listings:** category, search and farm grids include them with `inStock: false`, always after the in-stock ones. The home rows, `collection`, `popular`, `similar` and `moreFromFarm` show in-stock listings only, as the original `home` did.
- **Extra arguments not in the brief:**
  - `today` on `categoryListings`, `search`, `farm`, `product` and `popular`, so that freshness labels and `harvestedWithinDays` work without the clock
  - `categorySlug` on `search`, for the W-04 category chip
  - `limit` on `popular`
  - the new filters on `collection` as well
- **Argument errors:** a filter given without what it needs throws an error, rather than being ignored quietly.
  - `harvestedWithinDays` without `today` gives `TODAY_REQUIRED`.
  - `maxDistanceKm` or `sort: "nearest"` without `lat`/`lng` gives `LOCATION_REQUIRED`.
- **Staff alerts:** they use the `notifications` table with a new stored side, `staff`, and three new admin functions to read them. Using side `shop` would have mixed them into a staff member's shopping inbox. They are in-app only.
- **Rating filter:** `minRating` leaves out farms with no reviews yet.
- **Coverage "extras"** (new functions not in the live spec): `catalog.listCategoriesWithCounts`, `admin/catalog.setSubtypes`, `admin/staff.alerts`, `admin/staff.unreadAlerts`, `admin/staff.markAlertsRead`, `disputes.replyReminder`, `disputes.replyOverdue` and `shopStats.rebuild`.

## 3. Bugs found and fixed

- **Stale listing in content edits** (found while wiring the counters): `listings.saveDetails` patched the listing, then `afterContentEdit` patched the status again using the copy from before the first patch. With the counters, a category change on a non-trusted farm would have been counted against the old category. `afterContentEdit` now reads the listing again first.
- **Test expectations:** two of my own test expectations for `productCount` were wrong; the paused listing correctly isn't counted. This was a test fix, not a code fix.
- **Bundle time:** the argument-check script's first esbuild run used `platform: "neutral"` and couldn't resolve `node:crypto` for modules that import Convex Auth. It was rerun with `platform: "node"`. That was a script problem, not a code problem.
- Nothing failed at typecheck or at runtime in the tests.

## 4. Verification

All commands were run from the repo root unless noted.

- `npx convex codegen --typecheck disable`: regenerated `convex/_generated/` locally.
- `npx tsc --noEmit -p convex`: no errors.
- `npx tsc --noEmit` (the app): no errors.
- `node scripts/check-coverage.mjs`: **266/266 functions and 5/5 HTTP routes**, exit code 0. `storefront` is 8/8. The extras are listed in section 2.
- **Argument check against the live spec:** a scratchpad script (`argcheck/check.mjs`) bundles each changed module with esbuild and compares its `exportArgs()` with `web/convex-spec/live-function-spec.json`.
  - 81 functions match exactly.
  - These are wider than live, and nothing was removed or made required:
    - `storefront.*`: all 7 rebuilt functions gain new optional arguments, and the sort union gains 2 members
    - `areas.requestArea`: `email` is now optional, and `phone` is new
    - `listings.saveDetails`: `subtype` is new
- `npx convex function-spec` (read-only), compared with the snapshot: 271 = 271, none missing and none new. Nothing was pushed.
- **Tests:** run with `npx vitest run` in the scratchpad `flowtest/` harness (convex-test and vitest, against the repo's `convex/`). The repo's `package.json` is unchanged.
  - Result: **16 of 16 pass**, which is the 10 tests from 3a and 3b plus 6 new ones in `storefront.test.ts`.
  - I broke one expectation on purpose to confirm the assertions run.

  The new tests:

  1. **Search:**
     - Listing-name matches, with no paused listings and sold-out ones last.
     - The card fields: farm, verified, freshness for today, yesterday and 6 days ago, in stock, category, subtype, and distance (null when the farm has no position).
     - Farm rows with rating, review count, product count and `matchCount`.
     - A farm-name search returns that farm's listings.
     - The category filter, empty text, and a call with only the live arguments.
  2. **Filters and sorts:**
     - Filters: `minRating` (4.5 and 4, unrated farms left out), `maxDistanceKm` at 5 and 20 km, `harvestedWithinDays` at 0 and 3, `subtype`, and the old pickup and price filters together.
     - Sorts: `nearest`, `top_rated`, `price_low` and `freshest`.
     - The `TODAY_REQUIRED` and `LOCATION_REQUIRED` errors, `limit`/`hasMore`, and an unknown slug giving null.
     - The same filters on search; `collection` with `nearest` and `picked_today`.
     - Home farm rows, and `listCategoriesWithCounts`.
  3. **Counters and farm stats:**
     - **Counter changes:** pausing, resuming, holiday mode, suspending and reinstating, a subtype change through `saveDetails`, `UNKNOWN_SUBTYPE`, and deleting. After each, the category and subtype counts are right, and `rebuild` gives the same numbers.
     - **Admin subtypes:** `setSubtypes` refuses support staff and duplicate slugs.
     - **Farm page:** two orders accepted after 2 and 4 hours give `responseTimeHours` 3, and the backfill from `orderEvents` agrees. The page also has its rating, product count, delivery and pickup, `acceptsWithinHours` 24, the category chips, and distance. An unrated farm has no position and no history, so its values are null.
     - **Product page:** the farm's rating, response time and distance; the delivery fee for the service area; `moreFromFarm`; and the unavailable shape for a paused listing.
     - **Also:** `popular` puts the ordered listing first, and `farmAreas` is checked.
  4. **requestArea:**
     - It works with a phone only, an email only, or both. The phone is normalised to +234, and a repeat for the same place is ignored.
     - The errors `CONTACT_REQUIRED`, `INVALID_PHONE` and `INVALID_EMAIL`.
  5. **Dispute reminder:**
     - The problem report alerts support and operations staff, but not finance staff and not the shop inbox.
     - There is no reminder at 9h59m. At 10h there is exactly one, saying "within 2 hours".
     - At 12h the case is marked overdue, staff are alerted, and the farm's view shows `farmReplyOverdue`.
     - `markAlertsRead` clears the unread count.
     - A farm that replies in time gets no reminder and is never marked overdue.
  6. **Compatibility:** every key in `web/convex-spec/samples/storefront.*.json` (all 9 samples, `home.area` included) is still present in the matching response.

## 5. Open questions and decisions that had to be guessed

- **Backfill:** after the 3d deploy, `npx convex run shopStats:rebuild` must be run once. Until then the counts and response times are 0 or null. The listings themselves show correctly without it.
- **Subtypes are empty:** no category has subtypes yet. Operations staff need to set them with `admin/catalog:setSubtypes`, and farmers then pick one in `saveDetails` (the app and the website forms don't send `subtype` yet).
- **"Verified":** `farmVerified` and `verified` are true for active farms, because every farm exists only after its application was approved. There is no separate verification flag.
- **Staff alert links:** the `href` values (`/admin/disputes/<id>`) are guesses, since the Admin Portal doesn't exist yet.
- **Who gets staff alerts:** problem-report alerts go to support and operations staff only, as the brief said; super admins and finance staff don't get them. Staff can read alerts in any role.
- **Default sorts:** `categoryListings` defaults to newest. `search` defaults to best match, which is the search-index order with name-matched farms' listings after it.
- **Bounds** that may need raising as the catalogue grows:
  - 500 candidates per category or collection
  - 200 name matches and 20 farms per search
  - 300 recent orders for `popular`
  - 100 farms on home and 500 for `farmAreas`
- **Response-time window:** the last 25 accepted orders. The shop shows the median, rounded to one decimal place.
- **Freshness wording:** the design also uses "Collected today" and "Caught today" for eggs and fish. The backend always says "Harvested"; the website can map it by category if wanted.
- **On-holiday product page:** it returns the full detail with `available: false` and `reason: "farm_on_break"`. The farm page returns the profile with no listings.

## 6. What's next

- **Phase 3d:**
  1. Run `node scripts/check-coverage.mjs` (it now exits 0).
  2. Follow the 3a and 3b deploy notes and deploy.
  3. Run `npx convex run shopStats:rebuild` once.
  4. Set the category subtypes.
- **Website** (the other session), once the deploy is done: switch on the new fields and arguments listed in `farmkeke-docs/pending-backend/README.md`. In particular:
  - pass `today` and `lat`/`lng` everywhere
  - use `listCategoriesWithCounts` on W-02 instead of calling `categoryListings` once per category
  - add the new filters and sorts to `parseFilters`
  - add `phone` on W-09b
  - read the `deleteAccount` status on W-49
- **App:** send `subtype` from the listing form, and show `waiting_for_orders` after M-95.
