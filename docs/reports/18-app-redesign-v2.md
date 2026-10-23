# Phase 18: App redesign v2 (new designs, own icons, toast options)

The app now follows the eleven updated designs: Home, Categories, Search, Product detail, My Cart, Empty cart, Cart changes, Sign In, Create Account, Forgot Password and Location. The other screens pick up the same style through the shared components. Lucide icons are gone, replaced with Iconsax line and solid icons, the family the designs use. Four toast animations are built for the founder to choose from; the live "added to cart" toast stays as it was until one is chosen.

## 1. What was built, by file

### Icons

- `src/components/icons/glyphs.ts` (new): the outlines of the 93 Iconsax icons the app uses, in line and solid styles. They're taken from `iconsax-react-native` (MIT licence), so the app bundles only these and not the whole package.
- `src/components/icons/index.tsx` (new):
  - Named icon components (`Home`, `Cart`, `Shop`, `Pin`, `Verified` and the rest) with `size`, `color` and `strokeWidth` props.
  - `variant="solid"` switches to the solid style; so does any `fill` other than `"none"`.
  - Six simple marks Iconsax doesn't have are drawn on the same grid: close, check, circle, sprout, leaf and bike.
  - `IconComponent` replaces lucide's `LucideIcon` type.
- 87 files moved from `lucide-react-native` to `@/components/icons`. A script renamed only the imported names, using the TypeScript syntax tree, so screen text such as "Store" was left alone.
- `lucide-react-native` is removed from `package.json`.
- `src/features/shell/TabBar.tsx`:
  - Every tab, shopper and farmer, uses the new icons.
  - The chosen tab's icon turns solid. The older PNG tab icons are no longer used.

### Shared look

