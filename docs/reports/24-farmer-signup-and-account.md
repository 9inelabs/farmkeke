# Phase 24: Farmer sign-up by phone, the new Account screens, smaller headers

This phase follows the founder's new designs and decisions (24 Oct 2026).

**New farmer sign-up.** It goes phone number, then the verification code, then about you and your farm (photo, full name, farm name, location), then bank details, then review.

**Logging in as a farmer.**
- Farmers log in with their phone number and a 4-digit PIN they choose at sign-up. No code is texted at login. They get there from "Log in as farmer" on the sign-in and sign-up screen.
- A texted code is used only at sign-up and for "Forgot PIN".

**Approval.** Farmkeke still approves each farmer, but only on the short form.

**Account tab.**
- Signed-in shoppers get the "Settings & Support" design.
- Guests get the designed guest screen.

**Look.**
- Titles beside the back chevron are smaller.
- List rows follow the new designs.

## 1. What was built, by file

### Backend (Convex)

- `convex/lib/phoneAuth.ts` (new): the phone sign-in, a Convex Auth credentials provider called `"phone-code"`. It has four steps:
  - **send:** texts a 6-digit code through Termii. Without a Termii key, the code is written to the Convex logs only when `AUTH_DEV_LOG_EMAILS` is `"true"`; otherwise sending fails with "We can't send texts right now".
  - **verify:** checks the code and signs the person in.
  - **setPin:** sets the 4-digit PIN. This is allowed only within 30 minutes of proving the phone with a code.
  - **pin:** logs in with phone and PIN.
  - **PIN storage and lockout:** PINs are hashed with the same scrypt as passwords. Five wrong tries pause logins for that number, using the same lockout as passwords.
  - **Rejected PINs:** all-same digits like 0000, and straight runs like 1234 or 9876.
- `convex/phoneAuth.ts` (new): the database side of the phone sign-in.
  - **The code:** only a hash of it is kept. It lasts 10 minutes, allows 5 tries, and a number can request at most 5 codes an hour.
  - **Who a code signs in:**
    - the account that owns the phone;
    - otherwise the person already signed in on the phone (a guest becomes a full account and keeps their orders);
    - otherwise a new account.
  - **Who counts as the owner:** only someone whose phone was proved with a code, or an approved farm. A number someone merely typed into their profile can't be used to take over their account.
  - **Phones already in use:** a different signed-in account can't take a number that belongs to someone else ("This number belongs to another account").
  - `phoneAuth.mine` tells the app whether the signed-in person has a phone login and a PIN.
- `convex/schema.ts`:
  - `phoneCodes` (new).
  - `farmerApplications.fullName` and `photoStorageId`.
  - `farms.farmSize` and `farmType` are now optional, since the short form doesn't ask for them.
- `convex/farmerApplications.ts`:
  - `saveProfile` (new) saves the name, photo, farm name and location. It also puts the name on the account, because phone accounts start without one.
  - `start` copies the verified phone onto the application.
  - `mine` returns the photo's URL.
- `convex/lib/application.ts`:
  - **What an application needs now:**
    - full name;
    - farm name;
    - a verified phone;
    - state, LGA, and an address or landmark;
    - bank, account number and account name.
  - **What it no longer needs:** produce, collection hours and documents. The photo is optional.
  - **Defaults** for a new farm, until the farmer confirms their own: collection Monday to Saturday, 8am to 5pm, and 24 hours to prepare.
- `convex/admin/farmerRequests.ts`:
  - Approval checks the short form.
  - The new farm takes the photo, collects at the farm's address, and uses the default hours until the farmer confirms them in their setup checklist (F-14).
  - Older applications without a full name use the account's name.
  - Staff see the applicant's photo.
- `convex/_generated/api.d.ts`: the two new modules are added by hand. `npx convex codegen` needs a deployment, which this environment doesn't have.
- `convex-tests/phoneAuth.test.ts` (new), 7 tests:
  - codes expire and are used once;
  - 5 tries per code;
  - 5 codes an hour;
  - a new phone makes a new account;
  - a guest is upgraded and keeps their orders;
  - an owner is signed in;
  - another account is refused;
  - a typed-but-unproved number isn't an owner;
  - the PIN rules.

### Farmer sign-up (app)

- `src/features/sell/SellShell.tsx` (new): the frame from the designs:
  - the lime band with "< Back" or "< Close";
  - the light sheet with a large curved top corner (left, right or both, as each design has it);
  - the tilted white "Sell on farmkeke" sticker on its edge;
  - the title with its last word in grey ("Input your Phone **Number**"), the short line under it, and the black button.
- `src/features/sell/CodeBoxes.tsx` (new): the digit boxes for the 6-digit code and the 4-digit PIN (shown as dots), over one hidden input, so the keypad, paste and SMS autofill work.
- `src/features/sell/usePhoneAuth.ts` (new): the four steps, plain-words errors, and the masked number ("0902 *** 3382").
- `src/features/sell/afterSignIn.ts` (new): where a farmer goes once signed in:
  - an approved farm opens farmer mode;
  - a submitted application shows its status;
  - otherwise the application starts or continues at its first unfinished step.
