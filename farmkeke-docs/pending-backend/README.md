# Backend changes waiting for the real convex/ code

Last updated: 17 Oct 2026

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

## Data the shop designs show but the backend doesn't return yet (Phase 2)

The website hides or replaces these until the storefront functions return them:

- **Listing summaries:** `farmId`, `farmName` and `harvestedOn`, so product cards can show the farm and a "Harvested today" badge.
- **Farm rows** on the shop home and search: rating, review count, product count, and distance from the shopper.
- **Categories:** product count per category, and subtypes (the design's sub-chips and "Type" filter).
- **Filters and sorting:** harvested-date, top-rated and distance-to-farm filters, plus a "Nearest farm" sort.
- **Farm listings:** a category on each listing, for the farm page's category chips.
- **Farm page:** delivery and pickup flags, and a typical response time ("Accepts orders within…").
- **`areas:requestArea`:** accept a phone number as well as email (W-09b says "phone number or email").
