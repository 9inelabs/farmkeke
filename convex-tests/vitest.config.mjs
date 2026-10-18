import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..").split(path.sep).join("/");

export default defineConfig({
  resolve: {
    // One copy of convex for the repo code and convex-test
    alias: [{ find: /^convex(\/.*)?$/, replacement: `${repo}/node_modules/convex$1` }],
  },
  server: { fs: { allow: [repo] } },
  test: {
    environment: "edge-runtime",
    include: ["*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
