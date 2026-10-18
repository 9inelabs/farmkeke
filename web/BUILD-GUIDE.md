# Farmkeke website: build guide

Every person or agent building pages in `web/` follows this guide. Read all of it before writing code.

## 1. Sources of truth

| What | Where |
|---|---|
| Features, rules and stack | `farmkeke-docs/PRD.md` (newest). Detailed per-screen rules and copy for the matching app screens are in `assets/new assets/Documentation/Farmkeke — Screen Inventory & Build Plan(MAIN).md`. |
| Approved screen designs | `farmkeke-docs/design/website/*.dc.html`, listed in `DESIGN-INDEX.md`. Match their layout, spacing, colours, fonts, copy and states closely. |
| Live backend functions | `web/convex-spec/live-function-spec.json`. Print a readable list with `node scripts/spec.mjs convex-spec/live-function-spec.json <prefix…>` (run from `web/`). |
| Real responses | `web/convex-spec/samples/*.json` |
| Next.js 16 docs | `web/node_modules/next/dist/docs/`. This Next.js has breaking changes; read the relevant guide before using an API. |

**How to read a `.dc.html` design:**
- `sc-for` means "repeat this".
- `sc-if` means "show when".
- `{{…}}` is sample data.
- The `class Component extends DCLogic` script holds sample state and the interactions.
- The CSS in `<style>` gives exact values.
- The width is 1440 (desktop). The `@media (max-width:760px)` rules are the phone layout.

## 2. The backend: read-only and live

The website uses the live Convex deployment the mobile app uses. **Never touch the repo's `convex/` folder.** Don't create, edit or delete anything in it, and don't run any of these:
- `npx convex dev`
- `npx convex deploy`
- `npx convex codegen`
- `npx convex import`
- `npx convex env set`

The reason is in `farmkeke-docs/pending-backend/README.md`.

### Calling functions

Use `import { api } from "@/convex/api"`. It's generated from the live spec, so argument types are exact. Return types are `any`, so declare the shapes you read in **your own** `src/convex/returns/<area>.ts`, based on the samples. Shared shapes are in `src/convex/returns/common.ts`, which is read-only for you.

```tsx
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/api";
import type { OrderDetail } from "@/convex/returns/orders";
const order = useQuery(api.orders.consumer.get, { orderId }) as OrderDetail | null | undefined;
```

### Seeing real responses

You may run **queries only** from the repo root. Example:

```
npx convex run storefront:product '{"id":"…"}'
```

Never run mutations or actions from the command line, never use `--identity`, and never read the `users` table. For data that needs a signed-in user, write the type defensively, treating optional fields as optional, and handle `null` and `undefined`.

**Errors.** Backend errors arrive as `ConvexError` with a `data.code`. Read them with `errorCode(e)` and `errorData(e)` from `@/lib/auth`. Always show a plain-language message that says what happened and what to do next. Form errors go under the field.

**Money.** All amounts are in kobo. Display them with `naira()` from `@/lib/format`.

## 3. Rendering: Cache Components is on

`next.config.ts` has `cacheComponents: true`. The rules:

1. **Shop, category, search, product and farm pages must be server-rendered** so Google can read them. Fetch with `serverQuery(api.x.y, args)` from `@/convex/server`, inside a function marked `"use cache"` with `cacheLife("minutes")`. `src/app/(shop)/shop/page.tsx` is a working example.
   - Pages with `params` or `searchParams` must read them inside a `<Suspense>` boundary, or pass them to a cached function.
   - See `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`.
   - Use `generateMetadata` for titles and descriptions. Add Product JSON-LD on product pages.
2. **Never call `new Date()`, `Date.now()` or `Math.random()` while a server component prerenders.** Put them in a `"use cache"` function, a client component, or an event handler. `todayInLagos()` called inside a cached function is fine.
3. **Personal pages are client components** that use `useQuery`: cart, checkout, account, orders, chat. Show skeletons while loading, then fade the content in with `<Reveal>`.
4. A page file that needs hooks: keep `page.tsx` a server component that exports `metadata`, and render a client component from your folder.

