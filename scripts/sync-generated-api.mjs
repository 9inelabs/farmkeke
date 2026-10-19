// Rewrites the module list in convex/_generated/api.d.ts from the files in
// convex/, the same list `npx convex dev` writes. For working on the backend
// without a deployment (cloud sessions); `npx convex dev` overwrites it with
// identical output.
//   node scripts/sync-generated-api.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "convex");
const skip = new Set(["schema", "convex.config", "auth.config"]);
const modules = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "_generated") walk(full);
    } else if (/\.ts$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      const mod = path.relative(dir, full).split(path.sep).join("/").replace(/\.ts$/, "");
      if (!skip.has(mod)) modules.push(mod);
    }
  }
};
walk(dir);
modules.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const alias = (m) => m.replace(/\//g, "_").replace(/\./g, "_");
const key = (m) => (/^[A-Za-z_$][\w$]*$/.test(m) ? m : JSON.stringify(m));

const file = path.join(dir, "_generated/api.d.ts");
let src = fs.readFileSync(file, "utf8");
const imports = modules.map((m) => `import type * as ${alias(m)} from "../${m}.js";`).join("\n");
src = src.replace(/(import type \* as [^\n]+\n)+/, imports + "\n");
const entries = modules.map((m) => `  ${key(m)}: typeof ${alias(m)};`).join("\n");
src = src.replace(/declare const fullApi: ApiFromModules<\{\n[\s\S]*?\n\}>;/, `declare const fullApi: ApiFromModules<{\n${entries}\n}>;`);
fs.writeFileSync(file, src);
console.log(modules.length, "modules");
