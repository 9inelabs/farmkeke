// Compares the Convex functions defined in convex/ with the live deployment's
// function spec, and prints what's missing or extra.
//
// Usage (from the repo root):
//   node scripts/check-coverage.mjs [spec.json] [--only prefix,prefix] [--list]
// Defaults to web/convex-spec/live-function-spec.json. Reads files only.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const specFile = args.find((a) => a.endsWith(".json")) ?? "web/convex-spec/live-function-spec.json";
const only = opt("--only")?.split(",").filter(Boolean) ?? [];
const root = path.resolve("convex");

const KINDS = {
  query: ["Query", "public"],
  mutation: ["Mutation", "public"],
  action: ["Action", "public"],
  internalQuery: ["Query", "internal"],
  internalMutation: ["Mutation", "internal"],
  internalAction: ["Action", "internal"],
};
// convexAuth() exports (Convex Auth's own functions)
const CONVEX_AUTH = {
  signIn: ["Action", "public"],
  signOut: ["Action", "public"],
  store: ["Mutation", "internal"],
  isAuthenticated: ["Query", "public"],
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "_generated" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|js)$/.test(entry.name) && !/\.d\.ts$|\.test\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

const local = new Map(); // id -> { type, visibility }
const routes = new Set();
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "schema.ts" || rel === "convex.config.ts" || rel === "auth.config.ts") continue;
  const module = rel.replace(/\.(ts|js)$/, ".js");
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/export\s+const\s+(\w+)\s*=\s*(query|mutation|action|internalQuery|internalMutation|internalAction)\s*\(/g)) {
    const [type, visibility] = KINDS[m[2]];
    local.set(`${module}:${m[1]}`, { type, visibility });
  }
  const destructured = src.match(/export\s+const\s+\{([^}]+)\}\s*=\s*convexAuth\s*\(/);
  if (destructured) {
    for (const name of destructured[1].split(",").map((s) => s.trim())) {
      if (CONVEX_AUTH[name]) local.set(`${module}:${name}`, { type: CONVEX_AUTH[name][0], visibility: CONVEX_AUTH[name][1] });
    }
  }
  if (rel === "http.ts") {
    for (const m of src.matchAll(/path:\s*"([^"]+)",\s*method:\s*"([A-Z]+)"/g)) routes.add(`${m[2]} ${m[1]}`);
    if (/auth\.addHttpRoutes\(/.test(src)) {
      routes.add("GET /.well-known/openid-configuration");
      routes.add("GET /.well-known/jwks.json");
    }
  }
}

const spec = JSON.parse(fs.readFileSync(specFile, "utf8")).functions;
const live = new Map();
const liveRoutes = new Set();
for (const f of spec) {
  if (f.identifier) live.set(f.identifier, { type: f.functionType, visibility: f.visibility?.kind });
  else if (f.functionType === "HttpAction") liveRoutes.add(`${f.method} ${f.path}`);
}

const keep = (id) => only.length === 0 || only.some((p) => id.startsWith(p));
const byFile = new Map();
const bump = (id, key) => {
  const file = id.split(":")[0];
  const row = byFile.get(file) ?? { live: 0, covered: 0, missing: [], extra: [], mismatch: [] };
  row[key] = typeof row[key] === "number" ? row[key] + 1 : row[key];
  byFile.set(file, row);
  return row;
};

for (const [id, f] of live) {
  if (!keep(id)) continue;
  const row = bump(id, "live");
  const mine = local.get(id);
  if (!mine) row.missing.push(`${id.split(":")[1]} (${f.visibility} ${f.type})`);
  else {
    row.covered++;
    if (mine.type !== f.type || mine.visibility !== f.visibility) {
      row.mismatch.push(`${id.split(":")[1]}: live ${f.visibility} ${f.type}, local ${mine.visibility} ${mine.type}`);
    }
  }
}
for (const [id, f] of local) {
  if (!keep(id) || live.has(id)) continue;
  bump(id, "x").extra.push(`${id.split(":")[1]} (${f.visibility} ${f.type})`);
}

let totalLive = 0;
let totalCovered = 0;
const lines = [];
for (const [file, row] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
  totalLive += row.live;
  totalCovered += row.covered;
  const status = row.missing.length === 0 && row.mismatch.length === 0 ? "ok" : row.covered === 0 ? "MISSING" : "PARTIAL";
  if (!flag("--list") && status === "ok" && row.extra.length === 0) continue;
  lines.push(`${file}  ${row.covered}/${row.live}  ${status}`);
  for (const m of row.missing) lines.push(`  - missing ${m}`);
  for (const m of row.mismatch) lines.push(`  ! kind ${m}`);
  for (const m of row.extra) lines.push(`  + extra ${m}`);
}
const missingRoutes = [...liveRoutes].filter((r) => !routes.has(r));
const extraRoutes = [...routes].filter((r) => !liveRoutes.has(r));

console.log(`Live spec: ${specFile}`);
console.log(`Functions: ${totalCovered}/${totalLive} live functions defined locally${only.length ? ` (only ${only.join(", ")})` : ""}`);
console.log(`HTTP routes: ${liveRoutes.size - missingRoutes.length}/${liveRoutes.size}`);
for (const r of missingRoutes) console.log(`  - missing route ${r}`);
for (const r of extraRoutes) console.log(`  + extra route ${r}`);
console.log("");
console.log(lines.length ? lines.join("\n") : "Every file matches.");
process.exitCode = totalCovered === totalLive && missingRoutes.length === 0 ? 0 : 1;
