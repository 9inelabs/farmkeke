# Farmkeke launch setup guide

Your step-by-step for section C of the launch list. Written 30 October 2026.

Work through it in the order below: later steps need earlier ones. Never paste a key into a chat. Put keys only into the Convex dashboard, Vercel or the terminal commands shown.

## Start these today (they take days to weeks)

| What | Why it's slow | Where |
|---|---|---|
| D-U-N-S number for Farmhaul Technologies Ltd | Apple and Google need it for an organisation account. Free, but can take 1–3 weeks | developer.apple.com/enroll/duns-lookup |
| Paystack business activation (go live) | Paystack checks your CAC documents, director ID and bank account | Paystack dashboard → Activate business |
| Apple Developer Program (organisation, $99 a year) | Needs the D-U-N-S number, then Apple verifies the company | developer.apple.com/programs/enroll |
| Google Play Console (organisation, $25 once) | Identity checks. An organisation account skips the "12 testers for 14 days" rule for new personal accounts | play.google.com/console |

## 1. Production backend

Your production backend is `abundant-ram-87`. It is empty today.

### 1a. Put the code on it

From the project folder:

```
npx convex deploy
```

It asks you to confirm production. Say yes. Run it again whenever we ship backend changes.

### 1b. Sign-in keys (new ones, never copied from development)

```
npx @convex-dev/auth --prod
```

When it asks for the site URL, enter `https://farmkeke.com`. This creates `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` on production.

### 1c. The other settings

Open the Convex dashboard → **abundant-ram-87** (Production) → **Settings → Environment Variables**. Add:

| Name | Value |
|---|---|
| `WEBSITE_URL` | `https://farmkeke.com` |
| `ADMIN_URL` | `https://admin.farmkeke.com` (already set) |
| `AUTH_RESEND_KEY` | A **new** Resend API key made for production (Resend → API Keys) |
| `AUTH_EMAIL_FROM` | Same as development, e.g. `Farmkeke <no-reply@farmkeke.com>` |
| `EMAIL_REPLY_TO` | `Farmkeke Support <support@farmkeke.com>` (once step 4 is done) |
| `TERMII_API_KEY` | Your **regenerated** Termii key (step 3) |
| `TERMII_SENDER_ID` | The Sender ID Termii approved, spelled exactly |
| `TERMII_BASE_URL` | `https://v4.api.termii.com` (from your Termii dashboard) |
| `PAYSTACK_SECRET_KEY` | **Live** secret key, `sk_live_…` (step 2) |
| `PAYSTACK_PUBLIC_KEY` | **Live** public key, `pk_live_…` |

Do **not** set these on production: `PAYMENTS_TEST_STEP`, `AUTH_DEV_LOG_EMAILS`.

### 1d. Starting data and your Founder account

```
npx convex run --prod seed:run
npx convex run --prod admin/setup:createFounder '{"email":"you@farmkeke.com","name":"Your Name"}'
```

- `seed:run` adds categories, units and app version settings. It's safe to run again.
- The Founder gets an email with a link to set a password. Repeat it for each co-founder.
- Never run `seed:sampleAreas` or `seed:demoStorefront` on production: they add made-up data.

### 1e. Fill in the real setup in the Admin Portal

Sign in at admin.farmkeke.com once step 5 is done, then:

1. **Delivery areas**: each real area you deliver to, with its delivery fee and the area's centre on the map.
2. **Riders**: add each rider and approve them.
3. **Fees and rules**: commission (default 5%) and the time limits.
4. **Site photos**: upload the sign-in, sign-up and app farmer-signup photos again. Production has its own storage.
5. **Staff**: invite your team with the right roles.

## 2. Paystack live

You can do this once Paystack has activated the business.

1. Paystack dashboard → switch to **Live** → **Settings → API Keys & Webhooks**:
   - Copy the live secret and public keys into the Convex production settings (1c).
   - Set **Live Webhook URL** to `https://abundant-ram-87.convex.site/paystack/webhook`.
   - Leave the callback URL empty; Farmkeke sends its own.
2. **Settings → Preferences → Transfers**:
   - Turn Transfers on.
   - Turn **off** "OTP for transfers". Otherwise every farmer payout waits for a code sent to you.
3. **Keep money in the balance.** Farmer payouts and refunds are paid from your Paystack balance. Paystack normally sends your money to your bank every day, so ask Paystack support how to keep a float. Otherwise payouts fail with "insufficient balance".
4. **One real test:**
   - Place a small real order on farmkeke.com with your own card.
   - Let the farm (a test farm you control) accept it, then confirm receipt.
   - Check the payout reaches the farm's bank.
   - Do a second order and refund it from the Admin Portal, then check the money comes back to the card.

## 3. Termii

1. Termii dashboard → **API settings** → regenerate the API key. The old key was exposed in a log, so it must be replaced.
2. Put the new key in `TERMII_API_KEY` on **both** deployments:
   - development (`incredible-wolf-877`)
   - production (`abundant-ram-87`)
3. Check `TERMII_SENDER_ID` on both matches the approved Sender ID exactly ("Farmkeke" or "OE Alert", whichever Termii approved).
4. Keep a balance on Termii. Texts go out only for the six events you chose.

## 4. support@farmkeke.com

Pick one:

