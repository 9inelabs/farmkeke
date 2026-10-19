# Phase 10: Admin Portal foundations

Branch: `admin-portal`. The portal lives in the website at `/admin` (farmkeke.com/admin). This phase covers the plan's phase 1: roles and permissions, staff applications, Founder setup, emails, sign-in with an emailed code, the portal frame, staff and roles screens, the audit log and alerts. The modules for farmers, products, operations, care and money come in later phases.

Decisions confirmed by the owner before building:
- Edit `convex/` on the branch; the owner deploys.
- Founder: created from the backend with an email only, then sets the password from an emailed link.
- All 8 roles, and the Founder can create custom roles.
- Any email can apply (not only @farmkeke.com).
- Riders are added by staff (no rider app). Profiles: photo and ID, vehicle and plate, guarantor, bank details. This is used in phase 3.
- The Resend sending domain is verified.
- Design the portal from the website's style (there are no admin designs).

## 1. What was built, by file

### Backend (`convex/`)

- `lib/permissions.ts` (new): the 31 permissions, each with a group, label and description; the 8 built-in roles (Founder, Admin, Operations, Support, Finance, Catalog & Content, Dispatch, Viewer); and how the old `staffRole` values map to the new roles.
- `schema.ts`: three new tables.
  - `staffRoles`: a named set of permissions.
  - `staffMembers`: one row per applicant or staff member. Status moves from `email_unconfirmed` to `pending`, `more_info`, then `approved` or `rejected`; approved members can be `deactivated` and restored.
  - `staffSessions`: sessions that passed the emailed code, removed after 12 hours.
  - `users.staffRole` is kept and marked as the old field.
- `lib/auth.ts`:
  - `requireStaff(ctx, permission | permission[] | null)` now checks three things: an approved member, a session verified with the code, and the role's permissions.
  - New `getStaff` and `requireStaffContext`.
  - Errors: `NOT_STAFF`, `STAFF_VERIFY`, `FORBIDDEN`.
- `lib/staffAuth.ts` (new): the portal's sign-in flows, added to the existing `password` provider:
  - `staffApply`, `staffSignIn` and `staffCode`;
  - `staffReset` and `staffSetPassword`;
  - two Email providers: `staff-code` (6 digits, 10 minutes) and `staff-link` (60 minutes);
  - staff passwords need 10+ characters, a letter and a number.
- `lib/passwordProvider.ts`: sends the staff flows to `staffAuthorize` and registers the two providers. The shop's flows are unchanged.
- `admin/access.ts` (new):
  - `me`, the portal gate: `signed_out`, `not_staff`, `application`, `deactivated`, `verify` or `staff`;
  - `permissionCatalog`, `updateApplication` (the applicant answers "more information") and `sendPasswordLink`;
  - internal `recordApplication`, `codeVerified`, `expireSession`, `memberByEmail` and `myStaffEmail`.
- `admin/staff.ts` (rewritten):
  - members and applications: `listMembers`, `pendingCount`, `getMember`, `approve`, `reject`, `requestInfo`, `changeRole`, `setActive`;
  - roles: `listRoles`, `createRole`, `updateRole`, `deleteRole`;
  - `listAuditLog`, which now includes the actor's name and can filter by actor;
  - alerts are unchanged except that any staff member can read them.
  - The old CLI stand-ins `bootstrapSuperAdmin`, `setStaffRole`, `setStaffRoleByEmail` and `listStaff` are removed.
- `admin/setup.ts` (new, internal only):
  - `createFounder({ email, name })`, which also creates the built-in roles and emails the password link;
  - `makeFounder` and `ensureRoles`;
  - `migrateLegacyStaff`, which copies old `staffRole` users into `staffMembers`.
- `notifications/staff.ts` (new): the staff emails, sent in the background. They cover:
  - application received;
  - new application (to everyone who can approve staff), and "application updated" when the applicant answers;
  - approved, with the role and what it allows;
  - rejected and more information;
  - role changed;
  - access removed or restored.
- `lib/emails.ts`: 9 new templates in the shared email design: `staffCodeEmail`, `staffPasswordLinkEmail`, `staffApplicationReceivedEmail`, `staffNewApplicationEmail`, `staffApprovedEmail`, `staffRejectedEmail`, `staffMoreInfoEmail`, `staffRoleChangedEmail` and `staffAccessEmail`. Also `adminLinks`.
- `lib/notify.ts`:
  - new `staffWithPermission`;
  - `notifyStaff` now reaches staff whose role has a given permission (default `disputes.manage`) instead of the fixed Support and Operations roles. New staff applications alert people with `staff.manage`.
