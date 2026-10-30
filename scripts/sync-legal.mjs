// Copies the website's legal documents (web/src/content/legal/*.json) into the
// app (src/content/legal/), so both show the same wording. Metro can't read
// web/, so the app keeps its own copy. Run after any legal text change:
//   node scripts/sync-legal.mjs          copy
//   node scripts/sync-legal.mjs --check  exit 1 if the app's copy is out of date
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const from = "web/src/content/legal";
const to = "src/content/legal";
const check = process.argv.includes("--check");
// Drafts awaiting approval (e.g. refunds.proposed.json) stay on the website side
const docs = readdirSync(from).filter((f) => f.endsWith(".json") && !f.includes(".proposed."));

mkdirSync(to, { recursive: true });
let stale = [];
for (const file of docs) {
  const src = readFileSync(path.join(from, file), "utf8");
  const dest = path.join(to, file);
  if (existsSync(dest) && readFileSync(dest, "utf8") === src) continue;
  if (check) stale.push(file);
  else writeFileSync(dest, src);
}
if (check && stale.length > 0) {
  console.error(`App legal text is out of date: ${stale.join(", ")}. Run node scripts/sync-legal.mjs`);
  process.exit(1);
}
console.log(check ? "App legal text matches the website." : `Copied ${docs.length} legal documents to ${to}.`);
