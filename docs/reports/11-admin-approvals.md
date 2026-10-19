# Phase 11: Admin Portal approvals (farmers, products, catalog, banners)

Branch: `admin-portal`. This is phase 2 of the Admin Portal plan. Its screens let staff review farmer applications and products, look after farms, and control what shoppers browse: categories, units and the home banner.

## 1. What was built, by file

### Backend (`convex/`)

- `admin/banners.ts` (new). Home banners (A-86) had a table but no admin functions. Added:
  - `list`, in display order. Each banner shows whether it's the one shoppers see now, and why one is hidden (listing not live, farm suspended or on holiday).
  - `create` and `update`, which only accept live listings.
  - `reorder` and `remove`, both written to the audit log.
  - Changing banners needs `content.manage`; viewing also allows `listings.view`.
- `admin/farmerRequests.ts`: new `counts` query (submitted and more-information applications, up to 99 each), for the tabs and the sidebar badge.
- `admin/farmers.ts`: `list` takes an optional `search`, using the existing `search_name` index, and returns `holidayMode` and `createdAt`.
- `admin/listings.ts`:
  - `list` takes an optional `search` (the existing `search_name` index, with category) and returns `liveAt` and `coverUrl`;
  - new `queueCount` for the "Product review" badge.
- All arguments added to existing functions are optional, so current callers are unaffected.

### Website (`web/src/`)

- Sidebar: a new "Farmers and products" group, with badges for applications and products waiting:
  - Farmer applications;
  - Farms;
  - Product review;
  - All products;
  - Categories;
  - Units;
  - Home banners.
- `app/admin/(portal)/farmers/applications/`: the list has tabs for waiting, more information asked, approved and rejected.
- The application page (`[applicationId]`) shows every section the farmer filled in:
  - the applicant;
  - farm details, with a Google Maps link;
  - what they grow;
  - collection hours;
  - payout account;
  - documents, each openable at full size;
  - history.
- Its Decision card offers three actions:
  - **Approve**, with a reason; this creates the farm.
  - **Ask for more**: pick sections, pick documents that need a new photo, and add a note.
  - **Reject**: reason, note, and when they can apply again (straight away, 1 week, 30 days or 90 days).
- `app/admin/(portal)/farmers/`: the farm list has Active and Suspended tabs and a name search, with trusted, holiday and setup badges.
- The farm page (`[farmId]`) shows the owner, farm, collection and availability, payout account, documents, live products (with a link to all of the farm's products) and activity. Its actions:
  - edit details;
  - mark or remove trusted;
  - suspend or reactivate;
  - per document: approve, ask for a new photo, or mark expired.
- `app/admin/(portal)/products/review/`: the review queue as photo cards, oldest first.
- `app/admin/(portal)/products/`: all products, with status tabs, name search and a category filter. `?farm=` shows one farm's products.
- The product page (`[listingId]`) has a photo gallery, details, a prices-and-stock table and the product's history. Its actions:
  - **Approve**;
  - **Send back** or **Take down**, with a reason from the backend's list plus an optional note.
- `app/admin/(portal)/catalog/`: categories. You can create, rename, choose the picture, edit types (the chips), hide or show, and reorder with Up and Down, then "Save order".
- `app/admin/(portal)/catalog/units/`: units. You can create, rename, retire or bring back.
- `app/admin/(portal)/banners/`: home banners. You can create or edit a banner, pick a live product by searching, turn it on or off, reorder and delete. Status badges say "Showing now", "Off" or "Hidden: why".
- Dashboard: adds "Farmer applications waiting" and "Products waiting for review".
- `components/admin/`:
  - new `FarmBits.tsx` (document grid, collection hours, history, map link) and `debounce.ts`;
  - `ui.tsx` gains `StatusBadge`, `SearchField`, `LoadMore` and `Photo`;
  - `ConfirmDialog` now takes form fields;
  - `labels.ts` gains farm, document, application and listing names and the new audit actions;
  - `routes.ts` and `nav.ts` gain the new pages.
- `convex/returns/adminFarms.ts` (new): return types for these screens.

## 2. Deviations from the spec and why

- **Category pictures are a fixed list.** The six pictures ship with the app (`assets/categories/*.png`), so the picture is chosen from those six. A new picture needs an app update; the form says so.
- **Reordering is saved in one go.** Categories and banners are moved with Up and Down, then saved once with "Save order", so a reorder is one audit entry instead of one per click.
- **Approving a product doesn't require a reason.** The note is optional, and "Approved" is used when it's left empty. Sending back and taking down always need a reason; the farm sees it.

## 3. Bugs found and fixed

- **Prettier changed the whole file.** Running Prettier on `convex/admin/listings.ts` reflowed it to an 80-character width; the repo uses longer lines. Restored the file and made the edit by hand, so the diff only has the change.
- **Dialog focus started in the wrong field.** Dialogs with their own fields (banner, category) put focus in the reason box at the bottom. It now goes to the first field.
- **Product history names.** It first used guessed event names. Checked them against `convex/listings.ts` (`created`, `submitted`, `published_trusted`, `pricing_changed`, `quick_update`, `pause`, `resume`, `out_of_stock`, `delete`) and the moderation events (`approved`, `sent_back`, `unpublished`).
- **Category filter layout.** The filter's label made it sit lower than the search box; it's now an inline select with an accessible name.

## 4. Verification

- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **31 passed, 1 failed.** The failure is the same `storefront.test.ts` Windows-path sample test as before (`C:/Users/Guesttt/...`).
- New test in `convex-tests/admin.test.ts`:
  - the application and product counts;
  - farm search ("musa" finds Musa Poultry) and product search;
  - banners: a listing that isn't live is refused; the first banner that's on is shown; reorder, switch off and delete work;
  - Finance can't change banners.
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes, with 24 `/admin` routes.
- **Visual check at 390px and 1440px**, using the sample-data preview copy (not committed):
  - the 11 new screens;
  - the "Ask for more" dialog on a phone, and the "New banner" dialog on desktop;
  - no page errors and no horizontal scroll.
  - The only console errors were the sample photo URLs (picsum.photos), which this environment's network blocks; real photos come from Convex storage.

## 5. Open questions or guesses

- **When a rejected farmer can apply again:** the options offered are straight away, 1 week, 30 days and 90 days (the backend accepts 0 to 365 days). 30 days is preselected.
- **Who sees banners:** staff with `listings.view` can see the banner list, but only `content.manage` can change it. The sidebar only shows Home banners to `content.manage`.

## 6. What's next

Phase 3 (operations):
- service areas, pickup points and delivery fees;
- platform rules (farm reply time, pickup hold days and so on);
- riders, including the new rider profiles (photo, ID, vehicle and plate, guarantor, bank details) and their review;
- the dispatch board;
- orders.
