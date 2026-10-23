import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Auth.js database sessions", () => {
  let prisma: typeof import("@project/db").prisma;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    const dbModule = await import("@project/db");
    prisma = dbModule.prisma;
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("persists a session token linked to its user", async () => {
    const user = await prisma.user.create({
      data: {
        id: "oauth-session-user",
        email: "oauth-session@example.com",
        phoneNumber: "+15550000123",
        name: "OAuth User",
      },
    });
    const sessionInput = {
      sessionToken: "test-session-token",
      userId: user.id,
      expires: new Date("2030-01-01T00:00:00.000Z"),
    };

    await prisma.session.create({ data: sessionInput });
    const storedSession = await prisma.session.findUnique({
      where: { sessionToken: sessionInput.sessionToken },
      include: { user: true },
    });

    expect(storedSession).toMatchObject({
      sessionToken: sessionInput.sessionToken,
      userId: user.id,
      expires: sessionInput.expires,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  });
});