- `src/theme/tokens.ts`:
  - `limeInk` (#6E9F24): lime dark enough for small link text on white.
  - `surfaceSoft` and `canvas`: grey grouped rows and the cart background.
  - `danger`: the red "Remove".
  - `info` and `infoSoft`: the blue "Now 2" tag.
- `src/theme/typography.ts`: `screenTitle` (28/34, semibold) for the large "< Title" headers.
- `src/components/ui/ScreenHeader.tsx`: the bigger title beside the chevron. The tab roots (Orders, Account, and the farmer tabs) use the same size.
- `src/components/ui/Button.tsx`:
  - A `black` variant for form submits.
  - `pill` for fully rounded floating buttons.
  - `iconRight`, for "Checkout" with its arrow.
- `src/components/ui/TextField.tsx`:
  - Grey filled fields with a light outline that turns lime when focused.
  - The password eye sits just outside the field, as in the sign-in design.
- `src/components/ui/Segmented.tsx` (new): the Sign in / Create Account switch. A lime marker slides to the chosen tab on a spring.
- `src/components/ui/BottomSheet.tsx`:
  - Sheets rise on a soft spring and drop away quickly.
  - The top corners are rounder (32).
  - `handle={false}` hides the grab bar.
- `src/components/ui/EmptyState.tsx` and `StatusScreen.tsx`: a lime circle with a solid icon, and a dark green pill button, as in the empty-cart design.
- `src/components/ui/HeaderPills.tsx`: `BellButton`, the tint square with a dot while anything is unread.
- `src/components/ui/ProductCard.tsx`: `compact` for three-across grids.

### Designed screens

- **Home** (`src/features/home/HomeView.tsx`, `app/(shop)/home.tsx`):
  - The greeting comes first: "Good morning, Ada", with the first name for signed-in shoppers.
  - Under it are the area pill and the bell, which shows a dot while notifications are unread.
  - Farm photos in "Farmers Near You" are larger.
- **Notifications** (`app/notifications.tsx`, new):
  - The bell opens the shopper's notifications: newest first, unread ones tinted.
  - "Mark all read" sits in the header.
  - Tapping one marks it read and opens what it's about.
- **Categories tab** (`app/(shop)/categories.tsx`):
  - Category tiles in a row, with the chosen one filled lime.
  - Below them, the category's name, a count and a "Filter" link to the full category page, then its products three across, loading more as you scroll.
  - `src/features/shop/ProductGrid.tsx` gained `columns={3}`.
- **Search** (`app/search.tsx`):
  - "< Search" header, with the pill under it.
  - "RECENT SEARCHES" with Clear, the recent searches in a grey rounded card with a clock and a chevron, then "Browse Categories" as a sideways row.
- **Product detail**:
  - `src/features/product/ProductDetailView.tsx`:
    - A taller photo, with the quantity stepper bottom-left and "1 of 4 photos" bottom-right.
    - A rounded white card overlapping the photo. It holds the name, a large price with "per basket" in lime, and the heart in a white circle.
    - "Other units" pills; the chosen one is outlined in lime and shows its price.
    - A farm card with a verified tick on the photo and a "View Farmer" pill.
    - Delivery and pickup, the description, and the escrow promise.
    - The farmer's listing preview leaves out the stepper, the heart and the link.
  - `app/product/[id].tsx`:
    - "< Back" and a cart button with an orange count at the top.
    - A full-width lime "Add To Cart" pill. It adds the chosen unit and quantity straight away and shows the added toast.
    - The stepper respects the minimum order, and the stock left after what's already in the cart.
- **My Cart** (`app/(shop)/cart.tsx`, rebuilt):
  - One white card per farm. Each has the farm's photo or initials in a ring, the name, and "area • N items".
  - Item rows show the photo, name, "₦4,500 per basket", the stepper, the line total and a red "Remove".
  - Each card ends with the farm's subtotal on a tint bar.
  - "Items Total" and a dark green "Checkout" pill sit at the bottom.
  - The cart is checked against the server with `api.checkout.quote`. If anything changed, a "Review" strip appears and Checkout opens the changes sheet first.
- **Empty cart**: the lime circle, "Your cart is empty", and a dark green "Start shopping".
- **Cart changes** (`src/features/cart/CartChangesSheet.tsx`, new):
  - "Two things changed in your cart", with the explanation.
  - Each change is listed:
    - Old price struck through, with the new price.
    - "Only 2 bunches left; you had 3", with a blue "Now 2".
    - Sold out or removed.
  - "Update cart" brings the cart in line with the server.
- **Checkout** (`app/checkout.tsx`, new): a holding screen until batch B. It says paying in the app comes in the next update, and that the cart is saved.
- **Sign In / Create Account** (`src/features/auth/AuthScreen.tsx`, `app/(auth)/sign-in.tsx`, `create-account.tsx`):
  - "< Close" at the top left.
  - The centred wordmark with "...from the farm, directly to your home".
  - A centred "Welcome Back" or "Setup Your Account".
  - The Sign in / Create Account switch, the new fields, a black "Continue", and an underlined lime "No account yet? Create one" or "Already have an account? Sign In".
- **Forgot Password** (`src/features/auth/ForgotPasswordSheet.tsx`, new): a sheet over Sign in with "✕ Close", "Reset Your Password", the email field and a black "Send reset link". `/forgot-password` now opens Sign in with the sheet up, so old links still work.
- **Location** (`app/(onboarding)/location.tsx`): only the wording changed; the layout already matched.

### Wording: no more pickup points

Pickup is now at the farm, with a 4-digit code. These places still mentioned pickup points and now say so:

- Welcome slide 2 (`app/(onboarding)/welcome.tsx`).
- The location screen, and the phone's location-permission text in `app.json`.
- The "Not on the list?" line on Choose your area.
- The outside-area screen: the "Nearest pickup point" block is removed, and it now offers the email alert only.
- The help answer "How does pickup work?" and the "How it works" step (`src/content/help.ts`).
- The farmer's listing option "Pickup at your farm" (`app/listing/[id]/fulfilment.tsx`).

### Toast options (for approval)

- `src/components/feedback/LiquidToast.tsx` (new): one toast with four ways to arrive and leave:
  - **A. Island morph**: a dark dot drops in at the top and stretches sideways into the message, like the iPhone's Dynamic Island. It shrinks back to a dot to leave.
  - **B. Liquid drop**: falls from the top, squashes slightly as it lands and wobbles back into shape.
  - **C. Soft spring**: slides down and settles with a gentle overshoot.
  - **D. Rise from cart**: a lime bead rises from the Cart tab and swells into the message.
- All four run on Reanimated springs on the UI thread. With reduce motion turned on, they become a plain fade.
- `app/dev/toasts.tsx` (new): open `/dev/toasts` in the preview and tap Play on each one.

## 2. Deviations from the designs and why

- **"Remember this info everytime"** on Sign in isn't built. The app already keeps you signed in. A working "don't remember me" would need sign-out on the next launch, and a checkbox that does nothing would mislead. It can be added if wanted.
- **The chosen tab turns solid** instead of staying a line icon. It's easier to see at a glance.
- **Categories tab, three across**: the design's third column runs off the screen. The build fits three narrower cards on the screen, with slightly smaller type. Freshness tags only show in the two-column grids, because at that width they would be cut off.
- **Product page**: the design draws it as a card over the dimmed previous screen. Opening it as a modal would break moving on to farms and other products, so it stays a full screen. The overlapping rounded card gives the same layered look.
- **"Add To Cart" is pinned** at the bottom instead of sitting after the escrow card, so it's always in reach.
- **Small lime text** (links, "Clear", "3 items · Filter") uses a deeper lime (#6E9F24). The design's lime on white is too faint to read at small sizes. Large lime areas are unchanged.
- **Greeting**: it follows the time of day, and has no name for guests.

## 3. Bugs found and fixed

- On the first recordings, the Island and Rise toasts sprang wider than the screen, so their corners were clipped. The scale overshoot also made them wobble. Width and scale are now capped, and the springs retuned. This only showed when playing the animations in the browser.
- The first three-column grid cut prices to "₦6,0…": the web build doesn't shrink text to fit. Fixed with the compact card.
- Removing the pickup-point block left unused imports and styles in the outside-area screen; these were cleaned up.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 8 files, 53 tests passed. There are no backend changes in this phase.
- `npx expo export --platform web --output-dir app-preview/dist --clear` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and screenshotted it with Playwright at 390 x 844:
  - home, categories, search, product (and scrolled), the added toast;
  - a two-farm cart filled through the product page, with one price made stale to trigger the changes sheet;
  - the empty cart, sign in, the forgot-password sheet, create account, location, notifications;
  - account, orders, saved, choose area, welcome, get started, outside area, sell, help, about, legal, category, checkout.
  - No console errors on any of them.
- Each toast animation was recorded as video and checked frame by frame.
- Not run on an Android or iOS device in this environment.

## 5. Open questions or decisions that had to be guessed

- **Which toast animation, A, B, C or D?** Once chosen, it replaces the "added to cart" toast, and the same motion is used for other confirmations.
- **Should the website drop lucide icons too?** The website (`web/`) still uses `lucide-react` in 94 files.
- **Notifications**: the bell opens the new list, but order links (`/order/…`) only resolve once batch C adds the order screens.

## 6. What's next

- Apply the chosen toast.
- Batch B: checkout with the delivery bill, pickup at the farm, and Paystack in an in-app browser. It replaces the checkout holding screen.
