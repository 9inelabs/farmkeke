# Backend changes waiting for the real convex/ code

Last updated: 19 Oct 2026

## Why this list exists

The live Convex dev deployment (`incredible-wolf-877`) runs backend code that was deployed from the other computer but never pushed to GitHub. It has 52 tables and 271 functions. GitHub's `convex/` folder only has the phase 1–4 code.

Deploying from the GitHub copy would delete everything that isn't in it, including orders, payments, chat, disputes and reviews. So the website was built **without changing `convex/` at all**. It calls the live functions as they are.

Everything below needs a backend change. Do these only after the other computer's code is committed and pushed. The same steps are in the checklist at the bottom.

## Before touching convex/ again

1. On the old computer, commit and push its `convex/` work. Don't run `npx convex dev` there first.
2. On this computer, run `git pull`.
3. Compare the code with what's live. The helper script writes both lists for you to compare by eye:

   ```
   npx convex function-spec > live.json
   node web/scripts/spec.mjs live.json > live.txt
   ```

   Then check that every file in `convex/` matches. The site's own snapshot is in `web/convex-spec/live-function-spec.json`.
4. Only when they match, run `npx convex dev` from the repo root.
5. Regenerate the website's typed API from the real code. You can then switch `web/src/convex/api.ts` to import from `../../convex/_generated/api`, or keep the generator: `npm --prefix web run gen:api`.

## Settings to change (data, not code)

These need a staff (admin) account and are changed through the existing admin functions.

| Change | How |
|---|---|
| Farmkeke commission: **5%** of the product total | `admin/fees:setCommission` |
| Pickup points hold orders for **3 days** (PRD), not 2 | `admin/areas:updatePickupPoint` with `collectWithinDays: 3`, for each point |
| Replace sample service areas, pickup points and delivery fees with real ones | `admin/areas:*` |
| App store links, once the apps are published | `admin/platform:setAppStatus`, or the `appConfig` row (`androidStoreUrl`, `iosStoreUrl`) |

## Environment variables (safe to set any time)

Setting a variable doesn't change code. Set them with `npx convex env set NAME value` from the repo root.

| Variable | Value | Notes |
|---|---|---|
| `AUTH_RESEND_KEY` | Resend API key | Already read by `convex/lib/email.ts`. It switches on password-reset emails. |
| `AUTH_EMAIL_FROM` | `Farmkeke <no-reply@farmkeke.com>` | Only after farmkeke.com is verified in Resend. |
| Paystack secret key | `sk_test_…` | **The variable name used by the new payments code is unknown.** Check `convex/convex.config.ts` on the old computer. The website uses the test payment step until this is set. |

## Code changes

1. **Website emails.** Templates are ready in `emails/` (see `emails/README.md`). Wire each one in where its event happens, adding to functions without changing what they return:
   - order confirmation after payment
   - farm accepted
   - out for delivery
   - ready for pickup (with the code)
   - problem report received
   - problem decision
   - refund sent
   - welcome on sign-up
2. **Password reset fallback.** In `convex/http.ts`, `/reset-password` should try the app first and, if the app doesn't open within about 1.5 seconds, go to `https://farmkeke.com/reset-password?email=…&code=…`. The website page already accepts those parameters.
3. **Paystack return to the website.** If `payments/checkout:start` builds Paystack's `callback_url` from the app's deep link, add a way for the website's checkouts to return to `https://farmkeke.com/checkout/pay/<checkoutId>`. The website also polls `verify`, so this is a nicety rather than a blocker.
4. **SITE_URL.** Once the website is live, set `SITE_URL` to `https://farmkeke.com` if the reset and auth code uses it for links.

## Content still to provide

- The real contact inbox, phone and WhatsApp number. The website shows `hello@farmkeke.com` and `support@farmkeke.com` as placeholders.
- Terms of use, privacy policy, cookie policy and farmer terms. Only the refund and dispute policy is designed (W-87). The other pages are marked as drafts.
- An SVG version of the wordmark, which looks sharper than the PNG.

## Data the shop designs show (Phase 2 gaps): built in Phase 3c

All of these were built in the Phase 3c backend rebuild (`docs/reports/05-storefront-rebuild.md`). They are **not deployed yet**. Every change only adds optional arguments or new fields, so the website keeps working as it is and can switch each item on after the deploy. After deploying, run `npx convex run shopStats:rebuild` once to fill the new counters and response times.

