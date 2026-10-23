# App preview (browser)

The Farmkeke mobile app's web version, deployed by Vercel on every push to
`main` that changes the app. It is for checking screens while the app is
built. It talks to the live Convex deployment, so orders placed here are real.

Vercel project settings (set once, in a project separate from farmkeke.com):

- Root Directory: `app-preview` (this folder; `vercel.json` here does the rest)
- Framework Preset: Other
- Environment variable: `EXPO_PUBLIC_CONVEX_URL` = the same Convex URL as
  `NEXT_PUBLIC_CONVEX_URL` in the website project

Builds are skipped when nothing the app is built from has changed since the
last deployed commit (Vercel's `VERCEL_GIT_PREVIOUS_SHA`), so a push of only
website, backend or docs changes is skipped. It compares with the last
deployment, not the parent commit: a merge or docs commit on top of app
changes still builds. If the previous commit can't be found, it builds.
Search engines are told not to index the preview.

Native-only features behave differently in a browser: no push notifications,
and photos come from file upload rather than the camera.
