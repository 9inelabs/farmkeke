# Farmkeke mobile app: build plan

Status: approved 9 Oct 2026. Phases 1–4 done (see `docs/reports/`). The rest of the app is built in the batches in section 7 (from 23 Oct 2026).

Sources: `assets/new assets/Documentation/` (PRD and Screen Inventory & Build Plan). Screen IDs (M-, F-, A-) below are from the Screen Inventory.

## 1. Scope of this repo

This repo is the **Farmkeke mobile app** (Expo SDK 57, Expo Router, TypeScript) plus the **Convex backend** in `convex/`. The backend is shared: the website and the Farmkeke Admin Portal will connect to the same deployment later, from their own codebases, once their stack is chosen.

Not built here: website screens (W-) and Admin Portal screens (A-). Every admin *capability* the app depends on is still built here, as admin-only Convex functions (see 3.4), so the app is fully testable before the portal exists.

## 2. Design rules

- **Visual source of truth:** the user's Figma export (`farmkeke figma file.zip`). Every screen, including the roughly 130 with no Figma frame, is drawn in that style.
- **Flow and content benchmark:** `App Screens (Claude built) 1-6.pdf`. Use them for screen order, copy, states and edge cases, not for their look.
- **Tokens (from the Figma SVGs):**

| Token | Value | Use |
| --- | --- | --- |
| forest | #1E3B16 | Titles, prices, icons, Alerts pill, selected states |
| lime | #A9D654 | Primary CTAs (dark text), add buttons, links such as See all |
| tint | #F2F8E6 | Cards, chips, category tiles, info banners (lime border) |
| ink | #1A1A1A | Body text |
| line | #DFDFDF | Borders, dividers |
| placeholder | #D9D9D9 | Image placeholders, skeletons |
| success / error / pending | #2F9E44 / #D64545 / #E6A23C | Status badges and states (PRD) |

- Frame 390 x 844. Radii 8 / 12 / 16 and fully rounded pills. Headings in Montserrat, body in Inter.
- **Patterns to reuse from Figma:** left-aligned large header with a back chevron; pill search with a round lime button; location chip and Alerts pill; "Your money is held safely" escrow card; product card with a lime "+"; illustrated category tile; full-width lime pill CTA at the bottom.
- **Shared states (inventory section 5):**
  - Loading uses skeletons. The only exception is payment processing, which uses a full-screen hold.
  - Empty states have one illustration, one sentence and one button.
  - Errors say what happened and offer one way forward. Form errors sit under the field.
- **Motion:** Reanimated with 150 / 250 / 350 ms durations, ease-out, and respect for the device's reduce-motion setting.
- **Brand assets:**
  - Wordmark: `main logo.png`.
  - App icon: still to come from the user. The goat-horn shield in the PRD is dropped.
  - Category art: the Herbs & Spices, Legumes & Nuts and Dairy illustrations are still to come. Until then they use placeholder tiles in the same style.

## 3. Architecture

### 3.1 App structure

```
app/
  (onboarding)/      splash, carousel, get started, location primer, choose area, outside area
  (auth)/            sign in, create account, forgot / check email / new password / expired, link orders
  (shop)/(tabs)/     home, categories, cart, orders, account
  (farmer)/(tabs)/   dashboard, orders, listings, earnings, farm
  apply/             farmer application F-03 to F-09
  checkout/, product/[id], farm/[id], order/[id], ...
src/
  theme/             tokens, typography, motion
  components/ui/     Button, Header, SearchPill, EscrowCard, ProductCard, CategoryTile, Chip,
                     BottomSheet, Skeleton, EmptyState, ErrorState, StatusBadge, Timeline, ...
  features/          per-area hooks and screen parts
convex/
  schema.ts, auth.ts, auth.config.ts, http.ts, crons.ts
  lib/               role guards (requireUser, requireFarmer, requireAdmin), validators, money helpers
  shop/, farmer/, orders/, messaging/, notifications/
  admin/             admin-only functions (stand-in for the Admin Portal)
  seed.ts            categories, units, Imo service areas and pickup points, test data
```

### 3.2 Auth (Convex Auth)

