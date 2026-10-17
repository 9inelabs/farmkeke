// Prints public Convex functions and their argument types from the live spec.
// Usage (from web/): node scripts/spec.mjs convex-spec/live-function-spec.json orders/consumer checkout
import fs from "node:fs";
const [specFile, ...want] = process.argv.slice(2);
const fns = JSON.parse(fs.readFileSync(specFile, "utf8")).functions.filter((f) => f.identifier);
const t = (v) => {
  if (!v) return "?";
  switch (v.type) {
    case "string": case "number": case "boolean": case "null": case "any": case "bytes": case "bigint": return v.type;
    case "literal": return JSON.stringify(v.value);
    case "id": return `Id<${v.tableName}>`;
    case "array": return `${t(v.value)}[]`;
    case "union": return v.value.map(t).join(" | ");
    case "record": return `Record<${t(v.keys)},${t(v.values?.fieldType ?? v.values)}>`;
    case "object": return "{ " + Object.entries(v.value).map(([k, f]) => `${k}${f.optional ? "?" : ""}: ${t(f.fieldType)}`).join("; ") + " }";
    default: return v.type;
  }
};
for (const f of fns) {
  if (want.length && !want.some((w) => f.identifier.startsWith(w))) continue;
  if (f.visibility?.kind !== "public") continue;
  console.log(`${f.identifier} [${f.functionType}] ${t(f.args)}`);
}
