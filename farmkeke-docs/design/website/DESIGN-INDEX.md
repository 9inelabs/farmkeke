# Farmkeke website — design index

Each `.dc.html` file in this folder is one approved screen design. Open it in a browser or read the HTML/CSS: it shows exact layout, spacing, colours, fonts and copy.

Notes for builders:
- These are design references, not production code. Rebuild them as Next.js + Tailwind components.
- `sc-for`, `sc-if`, `{{...}}` and the `class Component extends DCLogic` script are design-tool markup. Treat them as "repeat this", "show this when" and sample state.
- `/_blob/...` image paths are the Farmkeke logo (shield mark + wordmark). Use the real logo files in `public/` instead.
- Width 1440 is the desktop frame. Pages must also work on phones (see W-00 phone version and the 760px breakpoint rules in the CSS).

## Website · Landing page (farmkeke.com)

- `Main.dc.html` — W-00 Landing page · Desktop (interactive in the design)
- `W-00-Landing-mobile.dc.html` — W-00 Landing page · Phone browser (interactive in the design)

## Website · Shop: browse and search (farmkeke.com/shop)

- `W-01-Shop-home.dc.html` — W-01 Shop home
- `W-02-All-categories.dc.html` — W-02 All categories
- `W-03-Category.dc.html` — W-03 Category page
- `W-04-Search-results.dc.html` — W-04 Search results
- `W-04b-No-results.dc.html` — W-04 Search · No results
- `W-05-Filters-phone.dc.html` — W-05 Filter panel · Phone browser

## Website · Shop: product, farm, cart and area

- `W-06-Product-detail.dc.html` — W-06 Product detail (interactive in the design)
- `W-07-Farm-profile.dc.html` — W-07 Farm profile
- `W-08-Mini-cart.dc.html` — W-08 Mini-cart drawer
- `W-09-Choose-area.dc.html` — W-09 Choose your area
- `W-09b-Outside-area.dc.html` — W-09 Outside service area
- `W-10-Location-primer.dc.html` — W-10 Location permission primer

## Website · Cart and checkout

- `W-20-Cart.dc.html` — W-20 Cart
- `W-20b-Cart-empty.dc.html` — W-20 Cart · Empty
- `W-20c-Cart-changed.dc.html` — W-20 Cart · Items changed
- `W-21-Checkout-contact.dc.html` — W-21 Checkout · Contact
- `W-22-Checkout-fulfilment.dc.html` — W-22 Checkout · Delivery or pickup (interactive in the design)
- `W-23-Checkout-address.dc.html` — W-23 Checkout · Address and time
- `W-24-Checkout-pickup.dc.html` — W-24 Checkout · Pickup point

## Website · Review, payment and confirmation

- `W-25-Checkout-review.dc.html` — W-25 Checkout · Review
- `W-26-Payment.dc.html` — W-26 Payment
- `W-27-Payment-progress.dc.html` — W-27 Payment in progress
- `W-28-Payment-failed.dc.html` — W-28 Payment failed
- `W-29-Payment-awaiting.dc.html` — W-29 Awaiting payment confirmation
- `W-30-Order-confirmation.dc.html` — W-30 Order confirmation

## Website · Sign in, create account and password reset

- `W-40-Sign-in.dc.html` — W-40 Sign in
- `W-41-Create-account.dc.html` — W-41 Create account
- `W-42-Account-created.dc.html` — W-42 Account created
- `W-42a-Forgot-password.dc.html` — W-42a Forgot password
- `W-42b-Check-email.dc.html` — W-42b Check your email
- `W-42c-New-password.dc.html` — W-42c Create new password
- `W-42d-Password-changed.dc.html` — W-42d Password changed
- `W-42e-Link-expired.dc.html` — W-42d Link expired

## Website · Your account

- `W-43-Account-overview.dc.html` — W-43 Account overview
- `W-44-My-orders.dc.html` — W-44 My orders
- `W-44b-Orders-empty.dc.html` — W-44 My orders · Empty
- `W-45-Profile.dc.html` — W-45 Profile and login details
- `W-46-Addresses.dc.html` — W-46 Addresses
- `W-46b-Address-modal.dc.html` — W-46 Add address
- `W-47-Saved-items.dc.html` — W-47 Saved items
- `W-47b-Saved-empty.dc.html` — W-47 Saved items · Empty
- `W-48-Notifications.dc.html` — W-48 Notification preferences (interactive in the design)
- `W-49-Delete-account.dc.html` — W-49 Delete account

## Website · Find, track and confirm orders

- `W-50-Find-order.dc.html` — W-50 Find my order
- `W-51-Tracking.dc.html` — W-51 Order tracking · Delivery
- `W-51b-Tracking-pickup.dc.html` — W-51 Order tracking · Pickup code
- `W-51c-Tracking-view-only.dc.html` — W-51 Order tracking · View only
- `W-52-Confirm-receipt.dc.html` — W-52 Confirm receipt
- `W-52b-Payment-released.dc.html` — W-52 Payment released

## Website · Problems, refunds, reviews and chat

- `W-53-Report-problem.dc.html` — W-53 Report a problem
- `W-53b-Problem-reported.dc.html` — W-53 Problem reported
- `W-54-Dispute-detail.dc.html` — W-54 Dispute detail
- `W-56-Refund-status.dc.html` — W-56 Refund status
- `W-57-Rate-review.dc.html` — W-57 Rate and review (interactive in the design)
- `W-58-Order-chat.dc.html` — W-58 Order chat

## Website · Selling and information pages

- `W-60-Sell.dc.html` — W-60 Sell on Farmkeke
- `W-80-How-it-works.dc.html` — W-80 How it works
- `W-81-Escrow.dc.html` — W-81 Payment protection (escrow)
- `W-82-Pickup-locations.dc.html` — W-82 Pickup locations
- `W-83-Get-the-app.dc.html` — W-83 Get the app
- `W-84-About.dc.html` — W-84 About

## Website · Help, contact, legal and cookies

- `W-85-Help.dc.html` — W-85 Help and FAQ (interactive in the design)
- `W-86-Contact.dc.html` — W-86 Contact
- `W-87-Legal.dc.html` — W-87 Legal · Refund and dispute policy
- `W-88-Cookie-banner.dc.html` — W-88 Cookie banner and settings (interactive in the design)

## Website · System states

- `W-S1-Not-found.dc.html` — W-S1 Page not found (404)
- `W-S2-Error.dc.html` — W-S2 Something went wrong
- `W-S3-Maintenance.dc.html` — W-S3 Maintenance
- `W-S4-Loading.dc.html` — W-S4 Loading skeletons
- `W-S5-Connection-lost.dc.html` — W-S5 Connection lost
- `W-S6-Session-expired.dc.html` — W-S6 Session expired