- Every function in `admin/areas`, `catalog`, `chat`, `consumers`, `dispatch`, `disputes`, `farmerRequests`, `farmers`, `fees`, `ledger`, `listings`, `orders`, `payments`, `platform`, `riders` and `support` now checks a permission instead of a role list. The mapping kept each function's old meaning. For example, `disputes.resolve` needs `disputes.decide`, which Support and Finance have, as `DECIDERS` was before.
- `_generated/api.d.ts`: the five new modules are added in the same format `npx convex dev` writes.

### Tooling

- `scripts/local-spec.mjs` (new): prints the function spec of the `convex/` code without a deployment, in the same format as `npx convex function-spec`. `--only admin/` keeps the admin functions.
- `scripts/sync-generated-api.mjs` (new): rewrites the module list in `convex/_generated/api.d.ts` from the files in `convex/`.
- `web/scripts/gen-admin-api.mjs` and `npm run gen:admin` (new): build `web/src/convex/admin.ts` (typed references to every admin function) from `web/convex-spec/admin-function-spec.json`.

### Website (`web/`)

- `src/app/admin/layout.tsx`: titles ("… · Farmkeke Admin") and `noindex`.
- `src/app/admin/(auth)/`: `signin`, `apply`, `forgot-password`, `set-password`.
- `src/app/admin/(portal)/`, behind the gate:
  - dashboard: `/admin`;
  - `staff` and `staff/[memberId]`;
  - `roles`, `roles/new` and `roles/[roleId]`;
  - `audit`, `alerts` and `account`.
- `src/components/admin/`:
  - `AdminGate` decides what each visitor sees and shows the status screens (not staff, waiting, more information with an answer form, rejected, access removed).
  - `AdminShell` is the frame: sidebar (a drawer under 760px), alerts with a count, account, sign out, and sign-out after 30 minutes without activity, shared across tabs.
  - `AuthForms` holds the sign-in, apply, code, forgot-password and set-password forms.
  - `ui.tsx` has the shared pieces: page header, panels, facts, tables that turn into cards under 760px, badges, tabs, notices, and the reason and confirm dialogs.
  - Smaller files: `nav.ts`, `routes.ts`, `errors.ts`, `labels.ts`, `context.tsx`, `ParamPage.tsx`.
- `src/convex/admin.ts` (generated) and `src/convex/returns/admin.ts`.
- `src/components/system/SiteOnly.tsx` (new): hides the shop overlays under `/admin`.

### Shared-file changes (website)

- `src/app/layout.tsx`: `MiniCart`, `AreaPicker`, `CookieBanner` and `MaintenanceGate` are wrapped in `SiteOnly`. That keeps them off `/admin`; in particular, maintenance mode would otherwise lock staff out of the portal they use to turn it off.
- `src/app/robots.ts`: disallows `/admin`.
- `package.json`: adds the `gen:admin` script.

## 2. Deviations from the plan and why