| Design gap | Status | What to use |
| --- | --- | --- |
| Listing summaries: farm, harvest badge | Built | Each card now also has `farmId`, `farmName`, `farmVerified`, `farmRating`, `farmRatingCount`, `harvestedOn`, `freshness` ("Harvested today", "Harvested yesterday", "Harvested N days ago"; needs `today`), `inStock`, `delivery`, `pickup`, `category` (`{ slug, name }`), `subtype` and `distanceKm` (needs `lat`/`lng`) |
| Farm rows: rating, reviews, products, distance | Built | Farm rows (`home.farms`, `search.farms`) also have `lga`, `state`, `verified`, `rating`, `ratingCount`, `productCount` and `distanceKm`. Search farm rows add `matchCount` ("14 tomato listings"), and search returns `farmTotal` |
| Category product counts | Built | New query `catalog:listCategoriesWithCounts` (each category plus `productCount` and `subtypes[{ slug, name, count }]`). `categoryListings.category` also has `productCount` and `subtypes`, and the response has `farmCount` ("from 21 farms") |
| Category subtypes | Built | `categories.subtypes` (optional), edited with `admin/catalog:setSubtypes`. Listings have an optional `subtype`, set through `listings:saveDetails({ subtype })`. Filter with `categoryListings({ subtype })` |
| Harvested, top-rated and distance filters; Nearest sort | Built | On `categoryListings`, `search` and `collection`: `harvestedWithinDays` (with `today`), `minRating`, `maxDistanceKm` (with `lat`/`lng`), and `sort: "nearest"` (with `lat`/`lng`) or `"top_rated"`. `search` also takes `categorySlug` |
| Farm listings: a category on each | Built | `farm.listings[].category`, plus `farm.categories[{ slug, name, count }]` for the chips |
| Farm page: delivery, pickup, response time | Built | `farm` also returns `delivery`, `pickup`, `responseTimeHours` (median payment-to-acceptance time; null with no history), `acceptsWithinHours` (24), `productCount`, `area` and `distanceKm`. New optional args `today`, `lat`, `lng` |
| Product page extras | Built | `product.farm` adds `responseTimeHours`, `acceptsWithinHours`, `distanceKm`, `productCount`, `joinedAt` and `onBreak`. `product` adds `inStock`, `freshness`, `subtype`, `priceKobo`, `moreFromFarm`, and `deliveryFeeKobo` and `deliveryArea` for the new optional `serviceAreaId`. New optional args `today`, `lat`, `lng` and `serviceAreaId` |
| `areas:requestArea` with a phone | Built | Takes `phone` and/or `email` (at least one; `email` is now optional). Errors: `CONTACT_REQUIRED`, `INVALID_PHONE` and `INVALID_EMAIL` |

Also new in 3c:

- `home` and `popular` take optional `lat`/`lng`; `popular` also takes `limit` and `today`.
- `account:deleteAccount` now returns `{ status: "deleted" | "waiting_for_orders" }`. W-49 can tell the shopper the account will be deleted once their orders finish.
- Problem reports alert support and operations staff in the app (`admin/staff:alerts`, `unreadAlerts` and `markAlertsRead`). The farm is reminded 2 hours before its 12-hour reply deadline. At the deadline the case is marked overdue (`farmReplyOverdue` on the dispute views).

## Email: live (19 Oct 2026)

Resend is set up and sending from `Farmkeke <no-reply@farmkeke.com>`. farmkeke.com is verified in Resend.

Env vars on the dev deployment:
- `AUTH_RESEND_KEY`: a sending-only key, limited to farmkeke.com
- `AUTH_EMAIL_FROM`
- `EMAIL_REPLY_TO`: the owner's personal inbox for now

There are 52 emails; see `docs/reports/09-emails.md` and `farmkeke-docs/email-previews/`.

**Later:** set up `support@farmkeke.com` forwarding (ImprovMX or Cloudflare Email Routing), then change `EMAIL_REPLY_TO`.


## Phase 5: website design gaps (built 19 Oct 2026, not deployed)

Every gap in `web/BUILD-STATUS.md` "Backend gaps found" was built in `convex/`, except a direct shopper-to-farm question thread and a thumbnail per order item. Details: `docs/reports/10-phase5-gaps.md`. Only arguments and fields were added; the app's calls are unchanged.

After deploying:

1. Run `npx convex run shopStats:rebuild` once. It now also fills each farm's chat reply times (W-58).
2. Optional: set a delivery slot limit with `admin/fees:setSlotCapacity` (per area, or per area and slot). Until then there is no limit and no slot shows "Full".
3. Optional: `WEBSITE_URL` (default `https://farmkeke.com`) is now also used for the website's password reset link and the app bridge's fallback.
4. Refresh `web/convex-spec` from the live deployment (`npx convex function-spec`), then `npm --prefix web run gen:api`. The spec was patched by hand from the local code for this phase.

Deploy the backend before the website: the website now sends the new arguments (`address.note`, `returnTo`, `itemQuantities`, `itemRatings`, `phone`, `reason`, `listingId`/`farmId`, `subtypes`, address `directions`/`latitude`/`longitude`), which the current live deployment rejects.

Guest orders are linked to an account only by the account's email, and only after the shopper opens a one-time link sent to that address (or once the email is verified). Never by phone number.
