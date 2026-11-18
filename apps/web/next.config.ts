import type { NextConfig } from "next";
import path from "node:path";
import {fileURLToPath} from "node:url";

// Next.js only reads env files from apps/web; load the repo-root .env too.
// Skipped silently when the file doesn't exist.
try {
  process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"));
} catch {}

const nextConfig: NextConfig = {
  // PGlite ships WASM; let Node load it directly instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter"],

  // The Prisma client lives in packages/db/src/generated/prisma and finds its
  // query engine by looking next to its own file. `next build` bundles it
  // into .next/, where that file isn't, so every query fails in production
  // while `next dev` works fine. Load it from where it was generated instead.
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals.push(
        ({ context, request }: { context?: string; request?: string }, callback: (err?: Error, result?: string) => void) =>
          context && request?.endsWith("generated/prisma")
            ? callback(undefined, `commonjs ${path.resolve(context, request)}`)
            : callback()
      );
    }
    return config;
  },
};

export default nextConfig;
