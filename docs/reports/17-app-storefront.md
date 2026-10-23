# Phase 17: Mobile app storefront (batch A)

The first batch of the remaining app work (build plan section 7). Shoppers can now browse, search, filter, open products and farms, save items and add to the cart. The browser preview is set up too.

## 1. What was built, by file

### Browser preview

- `app-preview/vercel.json` and `app-preview/README.md` (new):
  - The app's web build (`expo export --platform web`) as its own Vercel project with Root Directory `app-preview`.
  - Every route falls back to `index.html`, and search engines are told not to index it.
  - Builds are skipped when a push doesn't touch the app.

### Shared pieces

- `src/store/cart.ts` (new): the cart on the phone (zustand, persisted to AsyncStorage).
  - Same rules as the website cart: adding raises an existing line's quantity up to the stock, and the cart holds at most 50 lines.
  - `restore` puts back a removed line (for "Undo" in batch B).
  - `useCartSummary` gives the count, the products total and the farm count; `quoteItems` gives the checkout shape.
- `src/store/shopUi.ts` (new): which listing's add-to-cart sheet is open, and the last item added (for the toast).
- `src/store/searches.ts` (new): recent searches on the phone, newest first, at most 8.
- `src/lib/day.ts` (new): `localDay()`, the phone's date as `YYYY-MM-DD`.
- `src/features/shop/`:
  - `useShopContext.ts`: today's date and the chosen area for the storefront queries.
  - `ProductGrid.tsx`: a two-column grid that fills the screen width, with skeletons, a "Sold out" or freshness tag on each card, and paging when you reach the end.
  - `ProductRow.tsx`: a titled sideways row of cards.
  - `AddToCartSheet.tsx` (M-19):
    - Reads the listing fresh (`checkout.listingForCart`), so the price and stock are current.
    - Unit chips when there are several units, and a quantity stepper from the minimum order up to the stock left after what's already in the cart.
    - A live line total, and a sold-out state.
  - `AddedToast.tsx` (M-20): "… added to your cart · View cart" at the top for 3.5 seconds.
  - `FilterSheet.tsx` (M-16):
    - Sort: newest, freshest, price low or high, top-rated farms.
    - Filters: get it by delivery or pickup at the farm; price bands; harvested within 1, 3 or 7 days; farm rating 4+.
    - `filterArgs` turns the choices into storefront arguments.
  - `ResultsBar.tsx`: the "24 products · Filter (2)" row.
  - `PhotoViewer.tsx` (M-18): full-screen photos you swipe between.

### Screens

- `app/(shop)/home.tsx` (M-10): search, categories, products, the add button, the banner and farms now open their screens.
- `app/(shop)/categories.tsx` (M-11): a search pill and every category with its product count, opening M-12.
- `app/category/[slug].tsx` (M-12): type chips with counts, "N products from N farms", filters, paging, and an empty state.
- `app/search.tsx`:
  - M-13: recent searches (with Clear), category tiles, and "Popular right now".
  - M-14: results as you type, 300 ms after typing stops. Matching farms come first, then products, with filters and paging.
  - M-15: no results, with category suggestions and a clear button.
- `app/product/[id].tsx`:
  - M-17: the photo gallery, price per unit, stock, unit choice, and the farm card with its rating (opens the farm).
  - Delivery is "priced after the farm accepts, then you pay one bill", and pickup is "collect from the farm, no fee".
  - Save with the heart; guests get the sign-in prompt (M-59).
  - "More from this farm" and "Similar items" rows, and a pinned "Add to cart" bar.
  - M-22: removed, paused or farm unavailable, with similar items. A farm on a break shows the product with a notice and no add button.
- `app/farm/[id].tsx` (M-21):
  - Photo or initials, verified badge, area and "selling since".
  - Rating, product count and acceptance time.
  - Delivery and pickup chips, description, a break notice, category chips and the product grid.
- `app/saved.tsx` (M-86): saved items with "Sold out" and "Back in stock" tags. Visiting resets the back-in-stock tags (`favorites.markSeen`). Guests are asked to sign in.
- `app/(shop)/account.tsx`: a "Saved items" row.
- `app/(shop)/_layout.tsx`: the Cart tab shows how many items are in the cart.
- `app/_layout.tsx`: the add-to-cart sheet and toast are drawn once at the root.

### Component changes

- `src/features/product/ProductDetailView.tsx` gains optional props: `onPhotoPress`, `onFarmPress`, the farm's rating, and `deliveryNote` / `pickupNote`. The farmer's listing preview (F-25) doesn't pass them and looks as before.
- `src/components/ui/SearchPill.tsx`: an `onClear` button inside the pill, and no second browser focus outline on web.

## 2. Deviations from the spec and why

- **Delivery wording.** M-17 shows no delivery fee or time. Delivery is priced per order after the farm accepts (report 16), so the page says that instead. There are no pickup points any more, so pickup reads "Collect from the farm in (LGA). No fee".
- **"Picked today", not a time estimate.** The spec's "fee and time estimate" for delivery isn't available until a rider is assigned.
- **Search filters** use the website's set: sort, delivery or pickup, price, freshness and rating. A "farm location" filter (M-16) isn't included yet. The backend supports it (`farmLga`/`farmState`), so it can be added if wanted.
- **"See all" on Home** still opens All categories. A dedicated "Fresh Picks" grid (`storefront.collection`) can come later if wanted.

## 3. Bugs found and fixed

- On the search screen, the clear "×" sat outside the pill and overlapped the round search button. It now sits inside the pill.
- The browser drew a yellow focus outline inside the search pill. It's removed on web; the pill is the field's outline.
- Long freshness tags ("Harvested 10 days ago") were cut off on cards. They now use the card's width and shrink slightly if needed.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded. I served it with the same fallback as the Vercel rewrite and screenshotted at 390 x 844 with Playwright: home, categories, search (empty, results, clear), category, product, the add-to-cart sheet, the added toast, the farm page and saved items (guest). No console errors on any screen.
- I added Fresh tomatoes through the sheet and checked the toast and the cart count.
- Not run on an Android or iOS device in this environment. The browser preview stands in until the Vercel project is connected.

## 5. Open questions or guesses

- Should "See all" open a full "Fresh Picks" or "Picked Today" grid instead of the categories? I kept the existing behaviour for now.
- The price bands in the filter (under ₦2,000, ₦2,000 to ₦5,000, ₦5,000 to ₦10,000, over ₦10,000) are a guess at useful steps for produce.

## 6. What's next

Batch B: the cart (M-30 to M-32) and checkout, with the delivery bill flow and pickup at the farm. Paystack payment runs in an in-app browser.
