# Phase 15: Admin Portal dashboard, search, exports and maintenance

Branch: `admin-portal`. This is phase 6, the last phase of the Admin Portal plan. It covers the dashboard with today's numbers, global search from the top bar, CSV exports, maintenance mode and app status, and the final checks.

## 1. What was built, by file

### Backend (`convex/`)

- `admin/dashboard.ts` (new): `stats({ dayStart })`, which needs `dashboard.view`. It returns:
  - today: paid orders (split into delivery and pickup), sales, and new accounts (guests not counted);
  - the last 7 days: paid orders and sales per day;
  - orders right now: waiting for farms to accept, accepted and being prepared, and on the road or at pickup points;
  - active farms and live products;
  - `capped`, set when more than 5,000 orders were placed in the week.
  - `dayStart` is the browser's local midnight, because Convex queries shouldn't read the clock.
- `admin/search.ts` (new): `find({ query })`, at most 5 results per section. Each section appears only if the staff member's role can see it:
  - orders by number: `FK-10234`, `fk10234` or `10234` (needs `orders.view`);
  - people by exact email (any capitalisation) or phone number (any Nigerian format) (needs `customers.view`);
  - farms by name (needs `farmers.view`);
  - products by name, deleted ones left out (needs `listings.view`).
- `admin/exports.ts` (new): `orders`, `payouts` and `customers`, each taking `{ from, to }`:
  - each needs the matching view permission (`orders.view`, `money.view`, `customers.view`);
  - at most 5,000 rows, newest first, with `capped` when there are more;
  - the range must be the right way round (`INVALID_RANGE`) and a year at most (`RANGE_TOO_LONG`).
- `_generated/api.d.ts`: synced with `node scripts/sync-generated-api.mjs`.

### Website (`web/src/`)

- `app/admin/(portal)/DashboardView.tsx` (rewritten):
  - **Today**: orders, sales, new accounts, and active farms with live products;
  - **Orders right now**: the three pipeline counts, linking to Orders (and Dispatch for orders on the road);
  - **Last 7 days**: a bar chart of paid orders, with a hidden table of the same numbers for screen readers;
  - **Waiting for staff**: farmer applications, products to review, problem reports, support messages, riders, staff applications and unread alerts. Each tile appears only if the staff member's role can act on it.
- `app/admin/(portal)/search/` (new): the search page with results grouped into orders, people, farms and products; the search text is kept in the address (`?q=`).
- `app/admin/(portal)/exports/` (new):
  - choose orders, payouts to farms or customers (only the ones the role can see) and a date range in Nigerian time;
  - the CSV is built in the browser, with amounts in naira and dates in Lagos time;
  - user-written text is guarded against spreadsheet formulas (section 3).
- `app/admin/(portal)/platform/` (new), "Maintenance and app":
  - turn maintenance on or off, with the message shoppers see and when the shop is expected back;
  - the oldest allowed and latest app versions, and the Google Play and App Store links;
  - every change needs a reason and goes in the audit log. This uses the existing `admin/platform:setAppStatus` and `appConfig:get`.
- `components/admin/AdminShell.tsx`: a search box in the top bar on desktop. On phones, Search is an icon link to the search page, and "Alerts" is icon-only, with screen-reader labels on both.
- `components/admin/routes.ts`: `search(q)`, `exports`, `platform`.
- `components/admin/nav.ts`: Exports and "Maintenance and app" under Overview.
- `convex/admin.ts` and `convex-spec/admin-function-spec.json`: regenerated.

## 2. Deviations from the spec and why

- **The dashboard reads a capped number of rows.** Convex has no count operator. The week reads at most 5,000 orders, and each pipeline count at most 500 per status. Exact numbers at scale need `@convex-dev/aggregate` (see section 5).
- **Search doesn't do partial emails, phones or customer names.** There's no search index on `users`, and scanning every account wouldn't scale. Farms and products use their existing name search indexes.
- **Exports run in the browser.** A query returns the rows and the browser builds the file. This avoids storing files with personal data in Convex storage. The cost is the 5,000-row cap per export; the page says when a file was capped so staff can use a shorter range.
- **No separate "alerts" work in this phase.** The plan listed alerts under phase 6, but staff alerts (the bell, the list and unread counts) were built in phase 1.

## 3. Bugs found and fixed

- **The phone top bar overflowed.** Adding Search made the top bar 454px wide on a 390px phone, so every portal page scrolled sideways. Only the screenshot check found it; typecheck and the build passed. Fixed by making Search and Alerts icon-only on phones.
- **The desktop search placeholder was cut off.** Shortened to "Search orders, people, farms, products".
- **CSV formula injection.** Shopper and farm names are typed by users. A name starting with `=`, `@`, `+` or `-` would run as a formula when the file is opened in Excel or Google Sheets. Such cells now start with `'`. Phone numbers (`+234…`) and negative amounts are left as they are.

## 4. Verification

- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **35 passed, 1 failed.** The failure is the same `storefront.test.ts` Windows-path sample test as in the earlier phases.
- New test in `convex-tests/admin.test.ts`, "dashboard, global search and exports, each limited by role":
  - today's orders, sales, delivery and pickup split, the 7-day series and the pipeline counts;
  - shoppers are refused the dashboard;
  - search finds an order as `FK-10002`, `fk10002` and `10002`, a person by email in capitals and by spaced local phone, and a farm by part of its name; a 1-character search returns nothing;
  - Finance (no `customers.view`) never sees people in search, but does see orders;
  - exports return the rows in range with the farm name; Finance can export payouts but not customers; a reversed range and a range over a year are refused.
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes.
- CSV cell guard spot check with node: `+2348031112222` and `-5000.00` unchanged; `=HYPERLINK("x")` and `+cmd|x` get a leading `'`; commas are quoted.
- **Visual check at 390px and 1440px** with the sample-data preview: dashboard, search results, exports, and maintenance and app. After the top-bar fix, no page errors and no horizontal scroll at either width.

## 5. Open questions or guesses

- **Exact counts at scale:** add `@convex-dev/aggregate` for orders by day and by status once the dashboard shows "capped" or the shop passes a few thousand orders a week. The money summary (phase 14) needs the same.
- **Days are the browser's days.** The dashboard uses the staff member's own midnight. Staff in Nigeria see Lagos days; anyone abroad sees their local day. Exports always use Lagos dates.
- **Name search for customers** needs a search index on `users.name`. It was left out to avoid changing the auth `users` table more than needed.

## 6. What's next

The six phases of the Admin Portal plan are done. Before it's live:

1. Deploy `convex/` from `admin-portal` (`npx convex dev --once`, then production), run `admin/setup:migrateLegacyStaff` if anyone had the old staff role, and create the Founder with `admin/setup:createFounder` (report 10, section 6).
2. Set `WEBSITE_URL` so the emailed links open the portal, and deploy the website.
3. Merge the pull request into `main`. `main` (0ef3976, which finishes its Phase 5 work) is already merged into this branch. Resolving that merge took three changes:
   - `web/BUILD-STATUS.md`: main's shorter "Backend gaps" list, plus this branch's Admin Portal section;
   - `admin/fees.ts:setSlotCapacity` (new on main) now needs `fees.manage`;
   - `convex-tests/phase5.test.ts` (new on main) makes its admin with `grantStaff`.
   After the merge: convex typecheck passes, tests are 44 passed and 1 failed (the same storefront Windows-path test), and the website typechecks, lints and builds.
   The portal doesn't have a screen for setting slot capacity yet.

Later, from the plan:
- two-person approval for large refunds and payouts;
- aggregates for exact counts;
- customer name search.
