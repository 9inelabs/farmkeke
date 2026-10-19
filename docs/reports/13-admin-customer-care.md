# Phase 13: Admin Portal customer care

Branch: `admin-portal`. This is phase 4 of the Admin Portal plan. It covers customers, problem reports (disputes) with the money decision, the support inbox, and reading order chats.

## 1. What was built, by file

### Backend (`convex/`)

- `lib/auth.ts`: new `isStaffWith(ctx, userId, permission)`.
- `admin/disputes.ts`:
  - `assign` now accepts portal staff whose role can handle problem reports. It used to check the old `users.staffRole` field, so it would have refused everyone approved through the portal.
  - New `openCount` for the sidebar badge.
- `admin/support.ts`:
  - `assign` gets the same fix (needs `support.manage`).
  - New `openCount`: open conversations where the last message isn't from staff.
- `admin/staff.ts`: new `assignable({ permission })`, the approved staff who can be given a case.
- `admin/consumers.ts`:
  - `list` and the new `find` mark staff (old field or portal), farmers (with their farm) and blocked accounts.
  - `find` looks up an exact email or a phone number (any Nigerian format).
  - `get` adds the account's last 30 orders and how many devices it's signed in on.
  - `setBlocked` refuses portal staff too.
  - New `signOutEverywhere` ends every session and refresh token.
  - New `sendPasswordReset` action sends the shopper's usual reset email from the server, so the staff member isn't signed out.
- `admin/uploads.ts`: problem-report and support staff can upload photos for their replies.

### Website (`web/src/`)

New sidebar group "Customer care": Customers, Problem reports (badge), Support inbox (badge). The dashboard also shows open problem reports and support messages waiting.

- `app/admin/(portal)/customers/`:
  - every account with shopper, guest, farmer, staff and blocked badges;
  - find by email or phone;
  - a "Deleted accounts" tab: deleted, or waiting for their orders to finish.
- `customers/[userId]`: account details, orders, saved addresses and staff actions on the account. Actions:
  - send a password reset link;
  - sign out everywhere;
  - block or unblock.
  - Staff accounts point to Staff instead.
- `app/admin/(portal)/disputes/`: tabs for waiting for the farm, farm replied and decided, with "New message" and "Farm reply overdue" flags and who it's assigned to.
- `disputes/[disputeId]` shows:
  - the shopper's report (items, amount, note, photos) and the farm's reply, or when it's due and whether it's overdue;
  - the two conversations, with the shopper and with the farm, each with a reply box and photos;
  - staff notes;
  - who it's assigned to.
- The **Decide** dialog moves the money and tells both sides:
  - full refund;
  - part refund, from the products only, with the rest paid to the farm;
  - no refund.
  - It needs a decision note both sides see and an audit reason. It's blocked while the order's money is on hold.
- `app/admin/(portal)/support/`: open and resolved conversations from shoppers and farmers.
- The conversation page (`support/[ticketId]`): the thread, with older messages on demand; reply with photos; assign; mark resolved, with what was done. It links to the person's account, farm and order.
- `app/admin/(portal)/orders/[orderId]/chat/`: the order chat between shopper and farm, read only.
- `components/admin/Thread.tsx` (new): the shared message thread and reply box, which uploads up to 4 photos.
- `convex/returns/adminCare.ts` (new); labels for problem-report states, outcomes and the new audit actions.

## 2. Deviations from the spec and why

- **Order chats are read only.** The existing `admin/chat` functions only read. Staff talk to the shopper or farm through a problem report or support, so they don't post into a private shopper–farm chat.
- **Customer search is by exact email or phone.** There's no name search index on `users`, and a full scan wouldn't scale. The list is newest first with "Show more". Name search can come with phase 6's global search.
- **The order page's chat link changed.** Phase 3 linked to `/admin/chats/<conversationId>`, but the chat functions take the order, so the page is `/admin/orders/<orderId>/chat`.

## 3. Bugs found and fixed

- **Assigning work refused every portal staff member.** `disputes.assign` and `support.assign` checked `users.staffRole`, the field from before the portal. Fixed with `isStaffWith`. Without this, assigning a case to anyone approved through the portal would have failed with `NOT_STAFF`.
- **Staff accounts could have been blocked.** `consumers.setBlocked` and `list` only knew about the old field, so portal staff could be blocked from the Customers screen and showed as shoppers. Both now check `staffMembers` too.
- **Sending a reset link from the browser would sign the staff member out.** Calling the reset sign-in flow from the browser clears its session (phase 10, section 3). Customer resets run through the server action `sendPasswordReset`.

## 4. Verification

- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **33 passed, 1 failed.** The failure is the same `storefront.test.ts` Windows-path sample test.
- New test in `convex-tests/admin.test.ts`:
  - who can be assigned support work; an unknown permission is refused;
  - find by email (any capitalisation) and by phone (spaced local format);
  - staff accounts are marked and can't be blocked;
  - sign out everywhere ends the shopper's session;
  - a support conversation can be assigned to support staff but not to a shopper;
  - the open counts.
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes.
- **Visual check at 390px and 1440px**, with the sample-data preview: customers, a customer, problem reports, a problem report, the support inbox, a conversation and an order chat. No page errors and no horizontal scroll. The only console errors were the blocked sample photo host.

## 5. Open questions or guesses

- **The decision deadline** ("decide by") comes from the backend's fixed 24 hours (`DEFAULT_RULES.disputeDecideHours`). It isn't on the Fees and rules page because the backend doesn't store it as a setting yet.
- **What resolving support means:** when the person writes again, the conversation reopens. That's how the support backend already works.

## 6. What's next

Phase 5 (money):
- the escrow ledger and release queue;
- holds;
- payouts and retries;
- refunds and retries;
- Paystack reconciliation and the bank list check.
