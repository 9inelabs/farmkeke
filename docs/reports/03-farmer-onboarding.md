# Phase 3 - Farmer onboarding (in the app)

Date: 9 Oct 2026
Plan: `docs/build-plan.md` (Phase 3)

Result: any signed-in person can apply to sell from Account.

- **The application:** six steps with drafts saved as they go, document photos uploaded with progress and retry, and a reference number on submission.
- **Staff decisions:** staff approve, ask for more information, or reject using the admin stand-ins.
- **Once approved:** the person switches to farmer mode and sets up their farm. The farmer side has its own five tabs (Dashboard, Orders, Listings, Earnings, Farm).
- **Phone sign-in:** farmers can now sign in with their phone number.

Every screen uses the Figma style.

## 1. What was built, by file

### Backend (`convex/`)

- `schema.ts`, new tables:
  - `counters`: human-readable reference numbers
  - `farmerApplications`: all six steps' fields, status, decision details (`moreInfo` with sections and a note; `rejection` with reason, note and reapply date)
  - `farmerDocuments`: one row per photo, with kind, status (`pending` / `approved` / `rejected` / `expired`) and a staff note
  - `farms`: created on approval. Holds the profile, collection settings, open days and holiday mode, payout account, status (active or suspended), the trusted flag, and setup-checklist timestamps.
- `schema.ts`, shared validators: farm size, farm type, season, document kind, application status and section.
- `farmerApplications.ts`, for the applicant:
  - `mine`: the latest application, with document photo URLs, the problems listed per section, and the expected decision date.
  - `start`: creates a draft, or returns the open one. After a rejection it starts fresh with the bank details kept, once the reapply date has passed.
  - Saving each step: `saveFarm` (Nigerian mobile check), `saveProduce`, `saveCollection` (hours and lead-time check) and `savePayout` (known bank, 10-digit account).
  - Documents: `generateUploadUrl`, `addDocument` and `removeDocument`.
    - Uploads must be images under 10 MB.
    - ID, proof of address and the letter keep one photo each, replacing the old one.
    - Farm photos are limited to 10.
  - `submit`:
    - Terms must be ticked and every section complete.
    - The phone number must not belong to another account.
    - The phone is saved on the account (it becomes a sign-in method).
    - A reference is assigned from `FA-10001`; resubmitting keeps the same reference.
- `farms.ts`, for the farmer:
  - `mine`: the farm with its photo URL, categories and setup checklist. The payout account number never leaves the server; only the last 4 digits do.
  - `updateProfile` (F-70), `updateFulfilment` (F-71) and `updateAvailability` (F-72).
  - `myDocuments` and `replaceDocument` (F-73): only rejected or expired documents can be replaced, and replacements go back to `pending`.
- `lib/application.ts`: the application rules, in one place, shared by the backend's submit check and the app's review screen.
- `lib/banks.ts`: the Nigerian bank list, shared by the app and backend (placeholder Paystack codes).
- `lib/counters.ts`: transactional counters.
- `lib/uploads.ts`: checks an upload is an image under 10 MB, and deletes it if not.
- `lib/auth.ts`: `requireFarmer`.
- Admin stand-ins:
  - `admin/farmerRequests.ts` (A-20 to A-25):
    - `list` by status, oldest first.
    - `get`: everything, including document photo URLs and decision history from the audit log.
    - `approve`: re-checks completeness, creates the farm, approves the documents, and copies the collection days as open days.
    - `requestMoreInfo`: chosen sections, a note, and optionally flags specific documents for a new photo.
    - `reject`: reason, note, reapply after N days.
  - `admin/farmers.ts` (A-30 to A-33):
    - `list` by status, with a "set up" flag.
    - `get`.
    - `setSuspended` (F-15), `setTrusted` (A-31) and `updateDetails` (phone uniqueness re-checked).
    - `reviewDocument`: approve, ask for a new photo, or mark expired, with a note required for the last two.
  - `admin/staff.ts`: `setStaffRoleByEmail`, CLI-only (internal), audited. It lets someone with deployment access give or remove a staff role. It was used for testing, and the one-time `bootstrapSuperAdmin` stays unused for your own account.

### App: applying to sell (`app/sell/`, `src/features/farmer/`)

- `sell/index.tsx`, F-01:
  - Benefits, how payouts work (four steps), the commission note, and what you'll need.
  - "Apply now", or "Continue your application" when there's a draft.
  - Guests get the F-02 sign-in sheet (reusing M-59).
  - Applying again before the date returns "You can apply again from …".
