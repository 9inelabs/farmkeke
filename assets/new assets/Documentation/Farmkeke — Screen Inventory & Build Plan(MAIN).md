# Farmkeke — Screen Inventory & Build Plan

Oct 2, 2026 · @Franklyn

## How to read this doc

Farmkeke needs about 260 screens and states across three surfaces, built in 10 phases. The mobile app now has two sides: shopping for everyone, and farmer mode for approved farmers. Phases 1–9 make a launch-ready marketplace; Phase 10 is staff tools. Only Phase 7 (and the refund parts of a few other screens) waits on the payment spec.

**Users:** Guest = shopper with no account. Consumer = signed-in shopper. Anyone = Guest or Consumer. Farmer = approved seller using farmer mode in the app (the same account can still shop). Admin = Farmkeke staff.

**Screen IDs:** M = mobile app, shopping side. F = mobile app, farmer side. W = website. A = Farmkeke Admin Portal. IDs ending in S (M-S1, W-S2) are system states, shared by both sides of the app. Flows and phases refer to screens by ID.

**\[PAY\]** = blocked by the pending payment spec. The screen's place in the flow is fixed; only provider-specific content waits.

**Escrow order states** used on every surface, in order:

1. Awaiting payment
2. Paid — money held by Farmkeke
3. Accepted by farmer (within 24 hours)
4. Preparing
5. Ready for rider — a Farmkeke rider collects from the farm
6. Out for delivery, or At pickup point
7. Delivered, or Collected
8. Completed — consumer confirmed (or staff released it by hand), money released to farmer

