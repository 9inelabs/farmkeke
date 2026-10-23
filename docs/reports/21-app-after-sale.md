# Phase 21: Mobile app after-sale (batch D)

Batch D of the app work (build plan section 7). After an order, shoppers can now:

- report a problem and follow the case, writing to the farm and Farmkeke;
- rate the order;
- chat with the farmer about an order, and see all their chats;
- talk to Farmkeke support in the app.

Farmers get the same in-app support from their settings. Every screen uses existing Convex functions; there are no backend changes.

## 1. What was built, by file

### Shared

- `src/features/chat/ChatThread.tsx` (new): the conversation used by order chat, the problem case and support.
  - Newest messages sit at the bottom, and older ones load as you scroll up.
  - Day labels ("Today", "Thu 22 Oct").
  - My messages are dark green, with a lime tick once read. The other side's are white. Farmkeke support's are tinted, with their name shown.
  - Photos in a message open full screen.
  - The composer has a photo button, a text box that grows, and a lime send button. If sending fails, what you wrote is kept.
  - A closed state with a reason.
- `src/features/chat/useAttachments.ts` and `AttachmentStrip.tsx` (new): photos for messages and reports.
  - Each photo is picked, shrunk, and uploaded straight away with a progress bar.
  - A failed upload can be retried; any photo can be removed.
  - Sending waits until every photo is up.
- `src/lib/upload.ts`: uploads also work in the browser preview. It sends the photo's bytes, not the phone-only `{ uri }` form.
- `src/components/icons`: Flag, Headphone and Messages added.

### Screens