## 4. Where things go

Route groups set the header and footer. URLs don't include the group name. **Don't render your own `<main>`**: the layouts already render `<main id="main">`.

| Group | Header / footer | Use for |
|---|---|---|
| `src/app/(site)/` | Marketing header and footer | Landing and information pages |
| `src/app/(shop)/` | Shop header with categories, shop footer | Shop, product, farm, cart, find order, tracking, problem, dispute |
| `src/app/(account)/` | Shop header, no footer | `/account/*` |
| `src/app/(checkout)/` | "Secure checkout" header | Checkout steps |
| `src/app/(focus)/` | None; the page draws its own | Sign-in and account pages, payment, single-purpose order pages |

In `(focus)` pages, use `MinimalHeader` from `@/components/layout/SimpleHeaders` where the design shows a logo bar.

All URLs are in `src/lib/routes.ts`. **Link only through `routes.*`.** If a route you need is missing, use the closest one and say so in your report. Don't edit `routes.ts`.

### Shared building blocks

These are owned by the foundation. Use them and don't edit them. Ask for changes in your report.

| What | Where |
|---|---|
| Styles and classes | `src/app/globals.css`: `wrap`/`wrap-site`, `h1` `h2` `h3` `p` `sm` `cap`, `card`, `btn lime\|dark\|ghost\|danger` (+ `sm`/`lg`), `chip`, `badge b-fresh\|b-held\|b-ok\|b-pend\|b-err\|b-grey`, `tile`, `lbl` `fin` `hint` `field-error`. Tailwind colours: `forest`, `lime`, `tint`, `canvas`, `ink`, `muted`, `subtle`, `line`… Phone variant: `m:`; desktop-only: `d:`. |
| Buttons | `Button`, `ButtonLink` (`@/components/ui/Button`) |
| Form fields | `TextField`, `PasswordField`, `PhoneField` (+234), `TextArea`, `SelectField` (`@/components/ui/Field`) |
| Toggle | `Switch` |
| Overlays | `Modal`, `Drawer` (`@/components/ui/Dialog`) |
| Other UI | `Accordion`, `Skeleton`, `LoadingRegion`, `CheckoutSteps`, `Timeline`, `EmptyState` |
| Products | `ProductCard`, `ProductCardSkeleton`, `AddToCartButton` (`@/components/shop/ProductCard`) |
| Brand | `Wordmark`, `HomeLogo`, `StoreButtons` (`@/components/brand/*`) |
| Cart | `cart`, `useCart`, `quoteItems`, `miniCart` (`@/lib/cart`), kept in the browser |
| Delivery area | `area`, `areaPicker` (`@/lib/area`) |
| Account | `useViewer`, `useEnsureIdentity`, `errorCode` (`@/lib/auth`) |
| Formatting | `naira`, `plural`, `todayInLagos`, `shortDay`, `clock`, `dateTime`, `initials`, `tintFor`, `displayPhone` (`@/lib/format`) |
| Motion | `FadeUp`, `Reveal`, `Stagger`, `StaggerItem`, `m`, `AnimatePresence`, `transition`, `pressable` (`@/lib/motion`) |

**Logo.** The wordmark (`Wordmark` / `HomeLogo`) is the **only** logo. Where a design shows two images (mark + wordmark), use one `HomeLogo`. Never draw a shield or icon mark.

**Images.** Product and farm photos come from Convex storage URLs. Use `next/image` (`*.convex.cloud` is allowed). With no photo, use a tinted box (`tintFor(id)`) with a muted Lucide icon, as in the designs.

**Icons.** Use `lucide-react`; the designs use Lucide icons. Icons are `aria-hidden` and **always sit next to visible text**, never alone.

## 5. Accessibility (many users are new to smartphones)

- **Tap targets are at least 44px tall** (`min-h-11`). Small buttons are 40px.
  - **Approved difference from the designs:** where a design shows an icon-only control, add a short visible text label. For example, the product card's "+" becomes "+ Add", and Close buttons say "Close".