- **Forwarding (free, quickest):** Cloudflare Email Routing (if farmkeke.com uses Cloudflare DNS) or ImprovMX. Forward support@farmkeke.com to the inbox you read. Add the MX and TXT records they give you to farmkeke.com's DNS.
- **A real mailbox:** Zoho Mail (free plan) or Google Workspace (paid). Better once more than one person answers support.

Either way, this doesn't affect Resend: Resend sends through its own records. When it works, set `EMAIL_REPLY_TO` (1c) on both deployments.

## 5. Vercel production (farmkeke.com and admin.farmkeke.com)

1. Vercel → the Farmkeke project → **Settings → General**: Root Directory is `web`.
2. **Settings → Environment Variables**, scoped to **Production only**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_CONVEX_URL` | `https://abundant-ram-87.convex.cloud` |
   | `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://abundant-ram-87.convex.site` |
   | `NEXT_PUBLIC_SITE_URL` | `https://farmkeke.com` |

   Keep the **Preview** values pointing at development (`incredible-wolf-877`), so test builds never touch real orders.
3. **Settings → Domains**: add `farmkeke.com`, `www.farmkeke.com` (redirect to farmkeke.com) and `admin.farmkeke.com`. Add the DNS records Vercel shows at your domain registrar.
4. Redeploy production (Deployments → the latest → Redeploy). Then check:
   - farmkeke.com opens
   - admin.farmkeke.com shows the staff sign-in
   - a password-reset email arrives

## 6. Push notifications

1. Install the EAS command and sign in:
   ```
   npm install -g eas-cli
   eas login
   eas init
   ```
   `eas init` adds a project ID to `app.json`. Tell me, and I'll commit it.
2. **Android (Firebase):**
   1. console.firebase.google.com → new project "Farmkeke" → add an Android app with package `com.farmkeke.app`.
   2. Download `google-services.json` and put it in the project folder. Tell me, and I'll connect it in `app.json`.
   3. Firebase → Project settings → Service accounts → **Generate new private key** (a JSON file).
   4. Run `eas credentials` → Android → production → **Google Service Account → FCM V1** → upload that JSON. Keep the file private and never commit it.
3. **iPhone:** once the Apple account is active, `eas build` offers to make the push key for you. Say yes.

## 7. The app stores

### Build and send

```
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

Production builds already point at the production backend (`eas.json`).

### What each store asks for

| | Apple App Store | Google Play |
|---|---|---|
| Icon | From the build (1024×1024) | 512×512 PNG for the listing |
| Screenshots | iPhone 6.9" (1320×2868), 3 to 10 | Phone, at least 2 (1080×1920 or larger) |
| Extra artwork | none | Feature graphic 1024×500 |
| Privacy policy URL | https://farmkeke.com/legal/privacy | same |
| Account deletion | In the app (Account → Delete account) | Also a web link: https://farmkeke.com/account/delete |
| Privacy form | "App Privacy" in App Store Connect | "Data safety" in Play Console |
| Content rating | Age rating questionnaire | IARC questionnaire |

**What to declare on the privacy forms.** Farmkeke collects:
- name, email and phone number
- delivery address
- location (to find your area)
- photos (farmers' produce, farm and ID documents)
- purchase history
- messages with farms and support

Payments are handled by Paystack, so Farmkeke never sees card numbers. Nothing is used for tracking or advertising, and data is sent encrypted.

**Reviewer test accounts.** Make these on **production**, and put them in the "App Review information" (Apple) and "App access" (Google) sections:
- a shopper account (email and password)
- a farmer account (phone and PIN) whose farm is approved and has a listing

Reviewers can also browse as a guest.

## 8. Optional

- **Crash reporting (Sentry):** make a free account at sentry.io and an organisation and project for React Native. Tell me, and I'll connect the app and the website.
- **App links** (farmkeke.com links open the app):
  - After the first store builds, send me the Apple Team ID.
  - Also send the Android signing certificate's SHA-256 fingerprint: run `eas credentials` → Android → production; it's shown there.
  - I'll then publish the `.well-known` files on farmkeke.com and turn the links on in the app.

## App icon files

Put these in `assets/` with exactly these names, replacing the current files:

| File | Size | Rules |
|---|---|---|
| `icon.png` | 1024×1024 | Square, edge to edge, **no** transparency, **no** rounded corners and **no** white margin. Apple rounds the corners itself. Keep the wordmark inside the middle 80%. |
| `android-icon-foreground.png` | 1024×1024 | Transparent background. The logo must fit inside the central circle about 680px wide (66%), because Android crops icons to circles and other shapes. |
| `android-icon-background.png` | 1024×1024 | The pale green, solid, nothing else. |
| `android-icon-monochrome.png` | 1024×1024 | The logo in one colour (white) on transparent, same safe circle. Android 13 uses this for themed icons. |
| `splash-icon.png` | 1024×1024 | Transparent background, logo centred. Shown about 220px wide on the white launch screen. |
| `notification-icon.png` (new) | 96×96 | White shape on transparent, no colour. Android shows it in the status bar. |
| Google Play listing icon | 512×512 | Same design as `icon.png`. Uploaded in Play Console, not to the project. |

About your draft (`assets/farmkeke app icon.png`):
- It has a white border and a rounded square inside it. On a phone that shows as a white frame with a second rounded box inside the icon.
- Make the pale green fill the whole square instead, with no white and no corners, and keep "farm / keke" as large as fits in the middle 80%.