- `app/sell/index.tsx`, "Sell Straight to Households", as designed:
  - the wordmark and the three promises;
  - "Sell on farmkeke" above the black "Apply as a farmer today";
  - "Already selling? Log in" and "Terms & Conditions apply".
- `app/sell/phone.tsx` (new): "Input your Phone Number", then "Get Verification Code". With `?mode=reset` it's "Reset your PIN".
- `app/sell/code.tsx` (new): "Enter Verification Code", sent to the masked number.
  - The six boxes check themselves when full.
  - "Resend" unlocks after 30 seconds.
  - A wrong code says how many tries are left.
- `app/sell/pin.tsx` (new): "Create your PIN", then "Confirm your PIN". If they don't match, it starts over with a message.
- `app/sell/apply/profile.tsx` (new): "Let's get to know you!":
  - The photo circle in a lime ring, uploaded straight away.
  - Full Name and Name of Farm.
  - "Select location" opens "Where's your farm?": state, LGA, and an address or landmark.
  - "Search location automatically" uses the phone's location, fills in what it can, and opens the same sheet so the farmer can check it and add a landmark.
  - "Set Bank Details".
- `app/sell/apply/bank.tsx` (new): "Add your Bank Details":
  - Choose the bank and type the 10 digits; the account name is looked up with the bank and shown with a tick. When payments aren't live, the farmer types the name.
  - It explains that earnings are paid here automatically once buyers confirm their orders, as they already are by Paystack transfer.
- `app/sell/apply/review.tsx`, "Review your Profile":
  - The photo and name, then each detail.
  - Edit on each card, which comes back to the review.
  - Anything missing is marked in red.
  - Farmkeke's note when it asked for more information.
  - The farmer terms, then "Submit Application".
- `app/sell/submitted.tsx`: "Application Sent", with the reference and what happens next.
- `app/sell/login.tsx` (new): "Log in as a Farmer". It takes the mobile number and the 4 PIN boxes, then "Log in". "Forgot PIN?" goes to the phone step in reset mode.
- `src/features/auth/AuthScreen.tsx`: "or" and an outlined "Log in as farmer" under the sign-in and create-account form. The sign-in field now asks for an email only.
- **Removed:** the old six-step application (farm, produce, collection, documents and payout steps, `ApplyStep`, `StepFooter`).
  - `src/features/farmer/constants.ts`: the steps are now You and your farm, Bank details, and Review.
  - `app/sell/status.tsx`: "Start a new application" opens the new first step.

### Account (app)

- `app/(shop)/account.tsx`:
  - **Signed in**, the "Settings & Support" design:
    - The title, with the person's name and email, and their avatar (which opens their profile).
    - **Settings Hub:** Account, Login details, Saved addresses (with a count), Saved items, Notifications.
    - **Account Management**, with a red "New" tag: the selling row, and Delete Account.
    - **Support & FAQs:** Search FAQ, Contact Support, Messages, How Farmkeke works.
    - **App:** App Updates (with the version), Terms and policies, Sign out.
  - **Guest**, the new design:
    - "Account" and "You're shopping as a guest".
    - The "Sign in for a faster checkout" card, with the lime Sign in and light Create Account side by side in a framed row.
    - The help rows, each with a short line under it.
    - "Sell on farmkeke", the black "Apply as a farmer today", "Already a farmer? Log in", and "Terms & Conditions apply".
- `src/features/farmer/SellingEntry.tsx`: now one row, so it fits in Account Management:
  - Sell on Farmkeke;
  - Continue your application ("1 of 2 parts done");
  - under review, more information needed, or not approved;
  - or "Switch to farmer mode" with the farm's photo.

### Look across the app

- `src/theme/typography.ts`:
  - Titles beside the back chevron use a new `backTitle` style, 18pt instead of 28pt.
  - Tab titles (`screenTitle`) are 24pt instead of 28pt.
- `src/components/ui/ScreenHeader.tsx`:
  - A smaller chevron, the smaller title, and a tighter top.
  - An optional line under the title.
  - Every screen with a back header picks this up.
- `src/components/ui/ListRow.tsx`, matching the Settings & Support design:
  - **Rows:** a plain line icon (no tinted square), the title, an optional grey line, and a chevron. An extra item (a count, an avatar) can sit before the chevron.
  - **Groups:** rounded cards without dividers under small grey labels, with an optional "New" tag. They're grey on white screens and white on grey screens.
  - Every list in the app picks this up: legal, about, login details, choose area, support and the rest.
- `src/components/ui/TextField.tsx`: a lime-outlined style, as on the sign-up screens.

### Website (admin portal)

- The application page shows the farmer's photo and full name.
- Farm size and type show "–" when missing. `web/src/convex/returns/adminFarms.ts` is updated to match.

### Previews

