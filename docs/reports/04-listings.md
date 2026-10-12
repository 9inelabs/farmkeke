# Phase 4 - Listings

Date: 9 Oct 2026
Plan: `docs/build-plan.md` (Phase 4)

Result:

- **Farmers** can add, edit, preview and submit listings from farmer mode, and manage them from the Listings tab.
- **Staff** approve, send back or unpublish listings through the admin stand-ins.
- **Trusted farms'** listings go live without review.

Wrapped up early at the user's request so the screens can be redesigned batch by batch against the Figma file (see section 5).

## 1. What was built, by file

### Backend (`convex/`)

- `schema.ts`:
  - New table `listings`: farm, status, name, category, description, harvest date, photos (cover first), units, delivery/pickup, staff note, timestamps and a soft-delete marker. Each unit carries its own price, stock and minimum order.
  - New table `listingEvents`: price and unit history plus the moderation trail.
  - Statuses are draft, under_review, needs_changes, live and paused. "Out of stock" isn't stored: it means a live listing with no stock in any unit.
- `lib/listing.ts`: the shared rules (`listingProblems`, `isOutOfStock`, limits) and the reasons staff can pick when sending a listing back.
- `listings.ts`, for the farmer:
  - `mine` and `get`.
  - `createDraft`, and saving each step: `savePhotos` (up to 6), `saveDetails`, `savePricing` and `saveFulfilment`.
  - `submit`: live straight away for trusted farms, otherwise sent for review.
  - `quickUpdate` and `bulkAction` (pause, resume, out of stock, delete).
  - Editing a live listing's photos, name, category or description sends it back for review, unless the farm is trusted. Price, stock and delivery changes apply at once.
  - Suspended farms can't create, submit or resume listings.
- `admin/listings.ts` (A-40 to A-43): `list`, `queue` (oldest first), `get` (photos and history), `approve`, `sendBack` and `unpublish`. Every staff action is audited.
- `farms.ts`: the setup checklist's "First listing" step is now real.

### App

- **Listings tab and page:**
  - `app/(farm)/listings.tsx`, F-20: status tabs with counts, search, Add, and Select mode (long-press or Select) with a bulk action bar (F-30).
  - `app/listing/new.tsx`: creates a draft, then opens the photos step.
  - `app/listing/[id]/index.tsx`: the listing page, with status, the staff note (F-31) and "Edit and resubmit". It has quick update (F-28), edit by section (F-27), pause and resume, out of stock, and delete (F-29).
- **The add/edit steps:**
  - `photos.tsx`, F-21: up to 6 photos, uploaded with progress and retry. Arrows reorder them and the first is the cover. Includes photo tips and the camera primer.
  - `details.tsx`, F-22: name, category, description, and harvest date (Today, Yesterday, a date picker, or "Not fresh produce").
  - `pricing.tsx`, F-23: one card per unit (up to 6) with price in ₦, stock and minimum order.
  - `fulfilment.tsx`, F-24: delivery and/or pickup.
  - `preview.tsx`, F-25: shows the listing as buyers will see it, with missing items linking to their step, edit shortcuts, and Submit, Publish or Resubmit.
  - `submitted.tsx`: F-26.
- **Shared pieces** (`src/features/listings/`):
  - `ListingStep.tsx`: Continue, Save as draft, or Save when editing.
  - `useListing.ts`: loads the listing for a step screen.
  - `status.ts`: tabs, badges, price summary, low-stock threshold.
  - `QuickUpdateSheet.tsx` and `ConfirmActionSheet.tsx`.
- `src/features/product/ProductDetailView.tsx`: the product page from the Figma Product detail frame. Used by the preview now, and by the buyer's product page in Phase 5.
- `src/components/ui/StepScreen.tsx`: the shared multi-step layout. The farmer application now uses it too.
- `app/(farm)/dashboard.tsx`: live listings count, "Running low" alerts (3 or fewer left), and an Add listing button when there are no listings.
- Small changes:
  - `src/lib/money.ts`: `parseNaira` and `nairaInput`.
  - `src/theme/tokens.ts`: new token `pendingInk`, replacing hard-coded amber text in six files.

## 2. Deviations from the spec and why

- **Photos are reordered with arrows, not drag-and-drop.** It works reliably everywhere and is accessible; drag can be added later.
- **Re-review rule for live listings:** content changes (photos, name, category, description) send an untrusted farm's listing back to review. Price, stock and delivery changes don't. The spec only says listings are reviewed until a farm is trusted.
- **Deleted listings are hidden, not erased,** so later order records still have the listing.
- **Push notifications** (listing approved or sent back, low stock) belong to Phase 9. For now the farmer sees the status in the app.

## 3. Bugs found and fixed

- A bulk find-and-replace produced `color=colors.pendingInk` without JSX braces in two files. Typecheck caught it, and it was fixed.
- Saving as a draft would have required complete fields. The step wrapper now tells each step whether the farmer pressed Continue or Save as draft.

## 4. Verification

- **Phase 4 backend test** against dev, run with a temporary staff role that was removed afterwards. **31 of 31 passed**, covering:
  - draft problems and the submit block
  - photo save, reorder and limit
  - date, duplicate unit, price and fulfilment validation
  - untrusted farm under review; the checklist updating
  - the review queue; send back with a note; resubmit; approve
  - quick update staying live; renaming going back to review
  - out of stock; bulk pause, resume and delete
  - unpublish
  - other farmers blocked; suspended farm blocked
  - trusted farm publishing instantly
  - history recorded
- `npm run typecheck`: no errors.
- `npx expo export --platform android` (7 MB) and `--platform ios` (6.8 MB): both bundled.
- `npx expo-doctor`: 21/21 checks passed.

**Not verified on a phone:** the listing screens haven't been checked in Expo Go.

## 5. Open questions and guessed decisions

- **The screens don't match the Figma designs closely enough** (feedback from testing in Expo Go). Next step: rebuild the screens batch by batch against the Figma frames. The backend and app logic stay as they are; this is visual work.
- Phase 4 is not committed yet. The last commit is `f4b169c` (Phases 1–3), which still needs pushing from your side.

## 6. What's next

Design pass, batch by batch, before Phase 5 (Storefront browsing).
