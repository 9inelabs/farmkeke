// Prints the function spec of the convex/ code in this checkout, in the same
// shape as `npx convex function-spec`, without contacting any deployment.
// Used to compare the code with web/convex-spec/live-function-spec.json before
// a deploy, and to type the Admin Portal's calls to functions not yet live.
//   node scripts/local-spec.mjs > /tmp/local.json
// --only <prefix> keeps public functions whose file starts with the prefix:
//   node scripts/local-spec.mjs --only admin/ > web/convex-spec/admin-function-spec.json
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(root, "node_modules/convex/package.json"));
const esbuild = require("esbuild");

const dir = path.join(root, "convex");
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "_generated") walk(full);
    } else if (/\.ts$/.test(e.name) && !e.name.endsWith(".d.ts") && !e.name.endsWith(".test.ts")) files.push(full);
  }
};
walk(dir);
const skip = new Set(["schema.ts", "convex.config.ts", "auth.config.ts", "crons.ts", "http.ts"]);
const modules = files.filter((f) => !skip.has(path.relative(dir, f)));
const entry = modules
  .map((f, i) => `export * as m${i} from ${JSON.stringify(f)};`)
  .join("\n");

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fk-spec-")), "bundle.mjs");
await esbuild.build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
const mod = await import(pathToFileURL(out).href);

const functions = [];
modules.forEach((f, i) => {
  const file = path.relative(dir, f).split(path.sep).join("/").replace(/\.ts$/, ".js");
  for (const [name, fn] of Object.entries(mod[`m${i}`])) {
    if (!fn || typeof fn !== "function" && typeof fn !== "object") continue;
    const kind = fn.isQuery ? "Query" : fn.isMutation ? "Mutation" : fn.isAction ? "Action" : null;
    if (!kind || typeof fn.exportArgs !== "function") continue;
    functions.push({
      identifier: `${file}:${name}`,
      functionType: kind,
      visibility: { kind: fn.isPublic ? "public" : "internal" },
      args: JSON.parse(fn.exportArgs()),
      returns: fn.exportReturns ? JSON.parse(fn.exportReturns() ?? "null") : null,
    });
  }
});
functions.sort((a, b) => a.identifier.localeCompare(b.identifier));
const only = process.argv.indexOf("--only");
if (only !== -1) {
  const prefix = process.argv[only + 1] ?? "";
  const kept = functions.filter((f) => f.identifier.startsWith(prefix) && f.visibility.kind === "public");
  functions.length = 0;
  functions.push(...kept);
}
process.stdout.write(JSON.stringify({ functions }, null, 2) + "\n");