- `app/dev/sell.tsx` (new): the profile, bank and review screens with sample applications (empty, filled, missing details).
- `app/dev/account.tsx` (new): the signed-in Account with a sample person.
- `src/features/farmer/useApplication.ts` takes a sample application from the dev page through context; real screens are unchanged.

## 2. Deviations from the spec and why

- **A 4-digit PIN at login**, not the phone number alone. You chose this after I raised that phone numbers are seen by buyers and riders: phone-only login would let anyone with the number in, including to the payout bank details.
- **The "Where's your farm" choice sits on "Let's get to know you!"**, as in your design and as you confirmed.
  - "Select location" opens a short sheet: state, LGA, and an address or landmark.
  - Riders need the address or landmark to find the farm gate, so it's required.
- **The location note** in the design said "We never share your location with farmers", which is the shopper's wording. On the farmer's screen it says "Only Farmkeke and your riders see the exact location".
- **The profile picture is optional**, so a missing photo doesn't hold up sign-up. Staff see it when there is one, and it becomes the farm's photo on approval.
- **A guest who signs up as a farmer keeps their orders.** Their guest identity becomes the farmer account, instead of a separate new one.
- **Approval** fills in collection at the farm's address, Monday to Saturday 8am to 5pm, and 24 hours to prepare. The farmer confirms or changes these in the setup checklist, which already asks for them.
- **"Account Switching"** in the design is the existing selling row: Sell on Farmkeke, the application's status, or Switch to farmer mode.
- **"Financial", "Customization" and "Links"** from the design aren't shopper features. That group holds the shopper's own settings instead.
- **Farmers who signed up earlier with email and password** can still sign in that way. To get a PIN, they use "Forgot PIN?" once with their farm's phone number.

## 3. Bugs found and fixed

- **Wrong-code tries weren't counted.** The first version recorded the try, then threw an error. A Convex mutation that throws rolls back its writes, so the count never went up and the 5-try limit didn't hold. The new test caught it. The mutation now returns the failure, and the sign-in action raises the error.
- **Older applications would have failed approval.** The short form requires a full name, and applications submitted before it have none. The account's name now stands in, in the app, at submit and at approval. The existing "farm application approved email" test caught this.
- **A typed phone number could have been taken over.** As first written, a code sent to a number signed in to any account that had that number on file, even if it was only typed into a profile. Now only a proved phone, or an approved farm's phone, counts.
- **Saving from Edit on the review screen** stacked another review screen on top. It now goes back to the review.
- **Help and FAQ's line** was cut off on the guest Account. It's shorter now.

## 4. Verification

- `npx tsc --noEmit -p .` (app): no errors.
- `npx tsc --noEmit -p convex`: no errors.
- `cd web && npx tsc --noEmit -p .`: no errors.
- `cd convex-tests && npm test`: 9 files, 60 tests passed (53 before, plus 7 new).
- `npx expo export --platform web --output-dir app-preview/dist` with the live Convex URL succeeded.
- I served it with the same fallback as the Vercel rewrite and used Playwright at 390 x 844:
  - **The sign-up and login screens:** the Sell intro, phone, code, PIN, log in, and submitted.
  - **`/dev/sell`:** profile empty and filled, bank, review, and review with missing details.
  - **Account:** guest, and signed in on `/dev/account`.
  - **The smaller headers:** sign in (with "Log in as farmer"), notifications, help and messages.
  - **On the PIN screen:** entering 2580 moved to "Confirm your PIN". Entering 1111 then started over with "Those PINs don't match".
  - No console errors.
- **Not run against the live backend.** Sending a code, verifying it, setting a PIN, logging in, saving the profile and bank, and submitting were not run there.
  - They would create real accounts and applications, and send real texts.
  - The backend rules are covered by the new tests.
  - The screens are typechecked against the generated API.

## 5. Open questions or decisions that had to be guessed

- **Deploy and texts.**
  - Deploy the backend (`npx convex deploy`): the schema adds `phoneCodes` and two optional application fields, and makes two farm fields optional.
  - Sign-up codes need `TERMII_API_KEY` set. Without it, sign-up shows "We can't send texts right now", unless `AUTH_DEV_LOG_EMAILS` is `"true"`, in which case codes appear in the Convex logs for testing.
- **Applications already in progress** under the old six steps are kept. They now only need the short form's details, and any documents already uploaded stay attached for staff to see.
- **Should approval still be needed?** You chose approval on the short form. If later you'd rather farmers sell straight away, the approval step can create the farm at submit instead.
- **The PIN window.** A PIN can be set within 30 minutes of the code. Is that long enough for slow connections?

## 6. What's next

- **Your setup:** deploy the backend and set the Termii key.
- **One check end to end** on a test deployment or with your go-ahead:
  1. Sign up with a real phone.
  2. Approve in the admin portal.
  3. Log in with the PIN.
  4. Set collection hours.
  5. Add a listing.
- **Still open from report 23:**
  - the EAS project id and Firebase, for push;
  - M-58 Link past orders.
