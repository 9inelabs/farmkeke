# Phase 1 - Foundations

Date: 9 Oct 2026
Plan: `docs/build-plan.md` (Phase 1, reshaped because the Admin Portal is not in this repo)

Result: the app now runs as Farmkeke on Convex. Seed data is live, auth works end to end, and the design-system components are built from the Figma frames. No market2pot code remains in the working tree.

## 1. What was built, by file

### Removed (market2pot)

`git rm` of 295 tracked files, all matching the last commit, so they are recoverable from history:

- `app/` and `src/`: the whole market2pot app
- `supabase/`: migrations, edge functions and config
- `scripts/test-rls.ts`
- `docs/reports/01` to `11`
- `assets/design/`, `assets/materials/`, `assets/fonts/` (Archivo Expanded), and the old icon and splash PNGs
- `.env.example` (Supabase keys)

Packages removed: `@supabase/supabase-js`, `react-native-url-polyfill`, `moti`, `react-native-webview`, `dotenv`, `tsx`.

### App config

- `app.json`:
  - Identity: name Farmkeke, slug `farmkeke`, scheme `farmkeke`, bundle ID and package `com.farmkeke.app`.
  - White splash with the wordmark. Adaptive icon background is now white.
  - Permission texts reworded for Farmkeke. `RECORD_AUDIO` removed.
  - The market2pot EAS `projectId` is removed (owner `9inelabs` kept).
- `package.json`:
  - Renamed to `farmkeke`.
  - Scripts: `start`, `android`, `ios`, `backend` (`convex dev`), `typecheck` (app and Convex), `seed`.
- `tsconfig.json`: `@/*` points to `src/*` and `@convex/*` to `convex/*`. The Supabase exclude is removed.
- `index.ts`: plain `expo-router/entry`. The URL polyfill was only needed by Supabase.
- `.env.example`: lists the Convex variables, and notes that secrets live on the deployment.
- Packages added:
  - `@convex-dev/auth` 0.0.96 and `@auth/core` 0.41
  - `@convex-dev/rate-limiter` (installed for Phase 2, not mounted yet)
  - `expo-secure-store`, `expo-image`
  - `@expo-google-fonts/montserrat`
  - `lucide-react-native`
- `npx expo install --fix` aligned 13 Expo packages to the SDK 57 patch versions.

### Brand assets (`assets/`)

All generated from the files in `assets/new assets/`.

- `brand/wordmark.png` (with @2x and @3x): the 1080px wordmark embedded in the Figma file, tightly cropped, transparent background.
- `icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png`: **placeholders** built from the wordmark until the new app icon arrives.
- `illustrations/`: onboarding (fresh, delivery, escrow) and start-shopping art, taken from the crops used in the Figma frames.
- `categories/`:
  - The five designer illustrations: vegetables, fruits, grains-tubers, poultry-eggs, meat-fish.
  - `dairy.png`: a **placeholder** cut from the sixth circle in the Figma category sprite.
- `icons/tab-*.png`: the designer's 2x and 3x tab icons, plus a generated 1x.

### Convex backend (`convex/`)