- Every input has a visible label. Hints and errors are linked with `aria-describedby` (the field components already do this).
- Everything works with the keyboard: logical order, visible focus (already styled), Escape closes overlays.
- Contrast: body text is `ink` or `muted` on white or `canvas`. Never use light grey for important text.
- Status is never shown by colour alone: badges have words, and switches say On/Off.
- Plain, friendly copy from the designs. Prices always show their unit ("₦4,500 / basket").
- Headings go in order (one `h1` per page). Lists are lists, buttons are buttons, links are links.

## 6. Motion: quick, subtle, never in the way

- Use `motion` through `@/lib/motion` only. `LazyMotion` is strict, so **use `m.div`, never `motion.div`**.
- Durations:
  - 150ms: hover, press and toggles
  - 250ms: most transitions
  - 350ms: the maximum, for pages and modals
- Ease-out. Animate **only opacity and transform**, never height, width, top or margin.
- Already handled by the foundation:
  - page transitions (`template.tsx` in each group)
  - button press feedback (`Button`)
  - modals and drawers
  - accordions
  - the timeline
- **Sections fade up on scroll:** wrap landing and information page sections in `<FadeUp>`. It runs once, over a small distance, and shows content immediately if it's already on screen.
- **Loading:** skeletons first, then real content in `<Reveal>`.
- Never make a tap wait for an animation, and never hide server-rendered content behind an animation.
- Reduced motion is respected automatically. Don't add your own CSS animations except `animate-pulse` and `animate-spin`.

## 7. Phone layout

- The breakpoint is **760px**, as in the designs. Build desktop first from the design's CSS, then apply its `@media (max-width:760px)` rules with the `m:` variant.
- Check every page at 360px, 390px, 760px, 1024px and 1440px:
  - no sideways scrolling
  - text doesn't overflow
  - side gutters of 16px (shop) or 20px (site)

## 8. Guest checkout and identity (PRD)

- Guests buy without an account. Before placing a guest order, call `useEnsureIdentity()`, which signs in as an anonymous guest in this browser. That's how "only the device that placed it can confirm delivery" works.
- Find my order uses `orders.consumer.find` (order number + phone). It's view-only on other devices.
- **Saving a guest's details as an account after ordering:**
  1. The confirmation page calls `orders.consumer.startGuestClaim`. It stores the returned token in `sessionStorage["fk.guestClaim"]` and links to `routes.signUp(...)`.
  2. After a successful sign-up or sign-in, the auth pages check for that token and call `orders.consumer.claimGuestOrders({ token })`, then remove it.

## 9. Testing your work

Run these from `web/` (typecheck and lint only):

```
npx tsc --noEmit --incremental false
npx eslint src/app/<your folders> src/components/<your folder>
```

**Don't run `next dev`, `next build` or `next start`.** Several people build at once and would collide on `.next/`. The integrator runs the build and the browser checks.

Before finishing, re-read each of your designs side by side with your code: copy, order, spacing, states (empty, loading, error), and the phone layout.

## 10. Your report (final message)

1. Files created, by route.
2. Each design screen, and whether it's done or partial (and why).
3. Anything you couldn't do, and differences from the design, with reasons.
4. Changes you need in shared files (exact change and why).
5. Backend gaps: things the live functions don't support. These go into `farmkeke-docs/pending-backend/README.md`, which the integrator updates.

## 11. Heading sizes differ per design

Each design file defines its own `.h1`/`.h2` sizes, so check them in the design's `<style>`. The shared `h1`/`h2` classes default to the W-01 scale (34/42 and 24/32). To use another design's scale, add one of these classes to the page wrapper (`globals.css`):

| Class | h1 | h2 | Designs |
|---|---|---|---|
| `type-search` | 30/38 (24/32 on phones) | 20/28 | W-04, W-04b |
| `type-product` | 34/42 | 20/28 | W-06 |
| `type-compact` | 32/40 (24/32 on phones) | 18/26 | W-07, W-20, W-20c |

For any other design whose sizes differ, add a matching `type-*` class next to these, or set `--h1-size`, `--h1-lh`, `--h2-size`, `--h2-lh` and `--h2-ls` on the page wrapper.
