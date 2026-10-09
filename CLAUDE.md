@AGENTS.md

## Phase reports

When completing a build phase (per the phased build order in the active build
spec), write a phase report instead of printing it to the terminal.

- Path: `docs/reports/NN-phase-name.md` (e.g. `01-foundations.md`), where `NN`
  is the zero-padded phase number and `phase-name` is a short kebab-case
  description.
- Format: plain markdown only. No terminal color codes, no box-drawing
  characters.
- Contents, in this order:
  1. What was built, by file
  2. Deviations from the spec and why
  3. Bugs found and fixed, including anything that only surfaced at
     bundle/runtime rather than at typecheck
  4. Verification: exact commands run and their results
  5. Open questions or decisions that had to be guessed
  6. What's next
- When done, print only the file path in the terminal response — not the
  report body.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