- `sell/apply/farm.tsx`, F-03:
  - Farm name, phone (becomes a way to sign in), state (searchable picker), LGA, address.
  - "I'm at the farm: use my location" saves GPS coordinates.
  - Farm size and type.
- `sell/apply/produce.tsx`, F-04: illustrated category tiles (multi-select), main crops, typical volumes and seasons.
- `sell/apply/collection.tsx`, F-05: collection address (defaults to the farm address), days and hours, and preparation time.
- `sell/apply/documents.tsx`, F-06 and F-06a:
  - One card per document, with Take photo and Choose from gallery.
  - Farm photos can be picked several at once, with an "n of at least 3" counter.
  - Upload thumbnails show a progress bar; a failed upload shows Retry or Discard.
  - Staff-flagged documents show their note in red.
  - The camera primer appears before the system prompt.
- `sell/apply/payout.tsx`, F-07: bank (searchable), account number (digits only, 10), account name, and a privacy note.
- `sell/apply/review.tsx`, F-08:
  - A summary card per section, with Edit and any problems in red.
  - The farmer terms checkbox, with a link to the terms.
  - Submit (or "Resubmit" for F-09b).
  - Errors explained: phone taken, incomplete.
- `sell/submitted.tsx`: F-09, with the reference.
- `sell/status.tsx`:
  - F-09a Under review: submitted date, expected decision date, reference.
  - F-09b More information needed: the staff note, a button per section to update, then Review and resubmit.
  - F-09c Approved: what's next, and Switch to farmer mode.
  - F-09d Not approved: the reason and note, the reapply date or a "Start a new application" button, and Contact support.
  - Drafts redirect to the next missing step (F-09e).
- `ApplyStep.tsx`: the step layout, with a "Step n of 6" progress bar, the staff note when changes were requested for this step, and a pinned footer.
- `StepFooter.tsx`: Continue (checks this step) and "Save and finish later" (saves without checking and returns to Account).
- `useApplication.ts`: step screens redirect to the status page if the application can't be edited.
- `constants.ts`: option labels, steps, documents, and the next missing step.
- `HoursEditor.tsx`: day chips plus from/to times (5 AM–9 PM), with a plain-words summary ("Mon–Sat, 8 AM–5 PM").
- `usePhotoUploads.ts`: shrink to 1600px JPEG, upload with progress (XHR), retry and discard. Shared by F-06, F-70 and F-73.
- `PhotoTiles.tsx`: thumbnails, pending tiles and photo buttons, plus `CameraPrimer` (F-06a).
- `src/lib/upload.ts`: camera and gallery picking (SDK 57 `mediaTypes: ["images"]`), the camera-primer check, resizing with the SDK 57 `ImageManipulator.manipulate` API, and upload with progress.
- `SellingEntry.tsx`, the Account selling entry:
  - Sell on Farmkeke
  - Continue your application (F-09e), with a progress bar
  - Under review (F-09a), more information needed (F-09b), not approved (F-09d)
  - Switch to farmer mode, once approved

### App: farmer mode (`app/(farm)/`, `app/farm-settings/`)

- `(farm)/_layout.tsx`:
  - Farmer tabs: Dashboard, Orders, Listings, Earnings, Farm.
  - Non-farmers go back to shopping.
  - Suspended farms see F-15 ("Selling is paused", with the reason, Contact support and Switch to shopping).
- `(farm)/dashboard.tsx`, F-10 shell:
  - Farmer-mode badge, greeting and farm name.
  - The setup card while setup is incomplete, and a holiday-mode notice.
  - New orders and to-prepare counts, money held and released (₦0), and the empty state.
- `(farm)/sales.tsx`, `listings.tsx`, `earnings.tsx`: the F-40, F-20 and F-60 shells with empty states (Earnings shows Held, Released and Paid out at ₦0).
- `(farm)/farm.tsx`, Farm tab:
  - Farm photo or initials, location, "Verified farm" and "Trusted" badges.
  - The setup card.
  - Rows for business profile, fulfilment (with a live summary), availability (live summary) and documents.
  - A payout account notice.
  - Help rows.
  - Switch to shopping (F-13).
