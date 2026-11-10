import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A route with no identity check hands out other people's data, and nothing
// else in the suite can see it: middleware does not exist, so every route
// asks for itself. This scan fails when a new one forgets.
const API_DIR = path.resolve(import.meta.dirname, "../../apps/web/app/api");

// Public by design: health is a liveness probe, the Auth.js handler *is* the
// sign-in flow, and register creates the account a session later identifies.
const PUBLIC_ROUTES = [
  "auth/[...nextauth]/route.ts",
  "health/route.ts",
  "v1/auth/register/route.ts",
];

const routeFiles = readdirSync(API_DIR, { recursive: true })
  .map((entry) => String(entry).split(path.sep).join("/"))
  .filter((file) => file.endsWith("route.ts"))
  .sort();

const protectedRoutes = routeFiles.filter((file) => !PUBLIC_ROUTES.includes(file));

describe("API route protection", () => {
  it("scans the route files it expects to find", () => {
    expect(routeFiles).toEqual(expect.arrayContaining(PUBLIC_ROUTES));
    expect(protectedRoutes.length).toBeGreaterThan(0);
  });

  it.each(protectedRoutes)("%s derives the user from the session", (file) => {
    const source = readFileSync(path.join(API_DIR, file), "utf8");

    expect(
      source,
      `${file} is a protected route and must derive identity via currentUserId() — add it, or add the path to PUBLIC_ROUTES with a reason`,
    ).toContain("currentUserId(");
  });

  it.each(PUBLIC_ROUTES)("%s is still present, so the allowlist cannot rot", (file) => {
    expect(routeFiles).toContain(file);
  });
});