- **Not limited to work emails** (owner's choice). Someone who already has a Farmkeke account applies with that account's password; the application is attached to their existing account.
- **The applicant confirms their email with a code** before the application reaches the Founder. Anyone can apply, so this stops applications made with someone else's address.
- **Legacy staff lose access until migrated.** Admin functions now need a verified portal session, so running them from the Convex dashboard "as a user" stops working. Run `admin/setup:migrateLegacyStaff` once after deploy; those people then sign in at /admin.
- **Two-step sign-in uses an emailed code, not an authenticator app.** The PRD asks for two-step verification; email codes need no extra setup. An authenticator app can be added later.
- **Only the Founder can hand out roles that approve staff or edit roles.** Admins with `staff.manage` can approve people, but only into roles without `staff.manage` or `roles.manage`. Nobody can change their own role or the Founder's.

## 3. Bugs found and fixed

- **The password link would have signed people out.** Calling a sign-in flow that returns no session (such as `staffReset`) from the browser makes Convex Auth's client clear its tokens. "Email me a password link" on the account page would have signed the person out on that device. Fixed with the `admin/access.sendPasswordLink` action, which runs the flow on the server. Found by reading `@convex-dev/auth` (`server/implementation/index.js`: `{ tokens: null }`; `react/client.js`: `setToken(null)`).
- **Convex Auth's email senders get the action context, but its types don't say so.** Wrapped with a typed `withCtx` helper, so the code email can tell "confirm your email" from "sign in".
- **Next 16 development warning on every portal page** ("Could not validate that a segment in your UI has instant navigation"). Portal pages render only after the browser confirms staff access, so the server can't prerender them. Each portal page and the portal layout now export `instant = false`. Setting it on the layout alone didn't work; it's needed on each page. This only showed in the browser console, not in typecheck or build.
- **Phone layout fixes:**
  - The Alerts link had a hidden label under 760px; it now always shows "Alerts", per the "icons always have a visible label" rule.
  - The staff member page now puts the Actions card first on phones and stops it stretching on desktop.
- **ESLint `react/no-unescaped-entities`:** apostrophes in page text are written `&apos;`, as on the rest of the site.

## 4. Verification

Commands, from the repo root unless noted:

- `node scripts/local-spec.mjs` compared with `web/convex-spec/live-function-spec.json`, before any change: **identical, 283 functions.** So deploying from `convex/` on this branch doesn't remove anything that's live.
- `npx tsc -p convex/tsconfig.json --noEmit`: passes.
- `cd convex-tests && npm test`: **30 passed, 1 failed.** The failure is `storefront.test.ts > every field in the live samples is still returned`. It reads `C:/Users/Guesttt/Documents/farmkeke/...`, a Windows path that doesn't exist here, and it failed the same way before this phase.
- New `convex-tests/admin.test.ts`, 8 tests, all passing:
  - the gate states;
  - a second session needs the code, and the 12-hour expiry;
  - permissions per role;
  - an application from confirmation through more information, approval, role change and removal, with every email and the audit log;
  - a rejected applicant applies again;
  - custom roles, with the Founder role fixed;
  - one Founder only, and the legacy migration;
  - **the real sign-in flows through Convex Auth's `signIn` action, with a throwaway signing key:**
    - apply with a weak password (refused), then apply properly;
    - a wrong code (refused), then the right code;
    - `createFounder` emails a link; the Founder sets a password, and the link only works once;
    - sign in with password and code;
    - forgot password: unknown emails get no email;
    - `sendPasswordLink` works.
- The existing tests now make staff through `convex-tests/staff.ts` (role, member and verified session). The old `super_admin` becomes the Founder, which still passes every check.
- `cd web && npx tsc --noEmit`: passes. `npx eslint src`: clean.
- `cd web && NODE_USE_ENV_PROXY=1 npx next build`: passes, with 14 `/admin` routes.
- **Visual check at 390px and 1440px:** 16 screens.
  - The live deployment doesn't have the new functions yet, so this ran in a scratch copy of the site with a sample-data Convex client. That copy isn't committed.
  - Screens: sign in, apply, forgot, set password, dashboard, staff list, an applicant, an applicant asked for more information, roles, role editor, audit log, alerts, account, the waiting / more information / not-staff screens, and an Operations user.
  - No page errors and no horizontal scroll at either width.
- **Not possible here:** a local Convex backend, because GitHub release downloads are blocked by this environment's network policy (403). The flows were instead tested through convex-test, as above.

## 5. Open questions or guesses

- **Session lengths** (guessed): a verified sign-in lasts 12 hours; idle sign-out is after 30 minutes. Both are constants: `STAFF_SESSION_HOURS` in `convex/admin/access.ts` and `IDLE_MS` in `AdminShell.tsx`.
- **Link and code lifetimes:** the Founder's first password link lasts 60 minutes, the same as forgot password. If it runs out, "Forgot password?" on /admin/signin sends a new one. Codes last 10 minutes.
- **What each built-in role can do** is in `convex/lib/permissions.ts`. The Founder can change any role except the Founder role from the Roles screen.
- **Email links** point at `WEBSITE_URL` (or https://farmkeke.com). Until farmkeke.com serves this code, set `WEBSITE_URL` to the address where the website is deployed, or the Founder's link won't open the portal.

## 6. Deploy steps (owner)

1. Pull `admin-portal` on the computer that deploys Convex.
2. Deploy the backend to the dev deployment: `npx convex dev --once`.
3. If anyone was given a staff role before the portal: `npx convex run admin/setup:migrateLegacyStaff`.
4. Create the Founder. Either:
   - `npx convex run admin/setup:createFounder '{"email":"you@farmkeke.com","name":"Your Name"}'`, or
   - in the dashboard, go to Functions, then `admin/setup`, then `createFounder`.
5. Deploy the website. Open the emailed link, make the password, and you're in.
6. Staff apply at `/admin/apply`. You approve them under "Staff and applications".

## 7. Merging with main

`main` moved on while this was built: "Phase 5 in progress: backend gap work (safety save, not deployed)", 916b917. A trial merge has no text conflicts, but:
- `main`'s own `convex/disputes.ts` doesn't typecheck yet (`hitLimit` and `disputeReason` are missing), so the merge was not kept. This branch stays on 1f89be3 until that work is finished.
- When merging, `admin/fees.ts:setSlotCapacity` (new on main) calls `requireStaff(ctx, ["operations"])`. Change it to `requireStaff(ctx, "fees.manage")`. Then run `node scripts/sync-generated-api.mjs` and the tests.

## 8. What's next

Phase 2 (approvals):
- farmer applications and farms;
- product review queue;
- categories, subtypes and units;
- home banners (the table exists; the admin functions are new).