- `farm-settings/setup.tsx`: F-14 checklist (profile and collection link through; the first listing opens in Phase 4).
- `farm-settings/profile.tsx`: F-70 farm photo upload, name, description (600 characters) and address.
- `farm-settings/fulfilment.tsx`: F-71.
- `farm-settings/availability.tsx`: F-72 day chips and a holiday-mode switch.
- `farm-settings/documents.tsx`: F-73 status badges per photo, the staff note, and re-upload for flagged documents.
- `farm-settings/help.tsx`: F-90, six guides.
- `farm-settings/support.tsx`: F-91, email.
- `farm-settings/terms.tsx`: F-92 summary (placeholder).
- `SwitchModeSheet.tsx`: F-13, with Shopping and Farmer mode cards, the current one marked.
- `useSwitchMode.ts`: switches mode (cart and orders are kept).
- `useFarm.ts`: guard for farm settings screens.
- `SetupCard.tsx`: summary card for the setup checklist.

### App: shared changes

- `store/prefs.ts`: `mode` ("shop" or "farm"), saved on the phone. The splash opens the dashboard when the phone was last in farmer mode.
- `lib/session.ts`: signing out returns to shopping mode.
- `features/shell/TabBar.tsx`: farmer tabs use line icons at the same weight, since only the shopping tab icons were designed.
- New components:
  - `SelectField`: a field that opens a searchable bottom-sheet list.
  - `ChipGroup`: single or multiple choice.
- New content files: `content/nigeria.ts` (36 states and the FCT) and `content/farmerHelp.ts`.
- `app.json`: the image picker no longer adds a microphone permission (`microphonePermission: false`).

## 2. Deviations from the spec and why

- **F-03 map pin.** Instead of dragging a pin on a map, "I'm at the farm: use my location" records GPS coordinates. Maps need a Google Maps key, which arrives in Phase 6. The location is optional, and staff see the coordinates.
- **LGA is free text,** not a picker. A full list of the 774 LGAs can be added with the area admin data.
- **Phone is saved on the account at submission, not at approval.** The phone has to be checked as unique at submission anyway, and it means applicants can already sign in with it. Rejected applicants keep it, which is harmless.
- **Decisions aren't pushed or emailed yet.** Push and email arrive in Phase 9 (the notification events table). Until then, applicants see the result on the Account card and the status page.
- **F-12 notification primer:** per the spec, it belongs to Phase 9.
- **Payout account (F-62) is read-only.** The Farm tab shows the bank, the last 4 digits and the account name. Changing it means contacting support until live payments (Phase 7) add verified editing.
- **F-14's "First listing" step** is shown but not tappable until listings exist (Phase 4).
- **F-91 contact support is email only.** In-app support chat arrives in Phase 8.
- **F-92 farmer terms** show a plain-language summary until the legal text arrives.
- **Commission copy:** the rate is still undecided, so F-01 says "a small commission… we'll confirm the rate with you before your first listing goes live."
- **A-20 assignee and A-21 internal notes** aren't built. The queue returns submission times (so waiting time can be shown), and the decision history comes from the audit log.
- **Farmer tab icons** are line icons (lucide), not designer artwork.
- **Open days on approval** are copied from the application's collection days. The farmer can change them in Availability.

## 3. Bugs found and fixed

- **`StyleSheet.absoluteFillObject` no longer exists in React Native 0.86** (caught by typecheck). The positioning is now written out.
- **The image picker plugin adds `RECORD_AUDIO` by default.** It's now disabled (`microphonePermission: false`). Phase 1 had removed that permission, and the picker would have brought it back.
- **Business profile photo tracking (found in review):** the screen rebuilt a fake "ref" on every render, so the upload callback could attach the wrong photo or an empty one. It now uses a real `useRef`.
- **No way to review a single document after approval.** F-73 lets farmers re-upload a flagged document, but staff had nothing to flag or re-approve it with. Added `admin/farmers:reviewDocument` and tested the full loop.
- **Stray non-route exports and `as never` casts** in four files (found in review). Removed.
- **The documents step had two button conditions that together meant "always show".** Simplified.
- **The "Chat with us (coming soon)" row on F-91 opened email,** which was misleading. Removed.
- **Test harness only:** on Windows, `npx convex run` received mangled JSON through the shell. The tests now call the Convex CLI's JS entry directly. One Phase 2 assertion still checked an old plain-text error and was updated to the `ACCOUNT_REQUIRED` code.

## 4. Verification

All commands were run from the repo root.

