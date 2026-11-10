import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { request } from "../support/next-headers";

describe("Session validation", () => {
  let prisma: typeof import("@project/db").prisma;
  let currentUserId: typeof import("../../packages/auth/src/index").currentUserId;
  let AuthenticationRequiredError: typeof import("../../packages/auth/src/index").AuthenticationRequiredError;

  const giveTicket = async (token: string, expires: Date) => {
    const user = await prisma.user.create({
      data: { email: `${token}@example.com`, phoneNumber: "+15550000123", name: "Coat Owner" },
    });
    await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires } });
    request.cookie = `authjs.session-token=${token}`;
    return user;
  };

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long-xx";
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.AUTH_TRUST_HOST = "true";

    prisma = (await import("@project/db")).prisma;
    ({ currentUserId, AuthenticationRequiredError } = await import("../../packages/auth/src/index"));
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    request.cookie = "";
    request.written = [];
  });

  it("resolves a valid ticket to its owner", async () => {
    const user = await giveTicket("valid-ticket", new Date("2030-01-01"));
    await expect(currentUserId()).resolves.toBe(user.id);
  });

  it("refuses a forged ticket", async () => {
    request.cookie = "authjs.session-token=never-issued";
    await expect(currentUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("refuses an expired ticket", async () => {
    await giveTicket("stale-ticket", new Date("2020-01-01"));
    await expect(currentUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("refuses a ticket voided by sign-out", async () => {
    await giveTicket("voided-ticket", new Date("2030-01-01"));
    await prisma.session.deleteMany();
    await expect(currentUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("refuses a request with no ticket", async () => {
    await expect(currentUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("deletes the session row when the user signs out", async () => {
    await giveTicket("signed-out-ticket", new Date("2030-01-01"));
    const { signOut } = await import("../../packages/auth/src/auth");

    // redirect: false, or signOut throws NEXT_REDIRECT from next/navigation.
    await signOut({ redirect: false });

    expect(await prisma.session.count()).toBe(0);
    expect(request.written.find((c) => c.name.includes("session-token"))?.value).toBe("");
    await expect(currentUserId()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("writes the session cookie with the attributes that keep it private", async () => {
    await giveTicket("attributes-ticket", new Date("2030-01-01"));
    const { signOut } = await import("../../packages/auth/src/auth");

    await signOut({ redirect: false });

    const sessionCookie = request.written.find((c) => c.name === "authjs.session-token");
    expect(sessionCookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0, // clear-specific: 0 is how the browser is told to drop it
    });
  });

  it("marks the session cookie Secure when the app is served over https", async () => {
    const httpUrl = process.env.AUTH_URL;
    process.env.AUTH_URL = "https://safewatch.example";
    await giveTicket("secure-ticket", new Date("2030-01-01"));
    // Over https Auth.js reads and writes the __Secure- prefixed name only.
    request.cookie = "__Secure-authjs.session-token=secure-ticket";
    const { signOut } = await import("../../packages/auth/src/auth");

    try {
      await signOut({ redirect: false });
    } finally {
      process.env.AUTH_URL = httpUrl;
    }

    expect(await prisma.session.count()).toBe(0);
    const sessionCookie = request.written.find(
      (c) => c.name === "__Secure-authjs.session-token",
    );
    expect(sessionCookie?.options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("leaves cookie handling to the library's defaults", async () => {
    // The attribute tests above observe the cookie as it is cleared. They
    // generalize to the one Auth.js sets only while a single options object
    // serves both, which is true for as long as nothing overrides `cookies`.
    const { authConfig } = await import("../../packages/auth/src/auth");

    expect(authConfig.cookies).toBeUndefined();
    expect(authConfig.session?.strategy).toBe("database");
  });
});
