#!/bin/bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 skips the
# build, exit 1 builds. Builds when anything the app is made from changed since
# the last deployed commit, not just since the parent, so a merge or docs commit
# on top of app changes still builds. If that commit can't be found, it builds.
cd "$(dirname "$0")/.." || exit 1
prev="$VERCEL_GIT_PREVIOUS_SHA"
if [ -z "$prev" ] || ! git cat-file -e "$prev^{commit}" 2>/dev/null; then
  exit 1
fi
git diff --quiet "$prev" HEAD -- app src assets package.json package-lock.json app.json babel.config.js metro.config.js app-preview