- `npx convex dev --once`: "Convex functions ready!" after every backend change, with no type errors.
- **Phase 3 backend test** (Node `ConvexHttpClient` against dev; a test account was given the Operations role with `setStaffRoleByEmail`, and the role was removed at the end). **39 of 39 passed.**
  - **Before submitting:**
    - With no application, `mine` returns null.
    - A guest gets `ACCOUNT_REQUIRED`; a bad phone gets `INVALID_PHONE`.
    - A fresh draft lists problems in every section.
    - A non-image upload gets `UPLOAD_NOT_IMAGE`.
    - Submitting incomplete gets `INCOMPLETE`.
    - A completed draft has no problems; its 6 documents have URLs.
    - A second ID photo replaces the first.
    - Submitting with terms unticked gets `TERMS_REQUIRED`.
  - **Submitting and the decision:**
    - Submission returns an `FA-#####` reference and saves the phone to the account in +234 format.
    - Editing after submission gets `NOT_EDITABLE`.
    - An applicant using the admin queue gets `FORBIDDEN`.
    - The application appears in the queue.
    - Requesting more info flags the ID; the applicant sees `more_info` with the note.
    - A new ID photo and resubmission keep the same reference.
    - Approval creates an active, untrusted farm, hides the account number (last 4 = 6789), and sets open days to Mon–Sat.
    - The checklist starts incomplete.
    - Approving twice is refused; starting another application gets `ALREADY_FARMER`.
  - **Phone sign-in:** spaced `080x xxx xxxx` signs in as the farmer's account, `+234…` works too, and a wrong password with a phone gets `INVALID_CREDENTIALS`.
  - **Farm settings:**
    - Profile (with photo) and fulfilment tick the checklist.
    - Availability de-duplicates and sorts days; holiday mode saves.
    - A bad lead time gets `INVALID_LEAD_TIME`.
    - Documents are approved after approval; an approved document can't be replaced.
    - Suspend, reactivate and trusted all work.
    - A non-farmer editing a farm gets `NOT_FARMER`.
  - **Second applicant:**
    - Using the first farmer's phone gets `PHONE_TAKEN`.
    - After a rejection, the reason is visible.
    - Reapplying starts a new draft with the bank details kept and no documents.
  - **Cleanup:** the test staff role is removed (`FORBIDDEN` afterwards).
- **F-73 document loop test: 5 of 5 passed.**
  - Flagging without a note is refused.
  - The farmer sees "expired" with the note.
  - A replacement goes back to "pending" and the note clears.
  - Staff re-approve.
  - A farmer can't review documents (`FORBIDDEN`).
- **Phase 2 regression test** after the schema changes: 20 of 20 passed, after updating the one outdated assertion.
- `npm run typecheck` (app and Convex): no errors.
- `npx expo export --platform android` (6.9 MB) and `--platform ios` (6.7 MB): both bundled.
- `npx expo-doctor`: 21/21 checks passed.

**Not verified:** nothing has been run on a phone yet. Still untested on a device:

- the camera, gallery and permission prompts
- resizing and upload progress
- GPS capture
- the step-by-step flow and the farmer tabs

The upload path depends on React Native's XHR sending a local file `{ uri, type, name }`. That's standard in React Native, but it's the most likely thing to need adjusting on a device.

## 5. Open questions and guessed decisions

- **Testing on a phone** still needs `npx eas init` and a development build (see the Phase 2 report). Phase 3 adds camera, gallery and upload, which only a device build can exercise.
- **Bank codes** are placeholders. They follow Paystack's codes and will be checked against Paystack's live bank list in Phase 7.
- **Leftover uploads.** A photo uploaded but never attached (the app closed mid-upload, or a failed commit) stays in storage. A small scheduled clean-up can be added in a later phase.
- **Review time copy** says "usually within 2 working days". Confirm the target you want to promise.
- **Commission rate** is still open (A-84). The F-01 copy promises to confirm it before the first listing.
- **Test data on dev:** test applicants, farms (Okafor Family Farms, Ada Greens) and `staff+…@farmkeke.test` accounts, now without roles, exist on the dev deployment only.
- **Not yet done, from the Phase 1 and 2 reports:**
  - Resend key and sender
  - your Super admin bootstrap
  - the app icon
  - the three category illustrations
  - legal and farmer terms text
  - deleting `.env`, `.expo/` and `supabase/.temp/`
  - **Nothing is committed yet.**

## 6. What's next

Phase 4 - Listings:

- F-20 Listings with status tabs (Live, Under review, Needs changes, Out of stock, Paused, Draft), search and bulk select.
- F-21 to F-26: add listing with photos, details, price, unit and stock, fulfilment, preview and submit.
- F-27 to F-31: edit, quick update, pause, out of stock or delete, bulk actions, and fixing a listing staff sent back.
- Admin stand-ins A-40 to A-43: all listings, the review queue, listing detail, send back or unpublish. Trusted farms' listings go live without review.
- The F-14 "First listing" step becomes live.