- `schema.ts`: tables `users` (extends Convex Auth's table with `staffRole`), `categories`, `units`, `serviceAreas`, `pickupPoints` and `auditLog`. Money is integer kobo.
- `auth.ts`:
  - Password provider: emails normalised to lowercase; password rules of 8+ characters with a number and a letter.
  - Anonymous provider for guests.
- `auth.config.ts`, `http.ts`: Convex Auth wiring.
- `lib/auth.ts`: guards `getViewer`, `requireUser`, `requireAccount` and `requireStaff(roles)`. Super admins pass every staff check.
- `lib/audit.ts`: `writeAudit`. A reason is required.
- `lib/validate.ts`: checks for text, slugs, kobo amounts and opening hours.
- Public queries:
  - `catalog.ts`: `listCategories`, `getCategoryBySlug`, `listUnits`
  - `areas.ts`: `listServiceAreas`, `listServedStates`, `listPickupPoints`
  - `users.ts`: `viewer`
- Admin stand-ins. All are staff-only and every write is audited.
  - `admin/catalog.ts` (A-80, A-81): categories (list, create, update, reorder) and units (list, create, update or retire).
  - `admin/areas.ts` (A-82, A-83): service areas and delivery fees; pickup points.
  - `admin/staff.ts` (A-89, A-90):
    - `bootstrapSuperAdmin`: internal, CLI only, refuses once a Super admin exists
    - `listStaff`, `setStaffRole`
    - `listAuditLog`: paginated
- `seed.ts`: idempotent seed with 8 categories, 11 units, 6 Imo service areas at ₦1,000 per farm order, and 4 pickup points.
- Deployment env (dev `incredible-wolf-877`): `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL=farmkeke://`. The keys were generated locally with `jose`; the key file was deleted after setting them.

### App (`app/`, `src/`)

- `src/theme/tokens.ts`: colours, spacing, radii, sizes, motion durations and shadow, all measured from the Figma SVGs. Examples: 20pt margins, 17pt control radius, 63pt category tiles, 127x191 product cards, ink at 70% and 50% for secondary text.
- `src/theme/typography.ts`: Inter (400–700) for UI text and Montserrat (600/700) for display headings, as in the Figma frames. Each weight is imported on its own.
- `src/lib/convex.ts`:
  - The Convex client.
  - SecureStore token storage, with key sanitising so sessions survive app restarts.
- `src/lib/money.ts`: `formatNaira(kobo)`.
- `src/components/ui/`, all in the Figma style:
  - Base: `Text`, `PressableScale` (150ms ease-out press, skipped with reduce motion), `Button` (lime primary, plus dark, secondary, outline, ghost and danger variants)
  - Layout: `Screen`, `ScreenHeader` (back chevron and large left-aligned title)
  - Inputs: `TextField` (label, helper, error under the field, Show/Hide password, +234 prefix), `SearchPill`, `Chip`, `QuantityStepper`
  - Home header: `LocationChip`, `AlertsPill`
  - Content: `EscrowCard`, `CategoryTile`, `ProductCard`, `StatusBadge`, `Wordmark`
  - States: `Skeleton` (pulse, respects reduce motion), `EmptyState`
- `app/_layout.tsx`:
  - Holds the splash until fonts load.
  - Providers: gesture handler, safe area, and ConvexAuthProvider with secure storage.
- `app/index.tsx`: **temporary** foundations screen that reads categories, units, areas and pickup points live from Convex, and starts or ends a guest session. Phase 2 replaces it with M-01 Splash.
- `app/dev/gallery.tsx`: dev-only gallery of every component. It redirects in release builds.

## 2. Deviations from the spec and why

- **No Admin Portal screens.** As approved in the plan, A-80 to A-83 and A-89/A-90 exist as staff-only Convex functions, run from the dashboard, CLI or MCP. The portal will call the same functions.
- **A-89 staff invites (A-04) not built.** Invites need email, which arrives in Phase 2. For now the first Super admin is created with `bootstrapSuperAdmin`, and roles are set with `setStaffRole`.
- **A-01/A-02 staff sign-in with two-step verification not built.** That belongs to the Admin Portal. Staff currently use normal accounts plus a role.
- **URL scheme is `farmkeke`.** The instruction read "the URL scheme com.farmkeke.app as the bundle ID". I took `com.farmkeke.app` as the bundle ID and package, and kept the scheme as `farmkeke` (deep links look like `farmkeke://reset`). This is easy to change.
- **iPad support turned off** (`supportsTablet: false`). The designs are phone-only. iPads will run the app in phone mode.
- **Fonts load at runtime** with `useFonts`, not embedded by the expo-font config plugin. Embedding needs per-platform family names and a native rebuild. The splash is held until the fonts load, so there's no flash. This can be revisited later.
- **Category names follow Figma** ("Grains & Tubers"), not the PDFs ("Grains and Tubers").
- **Category art for Herbs & Spices and Legumes & Nuts** falls back to a sprout icon in a tint tile until the illustrations arrive.

## 3. Bugs found and fixed

- **Bundle size (found at bundle time, not typecheck).** Importing `@expo-google-fonts/inter` and `montserrat` from their root entry put every weight and italic into the bundle, around 36 font files. Switched to per-weight imports (`@expo-google-fonts/inter/400Regular` and so on). The export now ships only the six weights used.
- **Wordmark rendered on a black box (asset build).** The Figma wordmark already has a transparent background, and the first conversion treated it as white-backed. Regenerated using the image's own alpha.
- **Wrong Dairy crop (asset build).** The first crop took the grains circle from the sprite. Fixed the coordinates.
- **Convex typecheck: `process` not found** in `auth.config.ts`. Now uses the typed `env` from `_generated/server`, as the Convex guidelines require.
- **Convex typecheck: Password `profile` return type.** Typed the provider with the app `DataModel`, and never return an `undefined` name.
- **expo-doctor: script name `convex` shadowed the `convex` binary.** Renamed it to `backend`.
- **SecureStore key rule (prevented, not hit).** Convex Auth storage keys contain the deployment URL, which SecureStore rejects. The storage wrapper replaces invalid characters.

## 4. Verification

All commands were run from the repo root.

- `npx convex dev --once`: "Convex functions ready!". The first run failed on the two type errors above; the rerun was clean.
- `npx convex run seed:run`: `{categories: 8, units: 11, serviceAreas: 6, pickupPoints: 4}`.
- `npx convex run seed:run` (second run): all zeros, so the seed is idempotent.
- `npx convex run catalog:listCategories`: the 8 categories in order.
- `npx convex run areas:listServedStates`: `["Imo"]`.
- `npx convex run admin/catalog:listAllCategories` with no identity: `ConvexError: Not signed in`.
- Auth smoke test against the dev deployment, using `ConvexHttpClient` from Node. All checks passed:
  - Anonymous sign-in returns a token, and `users:viewer` sees a guest.
  - Password `signUp` creates an account with the name and a lowercased email.
  - `signIn` with the email in upper case works.
  - Wrong password is rejected.
  - Weak password ("short") is rejected with the rules message.
  - A non-staff account calling an `admin/` query gets "permission" refused.
  - A guest calling an `admin/` query gets "Sign in" refused.
- `npm run typecheck` (app `tsc` and `tsc -p convex`): no errors. `--listFiles` confirms every `app/`, `src/` and `convex/` file is included.
- `npx expo export --platform android`: bundle built (6.5 MB Hermes bytecode).
- `npx expo export --platform ios`: bundle built (6.3 MB).
- `npx expo-doctor`: 21/21 checks passed.
- `npx expo config --type public`: Farmkeke, `farmkeke`, `farmkeke`, `com.farmkeke.app` (iOS and Android).

**Not verified:** the app has not been run on a device or emulator. There is no Android SDK or emulator on this machine, and the old builds used EAS. The UI, gallery, session restore after relaunch and SecureStore behaviour still need a run on a device (see section 6).

## 5. Open questions and guessed decisions

- **Deletion that was blocked (needs you).** Claude Code's safety check refused to delete files that git doesn't track, because those can't be recovered. Please delete these yourself, since they're market2pot leftovers:
  - `.env`: the old Supabase URL, anon key and **service-role key**. Consider rotating or deleting that Supabase project too.
  - `.expo/`: the old dev-server cache and logs.
  - `supabase/.temp/`: Supabase CLI cache. It now shows as untracked, because its `.gitignore` was removed with the rest of `supabase/`.
- **EAS project.** The slug changed, so EAS needs a new project before any build. Run `npx eas init` (it writes the new `projectId` into `app.json`), then build a development client with `npx eas build --profile development --platform android`.
- **Test data on dev.** The auth smoke test left one guest and two `smoke+…@farmkeke.test` accounts on the dev deployment only. They're harmless, and can be deleted from the dashboard.
- **Placeholder seed data.** The service areas, the ₦1,000 delivery fee, and the pickup point addresses, phone numbers and coordinates come from the design mockups. Real values are needed before launch, and can be changed through the `admin/areas` functions.
- **First Super admin.** Once you've created your own account in the app (Phase 2), run:
  `npx convex run admin/staff:bootstrapSuperAdmin '{"email":"you@…"}'`
- **Assets still to come:**
  - The new app icon. The current icon and splash are wordmark placeholders.
  - Herbs & Spices, Legumes & Nuts and Dairy illustrations. The designer's category PNGs are 120px, slightly soft at 48pt on 3x screens, so 180px or larger exports would be sharper.
- **Material Symbols font (962 KB).** It's bundled by `expo-router` → `expo-symbols`, not by app code. I've left it alone.
- **Generic wrong-password error.** Convex Auth reports a wrong password as a generic server error. Phase 2's Sign in screen (M-50) will show "That email and password don't match", and will add throttling (M-50 "too many tries") with the rate limiter.

## 6. What's next

Phase 2 - App shell and accounts:

- M-01 Splash with session restore, the M-03 onboarding carousel, M-04 Get started, and M-05 to M-07 location and area screens
- Sign in, create account and password reset (M-50 to M-59)
- Farmer sign-in by phone number
- Account, profile, addresses and delete account
- System states M-S1 to M-S7
- The five-tab shell with the designer's tab icons

**Needed from you before Phase 2:**

1. Run `npx eas init` and a development build, so screens can be checked on a phone.
2. A Resend API key for the reset emails. I'll set it on the deployment with `npx convex env set`.
3. The sending address or domain to use, e.g. `no-reply@farmkeke.com`. The domain must be verified in Resend.