Side states: Declined by farmer, Expired (no response in 24 hours), Cancelled by Farmkeke staff (consumers can't cancel), Disputed (money stays held), Refunded. Money never releases automatically; if a consumer doesn't confirm, staff decide.

**What changed on 8 October 2026:** farmers now apply and work only in the mobile app. The website no longer has a farmer application, and the separate Farmer Admin Portal is gone; its screens became the farmer side of the app (F-). One account can shop and sell, switching with a mode switch instead of a role selection screen. Language selection is removed (English only), and sign-in uses email or phone with a password.

## 1. Mobile app: shopping side — 84 screens

The shopping side is a shop, a checkout and an order tracker for everyone. Bottom navigation: Home, Categories, Cart, Orders, Account. Account is also the door to selling: a **Sell on Farmkeke** row opens the farmer application (F-01), and once approved it becomes **Switch to farmer mode** (section 3).

### Launch and onboarding

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-01 | Splash | Anyone | Load the app and restore the saved session, so signed-in users stay signed in | Logo, tagline, loading indicator |
| M-03 | Onboarding carousel | Anyone (first launch) | Explain fresh-from-farm, delivery or pickup, and escrow protection in 3 panels | 3 illustrated panels, progress dots, Next, Skip |
| M-04 | Get started | Anyone (first launch) | Let people shop straight away without an account | Start shopping (primary), Sign in or create account (text link) |
| M-05 | Location permission primer | Anyone | Explain why location helps before the OS prompt | Illustration, Allow location, Choose my area instead |
| M-06 | Choose your area | Anyone | Set area manually when location is denied or wrong | State picker, area/LGA search, Confirm |
| M-07 | Outside service area | Anyone | Say Farmkeke doesn't deliver here yet | Message, nearest pickup points if any, Change area, Notify me when available |

### Browse

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-10 | Home | Anyone | Main storefront | Greeting (name if signed in), area chip, search bar, category row, Fresh Picks grid (3 per row), featured deals, farms near you |
| M-11 | All categories | Anyone | See every category | Icon + label tiles for the 8 categories |
| M-12 | Category products | Anyone | Browse one category | Product grid, filter/sort button, sub-category chips |
| M-13 | Search | Anyone | Start a search | Search field, recent searches, popular items |
| M-14 | Search results | Anyone | Show matching products and farms | Results grid, filter/sort button, result count |
| M-15 | No search results | Anyone | Empty state for search | Message, suggested categories, Clear search |
| M-16 | Filter and sort (bottom sheet) | Anyone | Narrow results | Price range, delivery or pickup available, farm location, sort options, Apply, Reset |
| M-17 | Product detail | Anyone | Decide to buy one product | Photo gallery, name, price per unit, harvest date, stock left, farm card, delivery/pickup availability, Add to cart |
| M-18 | Photo viewer | Anyone | See produce photos full screen | Swipeable images, Close |
| M-19 | Add to cart (bottom sheet) | Anyone | Choose unit and quantity | Unit options (kg, basket, tuber, etc.), quantity stepper, line total, Add to cart |
| M-20 | Added to cart confirmation | Anyone | Confirm and offer next step | Toast or small sheet, View cart, Keep shopping |
| M-21 | Farm profile | Anyone | Build trust in the seller | Farm name and photo, location, verified badge, rating, all listings |
| M-22 | Product unavailable | Anyone | State when a listing is sold out, paused or removed | Message, similar products, Back |

### Cart and checkout

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-30 | Cart | Anyone | Review items before paying | Items grouped by farm, quantity steppers, remove with undo, subtotal per farm, Checkout |
| M-31 | Empty cart | Anyone | Empty state | Illustration, Start shopping |
| M-32 | Cart changed (bottom sheet) | Anyone | Flag price changes or sold-out items since adding | List of changes, Update cart |
| M-33 | Delivery or pickup | Anyone | Choose how to receive the order | Two large option cards with icon + label, fee and time estimate on each |
| M-34 | Delivery address | Anyone | Pick a saved address or enter a new one | Saved addresses (signed in), new address form (street, landmark, area), Use this address |
| M-35 | Adjust map pin | Anyone | Fix the exact drop-off spot | Map, draggable pin, Confirm location |
| M-36 | Delivery time (bottom sheet) | Anyone | Choose a delivery window | Available days and time windows |
| M-37 | Pickup points | Anyone | Choose where to collect | List and map toggle, distance, opening hours |
| M-38 | Pickup point detail (bottom sheet) | Anyone | Check a pickup point before choosing it | Address, hours, directions, photo, Choose this point |
| M-39 | Contact details | Guest | Collect who to contact | Full name, phone number, email (optional) |
| M-41 | Order review | Anyone | Final check before paying | Items by farm (each farm becomes its own order), fulfilment summary, delivery fee, total, escrow note, Pay |
| M-42 | How escrow works (bottom sheet) | Anyone | Explain money is held until confirmed receipt | 3-step illustration, Got it |
| M-43 | Payment method \[PAY\] | Anyone | Choose how to pay | Provider-specific options |
| M-44 | Payment in progress \[PAY\] | Anyone | Hold while payment completes | Loader, Don't close the app message |
| M-45 | Payment failed \[PAY\] | Anyone | Recover from a failed payment | Reason, Try again, Change method |
| M-46 | Awaiting payment confirmation \[PAY\] | Anyone | Handle slow confirmations (e.g. transfers) | Status, what happens next, Check again |
| M-47 | Order placed | Anyone | Confirm success and set expectations | Order number, Money held safely note, next steps, Track order |
| M-48 | Notification permission primer | Anyone | Ask for push permission after the first order | Benefit message, Turn on updates, Not now |
| M-49 | Save your details | Guest | Offer an account after purchase; details prefilled, just add a password | Name and email prefilled, password, Create account, No thanks |

### Sign in and accounts

Consumer accounts use an email and a password; no phone number is needed to sign up or sign in (checkout still asks for a phone so riders can call). Farmer accounts also need a phone number, added in the farmer application (F-03), and farmers can sign in with their phone number or email. Once signed in, the session is saved securely on the phone, so closing the app never signs anyone out; only Sign out does.

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-50 | Sign in | Guest | Sign in with saved details | Email (farmers can type their phone number instead), password with show/hide, Sign in, Forgot password?, Create account link; states for wrong details and too many attempts |
| M-51 | Create account | Guest | Sign up with email and a password | Full name, email, password with rules shown as you type, Create account, Sign in link; state for already registered |
| M-52 | Account created | Consumer | Success; user is now remembered on this phone | Welcome message, Continue shopping |
| M-53 | Forgot password | Guest | Start a password reset | Email field, Send reset link |
| M-54 | Check your email | Guest | Confirm the reset email was sent (via Resend) | Email address shown, Open email app, Resend link after a timer, Back to sign in |
| M-55 | Create new password | Guest | Opened from the email link | New password, confirm password, Save password |
| M-56 | Password changed | Guest | Success | Message, Sign in |
| M-57 | Reset link expired | Guest | Handle an old or already-used link | Message, Send a new link |
| M-58 | Link past orders | Consumer | Attach earlier guest orders made with this email or the same checkout phone | Count of orders found, Add to my account |
| M-59 | Sign-in prompt (bottom sheet) | Guest | Shown when a guest taps something needing an account | Reason, Sign in, Create account, Not now |

### Orders

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-60 | Orders | Anyone | List orders (guests see orders placed on this device) | Active and Past tabs, status badges, Find an order link |
| M-61 | No orders yet | Anyone | Empty state | Message, Start shopping |
| M-62 | Find my order | Guest | Look up an order from another device or SMS | Order number, phone number, Find order |
| M-63 | Order tracking | Anyone | Follow an order to completion | Status timeline, farm, rider name and phone when out for delivery, items, address or pickup point, payment held badge, one next-action button, Message farmer, Get help |
| M-64 | Pickup code | Anyone | Prove identity at the pickup point | Large code and QR, pickup point details, hours |
| M-65 | Confirm receipt | Anyone | Confirm everything arrived, which releases payment | Item checklist, I received everything (primary), There's a problem; guests can only confirm on the device that placed the order |
| M-66 | Payment released | Anyone | Confirm money went to the farmer | Success message, Rate your order, Buy again |
| M-67 | Report a problem | Anyone | Open a dispute; payment stays held | Reason (missing, damaged, wrong item, not received), affected items, photos, note, Submit |
| M-68 | Problem reported | Anyone | Confirm the dispute is open | Reference number, payment still held note, expected response time |
| M-69 | Dispute detail | Anyone | Follow the dispute to its outcome | Status, messages with Farmkeke support, outcome (released, refunded, split) |
| M-71 | Order declined or expired | Anyone | Explain why an order ended early | Reason, refund status link, Shop similar items |
| M-72 | Refund status \[PAY\] | Anyone | Track a refund | Amount, method, expected date, steps |
| M-73 | Rate and review | Anyone | Rate the farm and produce | Stars, quick tags, comment, Submit |
| M-74 | Order chat | Anyone | Message the farmer about one order | Order summary at top, messages, photo sharing; never closes; Farmkeke staff can read it for safety |
| M-75 | Messages | Anyone | All order chats in one place; includes empty state | Chats by order, farm name, unread markers |

### Account and settings

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-80 | Account | Consumer | Hub for profile and settings | Name and email, Addresses, Saved items, Notifications, Help, Sell on Farmkeke (or Switch to farmer mode once approved), Sign out |
| M-81 | Account (guest) | Guest | Hub without an account | Sign in or create account card, Find my order, Help, Sell on Farmkeke (asks the guest to sign in first) |
| M-82 | Edit profile | Consumer | Change name and email | Fields, Save |
| M-83 | Login details | Consumer | Change phone, email or password | Current password, new email, new password, Save; farmers also see their phone number here |
| M-84 | Saved addresses | Consumer | Manage addresses | List, default marker, Add address |
| M-85 | Add or edit address | Consumer | Save an address | Form, map pin, label (Home, Work), Save |
| M-86 | Saved items | Consumer | Products saved for later | Grid, empty state |
| M-87 | Notifications | Anyone | In-app notification inbox | List by date, unread markers, empty state |
| M-88 | Notification settings | Consumer | Choose which updates to get | Toggles per type, OS permission status |
| M-89 | Saved payment methods \[PAY\] | Consumer | Manage stored payment methods | Provider-specific |
| M-90 | Help and FAQ | Anyone | Self-serve answers | Topics, search, articles |
| M-91 | Contact support | Anyone | Reach Farmkeke | Chat with Farmkeke support in the app, support email, order picker |
| M-92 | How Farmkeke works | Anyone | Explain buying, delivery, pickup and escrow | Illustrated steps |
| M-93 | Legal | Anyone | Terms, privacy, refund and dispute policy | In-app web pages |
| M-94 | Sign out (bottom sheet) | Consumer | Confirm sign out | Sign out, Cancel |
| M-95 | Delete account | Consumer | Required by both app stores | What gets deleted, enter password to confirm, Delete account |
| M-96 | Account deleted | Guest | Confirm deletion | Message, Continue as guest |
| M-97 | About | Anyone | App version and info | Version, links |

### System states

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| M-S1 | Offline | Anyone | No connection | Banner on cached screens; full screen with Try again where nothing is cached |
| M-S2 | Something went wrong | Anyone | Generic error | Message, Try again, Contact support |
| M-S3 | Loading skeletons | Anyone | Loading for home, lists and product detail | Grey placeholder shapes |
| M-S4 | Update required | Anyone | Force an outdated app to update | Message, Update now |
| M-S5 | Maintenance | Anyone | Platform paused | Message, expected return time |
| M-S6 | Session expired (bottom sheet) | Consumer | Sign in again | Sign in, Continue as guest |
| M-S7 | Link not found | Anyone | Dead deep link or removed item | Message, Go to home |

## 2. Website, farmkeke.com — 59 screens

The website mirrors the app's shopping, checkout and order tracking. It has no farmer tools: farmers who arrive here are sent to the app. Every page is responsive; where the app uses a bottom sheet, desktop uses a modal or side panel.

### Storefront

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-01 | Homepage | Anyone | Main storefront and brand front door | Hero with tagline and search, category row, Fresh Picks, how it works strip, Sell on Farmkeke banner, Get the app banner |
| W-02 | All categories | Anyone | See every category | Icon + label tiles |
| W-03 | Category page | Anyone | Browse one category | Filter sidebar (desktop), product grid, sort, pagination or load more |
| W-04 | Search results | Anyone | Show matches; includes no-results state | Results grid, filters, suggested categories when empty |
| W-05 | Filter panel (mobile web) | Anyone | Filters on small screens | Same filters as M-16, Apply, Reset |
| W-06 | Product detail | Anyone | Decide to buy | Gallery, price per unit, unit selector, quantity, harvest date, farm card, availability, Add to cart |
| W-07 | Farm profile | Anyone | Seller trust page | Farm info, verified badge, rating, listings |
| W-08 | Mini-cart drawer | Anyone | Confirm add to cart without leaving the page | Items, subtotal, View cart, Checkout |
| W-09 | Choose your area (modal) | Anyone | Set area; includes outside-service-area state | State and area search, nearest pickup points, Notify me |
| W-10 | Location permission primer | Anyone | Explain before the browser location prompt | Use my location, Choose area instead |

### Cart and checkout

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-20 | Cart | Anyone | Review items; includes empty and items-changed states | Items by farm, quantity, remove, subtotals, Checkout |
| W-21 | Checkout: contact | Anyone | Contact details (skipped if signed in) | Name, phone, email (optional) |
| W-22 | Checkout: delivery or pickup | Anyone | Choose fulfilment | Two option cards with fee and time |
| W-23 | Checkout: delivery address and time | Anyone | Where and when to deliver | Saved addresses or form, map pin, time window |
| W-24 | Checkout: pickup point | Anyone | Choose pickup point | Map and list, hours, distance |
| W-25 | Checkout: review | Anyone | Final check | Summary by farm, delivery fee, total, escrow explainer, Pay |
| W-26 | Payment \[PAY\] | Anyone | Pay | Provider-specific |
| W-27 | Payment in progress \[PAY\] | Anyone | Hold during payment | Loader, Don't close this page |
| W-28 | Payment failed \[PAY\] | Anyone | Recover | Reason, Try again, Change method |
| W-29 | Awaiting payment confirmation \[PAY\] | Anyone | Slow confirmations | Status, Check again |
| W-30 | Order confirmation | Anyone | Success | Order number, money held note, Track order, Create account offer (guests) |

### Accounts

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-40 | Sign in | Guest | Sign in with email and password | Email, password, Keep me signed in (on by default), Forgot password?, Create account |
| W-41 | Create account | Guest | Sign up with email and a password | Full name, email, password with rules, Create account |
| W-42 | Account created | Consumer | Success; includes link-past-orders step | Welcome, guest orders found, Continue shopping |
| W-42a | Forgot password | Guest | Start a reset | Email field, Send reset link |
| W-42b | Check your email | Guest | Confirm the Resend email went out | Email shown, resend after timer |
| W-42c | Create new password | Guest | Page the email link opens (also used when the app isn't installed) | New password, confirm, Save password |
| W-42d | Password changed or link expired | Guest | End states of the reset | Sign in, or Send a new link |
| W-43 | Account overview | Consumer | Account hub | Recent orders, quick links |
| W-44 | My orders | Consumer | Order list; includes empty state | Active and Past, status badges |
| W-45 | Profile and login details | Consumer | Edit name, phone, email and password | Fields, current password to confirm changes, Save |
| W-46 | Addresses | Consumer | Manage addresses | List, add/edit modal |
| W-47 | Saved items | Consumer | Saved products; includes empty state | Grid |
| W-48 | Notification preferences | Consumer | Choose SMS/email updates | Toggles per type |
| W-49 | Delete account | Consumer | Delete with password confirm | Consequences, password, confirm |

### Orders

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-50 | Find my order | Guest | Look up an order by number and phone | Order number, phone, Find order |
| W-51 | Order tracking | Anyone | Follow an order; includes pickup code | Timeline, items, farm, rider when out for delivery, Message farmer, address or pickup point, held payment badge, one next action |
| W-52 | Confirm receipt | Anyone | Release payment; includes released success state | Checklist, I received everything, There's a problem |
| W-53 | Report a problem | Anyone | Open a dispute; includes submitted state | Reason, items, photos, note |
| W-54 | Dispute detail | Anyone | Follow dispute | Status, messages, outcome |
| W-56 | Refund status \[PAY\] | Anyone | Track refund | Amount, method, date |
| W-57 | Rate and review | Anyone | Rate farm and produce | Stars, tags, comment |
| W-58 | Order chat | Anyone | Message the farmer about one order | Order summary, messages, photos |

### Selling on Farmkeke

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-60 | Sell on Farmkeke | Prospective farmer | Explain selling and send farmers to the app | Benefits, how escrow and payouts work, requirements, Get the app (store badges, QR code), "Apply from Account → Sell on Farmkeke" steps |

### Content and system

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| W-80 | How it works | Anyone | Explain buying, delivery and pickup | Illustrated steps |
| W-81 | How escrow protects you | Anyone | Explain held payments and disputes | Steps, FAQ |
| W-82 | Pickup locations | Anyone | Public list of pickup points | Map, list, hours |
| W-83 | Get the app | Anyone | Drive app installs | Store badges, QR code; smart app banner on mobile browsers |
| W-84 | About | Anyone | Company story | Mission, contact |
| W-85 | Help and FAQ | Anyone | Self-serve answers | Topics, search |
| W-86 | Contact | Anyone | Reach support | Support email, chat with support |
| W-87 | Legal pages | Anyone | Terms, privacy, refund and dispute policy, farmer terms | Text pages |
| W-88 | Cookie consent banner | Anyone | Consent for analytics cookies | Accept, Manage |
| W-S1 | Page not found | Anyone | 404 | Message, search, Go home |
| W-S2 | Something went wrong | Anyone | 500 | Message, Try again |
| W-S3 | Maintenance | Anyone | Platform paused | Message, return time |
| W-S4 | Loading skeletons | Anyone | Loading for grids and detail pages | Placeholder shapes |
| W-S5 | Connection lost banner | Anyone | Network drop mid-checkout | Banner, retry |
| W-S6 | Session expired (modal) | Consumer | Sign in again | Sign in, Continue as guest |

## 3. Mobile app: farmer side — 57 screens

Farmers apply, sell and get paid entirely in the Farmkeke app; there is no farmer website or web portal. Anyone with a Farmkeke account can apply from Account. Once Farmkeke staff approve the application, the same account unlocks **farmer mode**, and the person can switch between shopping and selling at any time. In farmer mode the bottom tab bar becomes **Dashboard, Orders, Listings, Earnings, Farm**. The Farm tab holds the farm's settings and a **Switch to shopping** button.

### Applying to sell

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-01 | Sell on Farmkeke | Consumer | Explain selling and start an application | Benefits, how escrow and payouts work, requirements, commission note, Apply now; opened from the Sell on Farmkeke row in Account |
| F-02 | Sign in to apply (bottom sheet) | Guest | Applying needs an account | Reason, Sign in, Create account (M-50 / M-51), Not now |
| F-03 | Apply: farm details | Consumer | Describe the farm | Farm name, farmer's phone number (required; also becomes a way to sign in), state, LGA, address, map pin, farm size, farm type; step 1 of 6 progress bar |
| F-04 | Apply: what you grow | Consumer | Know the produce | Category tiles (multi-select), main crops, typical volumes, seasons |
| F-05 | Apply: collection details | Consumer | Know where and when riders can collect | Collection address (prefilled from farm), collection hours, preparation lead time |
| F-06 | Apply: documents | Consumer | Collect proof | Government ID, farm photos (3+), proof of address, farmers association letter; each via Take photo or Choose from gallery; upload progress and retry |
| F-06a | Camera and photos permission primer | Consumer | Explain before the phone's camera prompt | Why we need it, Allow camera, Choose from gallery instead |
| F-07 | Apply: payout details | Consumer | Where Farmkeke pays out once approved | Bank picker, account number, account name; automatic name check is \[PAY\] |
| F-08 | Apply: review and submit | Consumer | Check and agree | Section summaries with Edit, farmer terms checkbox, Submit application |
| F-09 | Application submitted | Consumer | Confirm and set expectations | Reference number, expected review time, You'll get a notification |
| F-09a | Application status: under review | Consumer | Waiting state, shown as a card in Account | Submitted date, expected decision date |
| F-09b | Application status: more information needed | Consumer | Answer the admin's request | Admin's note, upload or edit fields, Resubmit |
| F-09c | Application approved | Farmer | Welcome and open farmer mode | Congratulations, what's next, Switch to farmer mode |
| F-09d | Application not approved | Consumer | Explain the decision | Reason, when they can reapply, Contact support |
| F-09e | Continue your application | Consumer | Resume a saved draft | Card in Account, progress, Continue |

### Farmer mode

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-10 | Dashboard | Farmer | Show what needs doing today | New orders needing a response (with countdown), orders to prepare, money held vs released, low-stock alerts; empty state points to F-14 |
| F-11 | Farmer notifications | Farmer | Notification inbox for selling; includes empty state | List, unread markers |
| F-12 | Notification permission primer (farmer) | Farmer | Ask for push so new orders aren't missed | Shown on first switch to farmer mode if push is off; Turn on, Not now |
| F-13 | Switch mode (bottom sheet) | Farmer | Move between shopping and selling | Shopping and Farmer mode cards, current mode marked, Switch |
| F-14 | Setup checklist | Farmer | Guide first-time setup | Steps with progress: business profile, collection settings, first listing |
| F-15 | Farmer mode suspended | Farmer | Explain why selling is blocked | Reason, Contact support; shopping still works |

### Listings

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-20 | Listings | Farmer | Manage all listings; includes empty state | Status tabs (Live, Under review, Needs changes, Out of stock, Paused, Draft), search, bulk select, Add listing |
| F-21 | Add listing: photos | Farmer | Upload produce photos | Upload area, photo tips, reorder, cover photo, upload errors |
| F-22 | Add listing: details | Farmer | Describe the produce | Name, category, description, harvest date |
| F-23 | Add listing: price, unit and stock | Farmer | Set how it's sold | One or more units with price each, stock quantity, minimum order |
| F-24 | Add listing: fulfilment | Farmer | Where it can go | Available for delivery, pickup, or both |
| F-25 | Listing preview | Farmer | See it as consumers will | App-style preview, Edit, Submit |
| F-26 | Listing submitted | Farmer | Confirm | Live now, or Under review with expected time |
| F-27 | Edit listing | Farmer | Change any field | Same fields as F-21 to F-24, Save |
| F-28 | Quick update (modal) | Farmer | Change stock or price fast | Stock field, price field, Save |
| F-29 | Pause, mark out of stock or delete (modal) | Farmer | Confirm a status change | Consequence text, Confirm |
| F-30 | Bulk action confirm (modal) | Farmer | Apply one action to many listings | Count, action, Confirm |
| F-31 | Listing needs changes | Farmer | Fix a listing an admin sent back | Admin's reason, Edit and resubmit |

### Orders

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-40 | Orders | Farmer | All orders; includes empty state per tab | Tabs: New, To prepare, With rider, Completed, Cancelled, Disputed |
| F-41 | New order | Farmer | Accept or decline | Items and quantities, delivery or pickup, area or pickup point, time window, Paid — held by Farmkeke badge, response countdown, Accept (primary), Decline |
| F-42 | Decline order (modal) | Farmer | Record why | Reasons (out of stock, can't deliver in time, other), Decline |
| F-43 | Order accepted | Farmer | Confirm and show next step | Message, Start preparing |
| F-44 | Order in progress | Farmer | Move the order forward one step at a time | Timeline, consumer first name and phone, address or pickup point, one next-step button (Mark packed, then Ready for rider pickup), assigned rider's name and arrival time |
| F-45 | Confirm handover (modal) | Farmer | Confirm the order was handed to the Farmkeke rider | Rider name, items checklist, Handed to rider |
| F-46 | Order completed | Farmer | Show money was released (consumer confirmed or staff released it) | Released amount, date |
| F-47 | Order expired or cancelled | Farmer | Explain an order that ended | Reason (no response within 24 hours, or cancelled by Farmkeke) |
| F-48 | Disputed order | Farmer | Respond to a consumer's report | Consumer's claim and photos, Add your response with photos, status, outcome |
| F-49 | Packing slip | Farmer | Share or save what to pack | Order sheet with Share (WhatsApp, print) and Save image |

### Money

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-60 | Earnings | Farmer | See money by escrow state | Held, Released, Paid out totals; recent movements |
| F-61 | Order transactions | Farmer | Money per order | Order, amount, fee, net, status |
| F-62 | Payout account \[PAY\] | Farmer | Where released money goes | Bank details from the application; edit and re-verify |
| F-63 | Payout history \[PAY\] | Farmer | Past payouts and detail | List, payout detail with included orders |

### Business

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-70 | Business profile | Farmer | Public farm details | Farm name, photo, description, location |
| F-71 | Fulfilment settings | Farmer | When and where Farmkeke riders collect orders | Preparation lead time, collection address, collection hours |
| F-72 | Availability | Farmer | Opening days and holiday mode | Weekly days, holiday mode toggle (hides listings) |
| F-73 | Verification and documents | Farmer | Status of documents | Approved documents, re-upload when expired |
| F-75 | Notification settings | Farmer | Choose alert channels | Push, SMS and email per alert type |

### Reviews, messages and support

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| F-80 | Reviews | Farmer | See consumer ratings | Average, list, filter by stars |
| F-83 | Messages | Farmer | Chat with consumers about each order | Chats by order, unread markers, thread with photos |
| F-90 | Help and guides | Farmer | How to sell well | Articles, video guides |
| F-91 | Contact support | Farmer | Reach Farmkeke | Chat with support, support email, order picker |
| F-92 | Farmer terms and policies | Farmer | Rules for sellers | Text pages |

## 4. Farmkeke Admin Portal — 60 screens

The admin portal is organised around work queues: farmer requests, listings to review, disputes and escrow releases. Every action that changes money or an account asks for a reason and is written to the audit log (A-90). Desktop-first.

### Access

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-01 | Staff sign in | Admin | Secure sign in | Email, password |
| A-02 | Two-step verification | Admin | Second factor | Code input, trust this device |
| A-03 | Reset password | Admin | Recover access | Email, reset link, new password |
| A-04 | Accept staff invite | Admin (new) | Join from an invite | Set name, password, 2-step setup |
| A-05 | No permission | Admin | Role doesn't allow this page | Message, Back to dashboard |

### Overview

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-10 | Dashboard | Admin | Daily control centre | Queue counts (farmer requests, listings to review, open disputes, releases due, stuck orders), today's orders and value, money held |
| A-11 | Global search | Admin | Find anything fast | Search by order number, phone, farm name, listing |
| A-12 | Admin notifications | Admin | Alerts for staff | New requests, disputes, failed payouts |

### Farmer requests

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-20 | Farmer requests | Admin | Queue of applications; includes all-caught-up empty state | Status filter (New, More info requested, Approved, Rejected), waiting time, assignee |
| A-21 | Request review | Admin | Decide on one application | Applicant and farm details, map pin, produce, fulfilment answers, documents, payout details, internal notes, history; Approve, Request more info, Reject |
| A-22 | Document viewer | Admin | Inspect ID and farm photos | Full-screen viewer, zoom, next/previous |
| A-23 | Approve (modal) | Admin | Confirm approval; farmer mode unlocks in the applicant's app | Summary, message preview, Approve |
| A-24 | Request more info (modal) | Admin | Ask the applicant for something specific | Checklist of missing items, note, Send |
| A-25 | Reject (modal) | Admin | Decline with a reason | Reason template, note, reapply-after date, Reject |

### Farmers and consumers

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-30 | Farmers | Admin | All farmer accounts | Status (Active, Approved but not set up, Suspended), location, rating, open orders |
| A-31 | Farmer detail | Admin | Everything about one farmer | Tabs: Profile, Listings, Orders, Earnings, Disputes, Reviews, Documents, Trusted toggle (set by staff; trusted listings skip review), Notes, Activity |
| A-32 | Suspend or reactivate (modal) | Admin | Block or restore a farmer | Reason, effect on live listings and open orders, Confirm |
| A-33 | Edit farmer details | Admin | Correct farmer data on their behalf | Fields, reason, Save |
| A-35 | Consumers | Admin | All consumers, including guests by phone | Account or guest, orders, disputes, flags |
| A-36 | Consumer detail | Admin | Everything about one consumer | Profile, orders, disputes, addresses, notes, activity |
| A-37 | Block or unblock (modal) | Admin | Stop abusive buyers | Reason, Confirm |
| A-38 | Account deletion requests | Admin | Process deletions with open-order checks | Request list, blockers, Complete deletion |

### Listings

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-40 | All listings | Admin | Search every listing | Filters by status, category, farm |
| A-41 | Listing review queue | Admin | Listings waiting for approval; includes empty state | Oldest first, quick preview |
| A-42 | Listing detail | Admin | Moderate one listing | Consumer preview, photos, price and unit history, Approve, Send back, Unpublish |
| A-43 | Send back or unpublish (modal) | Admin | Explain what to fix | Reason template, note, Confirm |

### Orders, escrow and money

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-50 | All orders | Admin | Every order on the platform | Filters by status, fulfilment, farm, date; saved view for stuck orders |
| A-51 | Order detail | Admin | Full picture of one order | Timeline with actor and time for each step, consumer, farmer, items, rider, escrow state, payment reference, order chat, notes |
| A-52 | Intervene (modal) | Admin | Fix a stuck order | Actions: cancel (staff only), extend farmer deadline, reassign rider; reason required |
| A-53 | Dispatch board | Admin | Assign riders to ready orders and track every delivery | Columns: Ready for rider, With rider, At pickup point, Delivered; rider availability; late flags |
| A-54 | Assign rider and update delivery (modal) | Admin | Give an order to a rider and record each delivery step | Rider picker, collection time, status: collected from farm, dropped at pickup point, delivered |
| A-55 | Riders | Admin | Manage Farmkeke riders | Name, phone, areas covered, active toggle, deliveries today |
| A-60 | Escrow ledger | Admin | All money held, by order | Amount, held since, state, days since delivery |
| A-61 | Release queue | Admin | Orders ready to release | Confirmed by consumer, unconfirmed 1 day after delivery (staff contact the consumer, then decide), blocked by dispute |
| A-62 | Manual release or hold (modal) | Admin | Release or freeze money by hand | Amount, reason, Confirm |
| A-63 | Refunds \[PAY\] | Admin | Track refunds to consumers | Status, provider reference, retry |
| A-64 | Payouts \[PAY\] | Admin | Track payouts to farmers | Batches, failures, retry |
| A-65 | Payment reconciliation \[PAY\] | Admin | Match provider records to orders | Mismatches, unmatched payments |

### Disputes and support

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-70 | Disputes | Admin | Queue of open disputes; includes empty state | Reason, age, response deadline, assignee |
| A-71 | Dispute detail | Admin | Investigate | Consumer claim and photos, farmer response and photos, order timeline, message both parties, internal notes |
| A-72 | Resolve dispute (modal) | Admin | Decide the money | Release to farmer, refund consumer, or split with amounts; note to both. Refund part is \[PAY\] |
| A-75 | Support tickets | Admin | Help requests from consumers and farmers | Support chats and emails in one queue, status, assignee |
| A-76 | Ticket detail | Admin | Handle one request | Messages, linked order, Resolve |

### Platform settings

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-80 | Categories | Admin | Manage the 8 categories | Add, edit, reorder, icon, hide |
| A-81 | Units of measure | Admin | Units farmers can sell in | Create, edit and retire units; new units appear at once in the farmer listing form, app and website. Starts with kg, basket, tuber, crate, bunch, derica, mudu, paint bucket, tray of eggs, piece, bag |
| A-82 | Pickup locations | Admin | Create and edit pickup points | Name, address, map pin, hours, contact, active toggle |
| A-83 | Service areas and delivery fees | Admin | Where delivery is offered and what it costs | Areas riders cover, delivery fee per zone |
| A-84 | Fees and commission | Admin | Farmer commission and consumer delivery fee | Commission % (rate to be decided), effective date |
| A-85 | Order and escrow rules | Admin | The timers that drive escrow | Farmer response deadline (24 hours), dispute window, pickup collection deadline, unconfirmed-order alert (1 day after delivery) |
| A-86 | Homepage and featured content | Admin | Control banners and featured items on app and web | Banners, featured listings, schedule |
| A-87 | Notification templates | Admin | Wording for SMS, push and email | Template per event |
| A-88 | Help content | Admin | Edit FAQ articles on the app and website | Articles, categories |
| A-89 | Staff and roles | Admin | Who can do what | Invite staff, roles (Super admin, Operations, Finance, Support) |
| A-90 | Audit log | Admin | Record of every sensitive action | Who, what, when, reason |
| A-91 | Reports and exports | Admin | Business reporting | Sales, farmers, disputes; CSV export |
| A-92 | My staff account | Admin | Personal settings | Password, 2-step, sign out |

### System states

| ID | Screen | Users | Purpose | Key elements |
| --- | --- | --- | --- | --- |
| A-S1 | Loading skeletons | Admin | Loading tables and detail pages | Placeholders |
| A-S2 | Something went wrong | Admin | Generic error | Try again |
| A-S3 | Page not found | Admin | 404 | Back to dashboard |
| A-S4 | Session timeout | Admin | Auto sign-out after inactivity | Warning modal, Stay signed in |

## 5. Shared rules: notifications and states

Every notification below opens a specific screen, so each event is listed with where it lands. Guests get SMS only, since they have no app account to push to. All email across Farmkeke (password resets, order emails, farmer application updates) is sent through Resend.

| Event | Who is told | Channel | Opens |
| --- | --- | --- | --- |
| Order placed and paid | Consumer, farmer | Push or SMS (consumer); push + SMS (farmer) | M-63 / W-51; F-41 |
| Farmer response deadline near | Farmer | Push + SMS | F-41 |
| Order accepted | Consumer | Push or SMS | M-63 / W-51 |
| Order declined or expired | Consumer | Push or SMS | M-71 |
| Out for delivery | Consumer | Push or SMS | M-63 / W-51 |
| Ready for pickup | Consumer | Push or SMS, with pickup code | M-64 |
| Delivered — please confirm | Consumer | Push or SMS, with reminders | M-65 / W-52 |
| Payment released | Farmer | Push + SMS | F-46 |
| Still not confirmed (reminder; staff follow up) | Consumer | Push or SMS | M-65 / W-52 |
| Problem reported | Farmer, admin | Push + SMS (farmer); admin alert | F-48; A-71 |
| Dispute resolved | Consumer, farmer | Push or SMS | M-69; F-48 |
| Refund issued \[PAY\] | Consumer | Push or SMS | M-72 / W-56 |
| Payout sent \[PAY\] | Farmer | Push + SMS | F-63 |
| Application received / more info needed / approved / not approved | Applicant | Push + email | F-09 / F-09b / F-09c / F-09d |
| Listing approved or sent back | Farmer | Push | F-20 / F-31 |
| Low stock | Farmer | Push | F-28 |
| Review reminder | Consumer | Push | M-73 |
| New farmer request | Admin | Admin alert | A-21 |
| New order chat message | Consumer, farmer | Push or SMS (consumer); push (farmer) | M-74 / W-58; F-83 |
| Rider assigned to collect | Farmer | Push + SMS | F-44 |
| Password reset requested | Consumer, farmer | Email (Resend) | M-55 / W-42c |

A notification for the farmer side opens the app in farmer mode, switching modes automatically if the person was shopping.

Three state rules apply to every list and detail screen on every surface, both sides of the app included, so they aren't repeated per row:

1. **Loading** uses skeletons shaped like the content, never a lone spinner, except payment processing, which uses a full-screen hold.
2. **Empty** states always have one illustration, one sentence and one action button.
3. **Errors** say what happened in plain words and offer one way forward (Try again, Edit, or Contact support). Form errors sit under the field that caused them.

## 6. Main user flows

Each flow is the screen sequence for the most common path; branches are noted inside the step where they happen. Website flows use the matching W- screens unless stated.

### A. First launch of the app

1. M-01 Splash
2. M-03 Onboarding carousel (Skip jumps to step 3)
3. M-04 Get started → Start shopping
4. M-05 Location permission primer → OS prompt. If denied: M-06 Choose your area. If outside coverage: M-07
5. M-10 Home (shopping as a guest)

### B. Guest checkout with doorstep delivery

1. M-10 Home or M-12 Category
2. M-17 Product detail
3. M-19 Add to cart sheet → M-20 Added confirmation → View cart
4. M-30 Cart (M-32 if anything changed); items from several farms are fine
5. M-33 Delivery or pickup → Delivery
6. M-34 Delivery address → M-35 Adjust map pin
7. M-36 Delivery time
8. M-39 Contact details
9. M-41 Order review: one order per farm, delivery fee, one payment (M-42 explains escrow on tap)
10. M-43 Payment method \[PAY\] → M-44 Payment in progress \[PAY\]. If it fails: M-45; if slow: M-46
11. M-47 Order placed (lists each farm's order number)
12. M-48 Notification primer
13. M-49 Save your details (optional account)

### C. Choosing pickup instead of delivery

Same as flow B, except steps 5–7 become:

1. M-33 Delivery or pickup → Pickup
2. M-37 Pickup points (list or map)
3. M-38 Pickup point detail → Choose this point

After a Farmkeke rider collects from the farm and drops the order at the point (A-54): notification → M-64 Pickup code → consumer shows code at the point → M-65 Confirm receipt (flow F).

### D. Creating an account

1. M-81 Account (guest) → Create account (also reachable from M-04, M-49 or M-59)
2. M-51 Create account: name, email, password
3. M-58 Link past orders (only if guest orders exist for this email or checkout phone)
4. M-52 Account created → back to where they started, signed in and remembered on this phone

### E. Returning user sign in

1. Open the app → M-01 Splash restores the saved session → M-10 Home, already signed in (most returning users stop here)
2. If they signed out earlier: M-81 Account (guest) or M-59 Sign-in prompt
3. M-50 Sign in with email and password (farmers can use their phone number instead of email)
4. Back to the screen they came from, signed in
5. Forgot password branch at step 3: M-53 Forgot password → M-54 Check your email → email link (Resend) → M-55 Create new password → M-56 Password changed → M-50 Sign in. An old link opens M-57 Reset link expired.

### F. Tracking an order to delivery and confirming receipt (releases escrow)

1. M-60 Orders (or a notification, or M-62 Find my order for guests on another device)
2. M-63 Order tracking: Paid → Accepted → Preparing → Ready for rider → Out for delivery (rider's name and phone shown)
3. Rider delivers; dispatch staff mark it delivered on A-54 → consumer gets Delivered — please confirm
4. M-65 Confirm receipt → I received everything
5. M-66 Payment released (escrow moves to Released; farmer sees F-46)
6. M-73 Rate and review

Branch at step 4, There's a problem: M-67 Report a problem → M-68 Problem reported → M-69 Dispute detail. Money stays held until an admin resolves it (flow L).

Branch if the consumer never confirms: reminders go out, the order shows as delivered but unconfirmed on A-61, and staff release the money by hand (A-62) after checking with the consumer. Nothing releases automatically.

### G. Chatting with the farmer about an order

1. M-63 Order tracking → Message farmer
2. M-74 Order chat
3. Farmer gets an alert → F-83 Messages → replies
4. Consumer sees the reply in M-74 (all chats live in M-75 Messages)

Consumers can't cancel orders. If something must stop, staff cancel it on A-52.

### H. Applying to become a farmer (in the app)

1. M-80 Account → Sell on Farmkeke (guests see F-02 and sign in or create an account first)
2. F-01 Sell on Farmkeke → Apply now
3. F-03 Farm details
4. F-04 What you grow
5. F-05 Collection details
6. F-06 Documents (F-06a camera permission the first time)
7. F-07 Payout details
8. F-08 Review and submit
9. F-09 Application submitted
10. Later, from a notification or the card in Account: F-09a Under review, F-09b More info needed, F-09c Approved, or F-09d Not approved

Leaving mid-way saves a draft; F-09e Continue your application picks it up from Account.

### I. Admin approving a farmer request

1. A-10 Dashboard → Farmer requests count (or A-12 alert)
2. A-20 Farmer requests
3. A-21 Request review
4. A-22 Document viewer (check ID and farm photos)
5. A-23 Approve modal → farmer mode unlocks; push and email sent
6. Back to A-20 with the next request

Alternatives at step 5: A-24 Request more info (applicant sees F-09b) or A-25 Reject (applicant sees F-09d).

### J. Approved farmer switches to farmer mode and lists first produce

1. Approval notification → F-09c Application approved → Switch to farmer mode
2. F-12 Notification permission primer (if push is off)
3. F-14 Setup checklist
4. F-70 Business profile → F-71 Collection settings
5. F-21 to F-24 Add listing steps (photos taken in the app)
6. F-25 Listing preview → F-26 Listing submitted
7. Admin: A-41 Listing review queue → A-42 Approve (or A-43 send back; farmer sees F-31)
8. Listing goes live on M-10 and W-01

At any point: Farm tab → Switch to shopping (F-13) returns to the shopping side; the cart and orders are kept.

### K. Farmer handling a new order

1. New order push notification and SMS (or F-10 Dashboard)
2. F-41 New order → Accept within 24 hours (or F-42 Decline; consumer sees M-71)
3. F-43 Order accepted → Start preparing
4. F-49 Packing slip (optional)
5. F-44 Order in progress → Mark packed → Ready for rider pickup (staff assign a rider on A-53 and A-54)
6. Rider arrives → F-45 Confirm handover → Handed to rider
7. Rider delivers or drops at the pickup point; consumer confirms → F-46 Order completed, payment released

If the farmer doesn't respond within 24 hours: F-47 Order expired, and the consumer is refunded.

### L. Admin resolving a dispute

1. A-10 Dashboard → Open disputes, or A-12 alert
2. A-70 Disputes
3. A-71 Dispute detail (reads both sides, messages each party)
4. A-72 Resolve: release, refund \[PAY\] or split
5. Consumer sees outcome on M-69; farmer on F-48; ledger updates on A-60

## 7. Phased build plan

Ten phases, each shippable and testable on its own; every screen appears in exactly one phase. Because farmers now apply inside the app with a Farmkeke account, the app shell and accounts come before farmer onboarding. After that the order follows the supply chain: farmers join and list, consumers browse, then buy. Real money (Phase 7) comes after the full order loop is proven with simulated payments, so the pending payment spec blocks only one phase. Public launch needs Phases 1–9.

1. **Phase 1 — Platform foundations**
   - Goal: staff can sign in and set up the building blocks everything else uses.
   - Admin Portal: A-01, A-02, A-03, A-04, A-05, A-10 (with empty queues), A-80 Categories, A-81 Units, A-82 Pickup locations, A-83 Service areas, A-89 Staff and roles, A-90 Audit log, A-92 My staff account, A-S1 to A-S4.
   - Once done: a Super admin invites staff, sets roles, and configures categories, units (including local measures), pickup points and delivery areas.
2. **Phase 2 — App shell and accounts**
   - Goal: anyone can install the app, create a Farmkeke account and manage it; the website's account pages work too.
   - Mobile app (shopping side): M-01, M-03 to M-07, M-50 to M-59, M-80 to M-85, M-90, M-92, M-93, M-94 to M-97, M-S1 to M-S7.
   - Website: W-40 to W-42, W-42a to W-42d, W-43 to W-47, W-49, W-84, W-86, W-87, W-88, W-S1 to W-S6.
   - Admin Portal: A-35 to A-38.
   - Once done: people create accounts with email and a password, stay signed in, reset forgotten passwords by email (Resend), edit their profile and addresses, and can delete their account (an App Store and Play Store requirement). The app can go to TestFlight and internal Play testing.
3. **Phase 3 — Farmer onboarding (in the app)**
   - Goal: farmers can apply in the app, get approved and set up their farm.
   - Mobile app (farmer side): F-01 to F-09e (application and status; the automatic bank account check on F-07 arrives in Phase 7), F-10 (dashboard shell), F-13 to F-15, F-70 to F-73, F-90 to F-92.
   - Website: W-60 Sell on Farmkeke (sends farmers to the app).
   - Admin Portal: A-20 to A-25 (requests), A-30 to A-33 (farmers).
   - Once done: a user applies with documents and bank details, an admin approves, rejects or asks for more, and the approved user switches to farmer mode and fills in their profile, collection details and availability. Real farmers can be recruited before shopping exists.
4. **Phase 4 — Listings**
   - Goal: approved farmers build the catalogue from their phones and admins moderate it.
   - Mobile app (farmer side): F-20 to F-31.
   - Admin Portal: A-40 to A-43.
   - Once done: farmers photograph produce, add, edit, pause and bulk-manage listings; admins approve or send them back, and trusted farmers' listings go live without review.
5. **Phase 5 — Storefront browsing (app and web)**
   - Goal: anyone can find and look at real produce on both consumer surfaces.
   - Mobile app (shopping side): M-10 to M-18, M-21, M-22, M-86.
   - Website: W-01 to W-07, W-09, W-10, W-80 to W-83, W-85.
   - Admin Portal: A-86 Homepage and featured content.
   - Once done: home, categories, search, product and farm pages all work with live listings, and signed-in shoppers can save items.
6. **Phase 6 — Ordering, dispatch and escrow (simulated payment)**
   - Goal: a complete order runs end to end, with riders, escrow states and the ledger working, using a test "mark as paid" step instead of a real provider.
   - Mobile app (shopping side): M-19, M-20, M-30 to M-39, M-41, M-42, M-47, M-49, M-60 to M-66, M-71.
   - Mobile app (farmer side): F-40 to F-47, F-49, F-60, F-61.
   - Website: W-08, W-20 to W-25, W-30, W-50 to W-52.
   - Admin Portal: A-11 Global search, A-50 to A-52 (orders), A-53 to A-55 (dispatch and riders), A-60 to A-62 (escrow ledger and releases), A-84 Fees, A-85 Order and escrow rules.
   - Once done: a guest orders from one or more farms for delivery or pickup, each farm accepts in the app within 24 hours, staff dispatch a rider, the consumer confirms receipt, and the ledger moves from Held to Released. Declines, 24-hour expiry and manual release of unconfirmed orders all work. Farmers see new orders on the dashboard; alerts come in Phase 9.
7. **Phase 7 — Live payments, refunds and payouts — all \[PAY\]**
   - Goal: real money flows in, is held, and goes out.
   - Mobile app (shopping side): M-43 to M-46, M-72, M-89.
   - Mobile app (farmer side): F-62, F-63, plus the automatic bank account check on F-07.
   - Website: W-26 to W-29, W-56.
   - Admin Portal: A-63 to A-65.
   - Once done: consumers pay for real, money is held, released money is paid out to farmers' accounts, and declines or expiries refund automatically. Replaces the Phase 6 test step.
8. **Phase 8 — Disputes, order chat, reviews and support**
   - Goal: the trust layer that makes escrow meaningful.
   - Mobile app (shopping side): M-67 to M-69, M-73 to M-75, M-91.
   - Mobile app (farmer side): F-48, F-80, F-83.
   - Website: W-53, W-54, W-57, W-58.
   - Admin Portal: A-70 to A-72 (refund outcome uses Phase 7), A-75, A-76.
   - Once done: consumers chat with farmers about an order and report problems, farmers respond from the app, admins resolve with release, refund or split, both sides rate each other, and support works by in-app chat and email.
9. **Phase 9 — Notifications**
   - Goal: nobody has to keep checking a screen to know what's happening.
   - Mobile app (shopping side): M-48, M-87, M-88.
   - Mobile app (farmer side): F-11, F-12, F-75.
   - Website: W-48.
   - Admin Portal: A-12, A-87.
   - Once done: every event in section 5 sends the right message to the right person and opens the right screen, in the right app mode. Ready for public launch on the stores and farmkeke.com.
10. **Phase 10 — Staff tools**
    - Goal: help staff run the business without a developer.
    - Admin Portal: A-88 Help content, A-91 Reports and exports.
    - Once done: staff edit help content and export reports. Farmer insights and promotions are dropped for now.

## 8. Decisions and open questions

All 23 earlier questions were answered on 2 October 2026, and the doc now reflects every answer. The seven follow-up questions are answered too, except the commission rate, which is the only open question left.

### Decisions

| Topic | Decision |
| --- | --- |
| Delivery | Farmkeke riders collect from farms and deliver; staff dispatch them in the Admin Portal (A-53 to A-55) |
| Pickup | Farmkeke-run pickup points; riders bring orders there |
| Carts | One cart can hold several farms; one payment, split into an order per farm |
| Unconfirmed orders | No automatic release; staff release money by hand |
| Farmer response | 24 hours, then the order expires and is refunded |
| Partial orders | Not allowed; whole order only |
| Delivery code | None |
| Cancellation | Consumers can't cancel; only staff can |
| Units | Staff create units in A-81 and they appear on every surface; starts with kg, basket, tuber, crate, bunch, derica, mudu, paint bucket, tray of eggs, piece, bag |
| Guest checkout | No SMS code |
| Guest orders | Remembered on the device |
| Consumer accounts | Email and password (no phone needed to sign in); stay signed in; reset by email |
| Farmer sign-in | Same Farmkeke account as shopping, plus a required phone number; sign in with phone number or email and password; approval unlocks farmer mode; one login per farm |
| Becoming a farmer | Sell on Farmkeke row in Account opens the in-app application (F-01) |
| Payout details | Collected in the in-app application (F-07) |
| Farmer documents | Government ID, farm photos, proof of address, farmers association letter |
| Listing review | Every listing is reviewed until a farmer becomes trusted |
| Messaging | In-app chat per order |
| Growth tools | Insights and promotions dropped for now |
| Support | In-app chat and email |
| Fees | Consumer pays delivery fee; farmer pays commission per sale |
| Bottom navigation | Home, Categories, Cart, Orders, Account |
| Language | English only |
| Email | All email sent through Resend |
| Guest receipt confirmation | Guests can confirm receipt only on the device that placed the order; Find my order on another device is view-only |
| Rider tool | No rider app at launch; staff update delivery status in the Admin Portal (A-54) |
| Unconfirmed orders | Go to staff 1 day after delivery; staff call or message the consumer before releasing |
| Trusted farmers | Staff mark farmers trusted by hand (A-31) |
| Delivery fee | Set per area or zone (A-83) |
| Rejected applicants | Bank details kept in case they reapply |
| Order chat | Never closes; staff can read any chat for safety |
| Farmer surface | Farmers apply and work only in the mobile app (farmer mode, switched from Account); no farmer website or web portal (decided 8 Oct 2026) |

### Remaining open questions

1. **Fees.** What commission % do farmers pay per sale? A-84 holds the rate once it's decided; the delivery fee is already set per zone in A-83.
