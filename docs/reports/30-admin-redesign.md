# Admin Portal redesign: sign-in and dashboard

Date: 19 November 2026

The Admin Portal now matches the premium look of the app and website:
- a soft green sign-in page with a frosted card;
- a compact, detailed dashboard with dark green highlight cards;
- a refreshed sidebar and top bar on every portal page.

The two references you shared set the layout: a frosted sign-in card on a sky background, and a stat-card dashboard.

## 1. What was built, by file

- **`web/src/components/admin/AuthLayout.tsx`** (new): `AdminAuthCard`.
  - A morning-green sky gradient with soft light, a lime glow, and light rings behind the card.
  - The wordmark with an "Admin portal" pill at the top.
  - A frosted card with an icon tile above a centred title.
  - "For Farmkeke staff only" under the card.
- **`web/src/components/admin/AuthForms.tsx`:** sign in, the emailed code, apply for access, forgot password and set password all use the new card. Each has its own icon:
  - sign in: arrow in;
  - code and check email: mail;
  - apply: person with a plus;
  - forgot: key;
  - expired link: timer;
  - make password: lock.
  - Titles and leads are centred, fields have icons inside, and buttons are forest green.
- **`web/src/components/admin/AdminGate.tsx`:** the gate states (application pending, more information needed, removed, and so on) use the same background and card.
- **`web/src/components/ui/Field.tsx`:** `TextField` and `PasswordField` take an optional `icon`, shown inside the field on the left. Nothing else uses it yet, so other forms are unchanged.
- **`web/src/app/globals.css`:** `.admin-auth` field styles: compact 46px fields on a soft fill, a forest ring with a lime halo on focus, and a lit forest button. They sit in the components layer, so page-level utilities still win (for example the large code input).
- **`web/src/components/admin/AdminShell.tsx`:** applies to every portal page.
  - The sidebar is a floating rounded panel with smaller type. The active item has a forest bar and a soft lime gradient, and badges are lime (forest on the active item).
  - A dark green "See the shop as customers do" card at the foot opens farmkeke.com.
  - The top bar has a rounded search pill with an icon; round support and alert buttons (the alert count shows on the bell); and the staff member's avatar, name and role, with sign-out as an icon.
- **`web/src/app/admin/(portal)/DashboardView.tsx`** (rewritten):
  - **Title row:** "Dashboard", a welcome line with the role, and the View orders and Export data buttons, each shown only for roles that can use them.
  - **Four cards for today:**
    - Paid today is dark green, with its change from yesterday.
    - Orders today shows its change and the delivery and pickup split.
    - New accounts.
    - Live catalogue shows products and active farms.
    - Each opens its section.
  - **Sales, last 7 days:** the week's total, the best day, and rounded pill bars. Today is forest with its total above it, the best day is darker green, and days without sales are hatched. A table for screen readers is kept.
  - **Orders right now:** waiting for farms, being prepared, and on the road, each with a count and a share bar, plus an Open dispatch button.
  - **Waiting for staff:** a colour-coded list of every queue your role can see, with counts and a "to do" total.
  - **Delivery or pickup:** a half-ring gauge of today's orders.
  - **Lagos time:** a dark green card with a live clock, the date, and a link to unread alerts.
  - **Roles without the dashboard permission** see only the staff queues and the alerts card.

## 2. Deviations from the references and why

- **No "Sign in with Google, Facebook or Apple".** The portal uses email, password and an emailed code. Showing buttons that don't work would mislead staff.
- **The reference's projects, team and timer** became Farmkeke equivalents: orders right now, the staff queues, the delivery and pickup split, and the Lagos clock with alerts. All the numbers come from data the dashboard already loads; nothing new is fetched.
- **"Up X% from yesterday"** is worked out from the existing 7-day series, so no backend change was needed.

## 3. Bugs found and fixed

- **Lint:** the clock first set its time synchronously inside an effect (react-hooks/set-state-in-effect). It now starts on a zero-delay timer, which also keeps the server and browser render the same.
- **The alerts link on the dark card** first showed in the default link green on dark green. It is now white.

## 4. Verification

- `cd web && npx tsc --noEmit`: no errors. Stale `.next` types from a temporary preview page were cleared first.
- `cd web && npx eslint src`: no errors. One warning was there before (an unused type in `convex/returns/adminOps.ts`).
- `cd web && npx next build --experimental-build-mode compile`: compiled successfully.
- **Screenshots** from `next dev` with Playwright, at 1440 px and 390 px:
  - `/admin/signin`, `/admin/apply` and `/admin/forgot-password`;
  - the dashboard, inside the real portal frame, through a temporary page with sample data (the dashboard needs a signed-in staff member). That page was deleted and isn't committed.
  - No page errors.

## 5. Open questions and guesses

- **The rest of the portal's pages** (orders, money and so on) keep their content as it was, inside the new frame. Their tables and panels could get the same compact treatment next if you want it.
- **The live clock uses Lagos time** whatever the staff member's own time zone, because orders and deadlines run on Nigerian time.

## 6. What's next

- Look at the portal signed in on admin.farmkeke.com once Vercel deploys.
- Optional: the compact style for the other portal pages.
