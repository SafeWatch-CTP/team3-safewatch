import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // next-auth imports "next/server", and Next ships no package.json#exports
    // map — Node's ESM resolver can't find it. Inlining lets Vite resolve it.
    server: { deps: { inline: ["next-auth"] } },
  },
  resolve: {
    // There is no request scope in a test, so `next/headers` throws. The stub
    // lets a test supply the cookie that Auth.js reads.
    alias: {
      "next/headers": path.resolve(here, "tests/support/next-headers.ts"),
    },
  },
});