- `app/order/[id]/problem.tsx` and `src/features/orders/ProblemForm.tsx`: **M-67 Report a problem**:
  1. **What went wrong:** items missing, damaged or spoiled, wrong item, less than I ordered, or something else.
  2. **Which items:** each with a stepper for how many units were affected, and a live "Amount in question" (delivery isn't included).
  3. **What happened**, plus up to five photos.
  - A note says the payment stays held.
  - It sends with `disputes.open`. If the order can't be reported, the screen says why: another phone, already reported, already confirmed, or not delivered yet.
- `app/order/[id]/problem-sent.tsx`: **M-68 Problem reported**: the case number, order, problem, when the farm can reply by and when we decide by, then "Follow this case".
- `app/order/[id]/dispute.tsx`: **M-69 Dispute detail**:
  - A dark card with the case and order numbers, the problem, the amount, the status and "still held".
  - The decision when there is one: refund, part refund, or paid to the farm, with the amounts and a link to the refund.
  - A timeline: you reported, the farm replied (or didn't in time), then Farmkeke decides.
  - What was reported, with photos, and the farm's reply with its stance ("Agrees to refund").
  - Messages with the farm and Farmkeke support (`disputes.sendMessage`). Unread messages are marked read on open.
- `app/order/[id]/review.tsx`: **M-73 Rate and review**:
  - The farm's photo, five large stars with a word ("Excellent"), and quick tags (Fresh, Well packed, and so on).
  - Optional stars for each item, and a comment. It sends with `reviews.submit`.
  - "Thanks for confirming" (M-66) now has a row of stars that opens this screen with the rating already chosen.
- `app/order/[id]/chat.tsx`: **M-74 Order chat**:
  - The farm's name, and how quickly it usually replies.
  - The order at the top; tap it to open the order.
  - Messages with photos (`chat.send`). It's marked read on open.
  - Orders that never went ahead can't be messaged, and the screen says so.
- `app/messages.tsx`: **M-75 Messages**: every order chat, latest first, with a preview, the time and an unread count. It has an empty state.
- `app/support/index.tsx` and `app/support/[ticketId].tsx`: **M-91 Contact support** (and **F-91** for farmers, with `?side=farm`):
  - Earlier conversations, with unread dots.
  - A new message: pick the order it's about (or "not about an order"), write it, and add up to four photos.
  - The email address is still offered.
  - Each conversation opens in the chat thread. Writing again reopens a resolved one.
  - Guests get a guest identity first, so they can write too.
- **M-87 Notifications** already existed from batch C's bell. Its links to `/order/<id>/chat` and `/support/<id>` now open these screens.

### Where they're reached from

- **The order screen:**
  - "Need help?" now has Message the farmer, Report a problem (or View your problem report), Contact Farmkeke support, and Help and FAQ.
  - The next step for a completed order is "Rate your order", until it's rated.
  - A disputed order gets "Follow this case".
- **Confirm receipt:** "There's a problem" opens Report a problem. Batch C's email link is gone.
- **My Orders:** a chat button in the header, with a dot for unread messages, opens Messages.
- **The Account tab:** Messages and Contact support rows.
- **Farmer settings:** Contact support has "Message Farmkeke support", which opens the shared support screens on the farm side.

### Previews

- `app/dev/chat.tsx` (new): a sample conversation on the real chat thread. Messages you send stay on that screen.
- `app/dev/orders.tsx` gained a "Report a problem" sample.

## 2. Deviations from the spec and why

- **The order chat's safety note** (M-74: Farmkeke can read it) is in the empty chat, not repeated once messages exist.
- **Contact support (M-91)** is a conversation, not a form that sends an email. The backend already keeps support as tickets with messages, and staff answer in the admin portal. Email is still offered.
- **Support photos** use the order chat's upload link, because support has no upload link of its own. Uploads are checked when the message is saved, either way.
- **The reasons** match the website's five. "Order not received" isn't offered, because a problem can only be reported once an order is marked delivered or collected.
- **The review screen** can't be shown with sample data, because it reads the order's review state from the backend.

## 3. Bugs found and fixed

- **A malformed order id crashed the review screen.** It showed up during verification as a server validation error: `reviews.forOrder`, `disputes.forOrder` and `chat.thread` take a typed order id, so a bad id failed instead of showing a message. The review, case, problem-reported and chat screens now load the order first and only then ask for the review, case or chat. A link that isn't one of your orders shows a plain "couldn't open" screen.
- **Photo uploads would have failed in the browser preview.** The upload sent the phone-only `{ uri }` object, which the browser can't send. Fixed in `src/lib/upload.ts`.
- **An orange browser focus ring** on the multi-line boxes (problem note, review comment, support message) is removed on web. The box's own border shows focus.
- **The sample page's chip bar covered the "Send report" button** in automated clicks. This was a test-setup issue only; the test now clicks the button directly.

## 4. Verification

- `npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 8 files, 53 tests passed.
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and used Playwright at 390 x 844:
  - **The sample chat:** sent a message, which appeared at the bottom.
  - **Messages:** the empty state.
  - **Contact support:** empty, then with the "Write a message" error.
  - **My Orders:** the new Messages button.
  - **The Account tab:** the new rows.
  - **With an id that isn't an order:** Report a problem, Rate your order, order chat and the problem case, each showing a plain "couldn't open" state.
  - **The sample orders:** delivered, with the new help rows, and completed, with "Rate your order".
  - **The problem form:** empty, with errors, then filled; partly affected units show the amount in question.
  - No console errors after the fix above.
- **Not run against real orders.** The preview uses the live backend, which has no test orders, so I didn't send a report, a review, a chat message or a support message. These screens are typechecked against the generated Convex API, and call the same functions the website uses.

## 5. Open questions or decisions that had to be guessed

- **Support reply time.** The app says a person "usually replies within a few hours". Is that the promise you want to make, and should it name hours?
- **A test order** (asked in reports 19 and 20) would let me check this whole batch end to end: report, the farm's reply, a decision, a refund, chat and a review.

## 6. What's next

Batch E, farmer orders and money:

- F-10 with live data: the farmer's dashboard.
- F-11.
- F-40 to F-49: accepting or declining orders, hand-over, and entering the pickup code.
- F-60 to F-63: earnings and payouts.
- F-80: reviews.
- F-83: the farmer's chats, which use the same chat thread.