- **Consumers:** the Password provider with email and password, with the rules the spec shows as you type.
- **Farmers:** the same account plus a required phone number. They can sign in with phone *or* email: a phone number is resolved to the account server-side, and the client never sees the email.
- **Guests:** the Anonymous provider, so each phone gets a real guest identity. Guest orders belong to that identity, which is how "only the phone that placed it can confirm" is enforced. Find my order (M-62) is a separate view-only lookup by order number plus phone.
- **Sessions:** stored with expo-secure-store, so closing the app never signs anyone out.
- **Password reset:** Resend email containing a deep link (`farmkeke://reset?...`) to M-55. The link expires after 30 minutes and works once.
- **Sign-in throttling** (M-50 "too many tries"): `@convex-dev/rate-limiter`.
- **Access control:** every public function derives the caller and role server-side and never trusts an id passed by the client.

### 3.3 Data model (first cut; each phase adds only what it needs)

users (and the auth tables), addresses, categories, units, serviceAreas, pickupPoints, farmerApplications, farms, listings, favorites, checkouts (one payment), orders (one per farm; status plus escrow state), orderEvents (timeline), riders, ledgerEntries, disputes, conversations, messages, reviews, notifications, pushTokens, supportTickets, auditLog, settings.

The cart stays on the phone (persisted) and is checked against the server at checkout (M-32 Cart changed). It survives switching between shopping and farmer mode.

### 3.4 Admin stand-in until the portal exists

`convex/admin/*` holds admin-only functions that check the admin role. They're run from the Convex dashboard, `npx convex run`, or the Convex MCP:

- approve, reject or request more info on farmer applications
- approve or send back listings
- mark a farmer trusted
- assign riders and update delivery steps
- release or hold escrow
- cancel orders
- resolve disputes

Each one writes to auditLog with a reason, as the spec requires. The future portal calls the same functions.

## 4. Phases

Numbering follows the spec's phases so reports line up. Phase 1 is reshaped because the Admin Portal isn't in this repo.

**Phase 1 - Foundations**

- Remove the Supabase code and the market2pot leftovers.
- Rebrand the app config: name, slug, scheme, bundle ID, icon placeholder and splash.
- Build the design-system tokens and the core components from section 3.1. They can be checked on a dev-only gallery screen.
- Wire up the Convex provider and Convex Auth.
- Write the first schema and seed the configuration data: 8 categories; 11 units (kg, basket, tuber, crate, bunch, derica, mudu, paint bucket, tray of eggs, piece, bag); Imo service areas with delivery fees; pickup points.
- Add the admin config functions: the stand-ins for A-80 to A-83, plus A-89 roles via a first-admin seed.
- **Done when:** the app boots as Farmkeke on Convex, and the seeded data can be read from the app.

**Phase 2 - App shell and accounts**

- Screens:
  - Launch and onboarding: M-01, M-03 to M-07
  - Sign in and accounts: M-50 to M-59
  - Account and settings: M-80 to M-85, M-90, M-92 to M-97
  - System states: M-S1 to M-S7
- Five-tab shell with empty tab screens (Home, Categories, Cart, Orders, Account).
- Account deletion (stand-in for A-38).
- **Needs:** Resend API key.
- **Done when:** a user can sign up, stay signed in, reset a password by email, edit profile and addresses, and delete the account.

**Phase 3 - Farmer onboarding**

- Screens:
  - Application: F-01 to F-09e. Drafts are saved; documents go to Convex storage with upload progress and retry.
  - Farmer mode: F-10 dashboard shell, F-13 to F-15
  - Business: F-70 to F-73
  - Help and terms: F-90 to F-92
- Farmer tab shell.
- Admin stand-ins for A-20 to A-25 and A-30 to A-33.
- **Done when:** a user applies, an admin approves, rejects or asks for more, and the approved user switches to farmer mode and sets up the farm.

**Phase 4 - Listings**

- F-20 to F-31, with photos taken in the app.
- Admin stand-ins for A-40 to A-43; listings from trusted farmers skip review.
- **Done when:** farmers add, edit, pause and bulk-manage listings, and admin approval puts them live.

**Phase 5 - Storefront**

- M-10 to M-18, M-21, M-22, M-86.
- Search uses Convex full-text search.
- Featured content (A-86) is seeded.
- **Done when:** home, categories, search, product and farm pages show live listings, and signed-in users can save items.

**Phase 6 - Ordering, dispatch and escrow (simulated payment)**

- Shopping-side screens:
  - Add to cart: M-19, M-20
  - Cart and checkout: M-30 to M-39, M-41, M-42, M-47, M-49
  - Orders: M-60 to M-66, M-71
- Farmer-side screens: F-40 to F-47, F-49, F-60, F-61.
- Backend:
  - The full order state machine.
  - Scheduled 24-hour farmer expiry.
  - Escrow ledger.
  - A test "mark as paid" step in place of a real payment.
  - Admin stand-ins for dispatch, riders, release and intervene.
- **Needs:** Google Maps key for M-35 and M-37 on Android.
- **Done when:** a guest orders from two farms, each farm accepts, a rider is assigned, the consumer confirms, and the ledger shows the money released.

**Phase 7 - Live payments (Paystack)**

- Screens: M-43 to M-46, M-72, M-89, F-62, F-63, and the bank account check on F-07.
- Backend: Paystack initialisation in Convex actions, the webhook on a Convex HTTP endpoint, refunds and payouts.
- **Needs:** Paystack test keys and the open payment spec details.

**Phase 8 - Disputes, chat, reviews and support**

- Screens: M-67 to M-69, M-73 to M-75, M-91, F-48, F-80, F-83.
- Real-time chat with photos.
- Admin stand-ins for A-70 to A-72, A-75 and A-76.

**Phase 9 - Notifications**

- Screens: M-48, M-87, M-88, F-11, F-12, F-75.
- expo-notifications through EAS and FCM, covering every event in inventory section 5 and the deep link it opens, in the right app mode.
- SMS sits behind an interface until a provider is chosen.
- **Needs:** Firebase project and an SMS provider choice.

**Phase 10 - Staff tools:** Admin Portal only. Nothing to build in this repo.

Each phase ends with a report in `docs/reports/NN-phase-name.md` (per CLAUDE.md), with typecheck and Convex deploy checks, and a run on a device or emulator for the screens built.

## 5. Decisions (resolved 9 Oct 2026)

1. **App identity:** display name "Farmkeke", slug `farmkeke`, URL scheme `farmkeke`, bundle ID and package `com.farmkeke.app`. A new EAS project is needed, because the old `projectId` belonged to slug `market2pot`.
2. **market2pot:** everything removed, including the old reports, code, Supabase backend, design materials and fonts. Git history keeps it.
3. **Commission rate:** left for later. Phase 6 stores it as a setting with no value until it's decided.

## 6. Waiting on the user (not blocking)

- New app icon
- Illustrations for Herbs & Spices, Legumes & Nuts and Dairy
- Resend key (Phase 2), Google Maps key (Phase 6), Paystack test keys (Phase 7), Firebase and SMS provider (Phase 9)

## 7. Remaining work (from 23 Oct 2026)

The backend for phases 5 to 9 was built for the website and the Admin Portal (reports 05 to 16), so the app work is mostly screens on top of existing Convex functions. Since then, three decisions changed the flows (report 16):

- **Home delivery:** checkout takes no payment. The farm accepts, staff price the delivery, the shopper pays one bill within 12 hours, and then the rider collects.
- **Pickup:** it happens at the farm, and is paid at checkout. The farmer enters the shopper's 4-digit code to hand the order over; the shopper has 3 days to collect.
- **Removed:** there are no delivery time slots (the shopper writes a note for the rider instead), and no pickup points. That retires M-36, M-37 and M-38.

Every batch is pushed to `main`, ends with a report in `docs/reports/`, and can be checked in the browser preview (`app-preview/`, deployed by Vercel).

| Batch | Screens | Notes |
| --- | --- | --- |
| A. Storefront | M-10 wiring, M-11 to M-22, M-86 | Search, filters, product, add to cart, farm profile, saved items |
| B. Cart and checkout | M-30 to M-35, M-39, M-41 to M-47, M-49 | Delivery bill flow, pickup at the farm, Paystack in an in-app browser |
| C. Orders | M-60 to M-66, M-71, M-72, bill payment | Tracking, pay the bill, pickup code, confirm receipt, refunds |
| D. After-sale | M-67 to M-69, M-73 to M-75, M-87, M-91 | Problem reports, chat, reviews, inbox, support |
| E. Farmer orders and money | F-10 live data, F-11, F-40 to F-49, F-60 to F-63, F-80, F-83 | Accept and decline, hand-over, pickup code entry, earnings, payouts, reviews |
| F. Notifications | M-48, M-88, F-12, F-75 | Expo push tokens and deep links, preferences |
