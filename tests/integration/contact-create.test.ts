import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../packages/auth/src/auth", () => ({
  auth: async () => ({ user: { id: "contact-user" } }),
}));

describe("emergency contacts creation", () => {
  let prisma: any;
  let POST: any;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    const dbModule = await import("@project/db");
    const routeModule = await import("../../apps/web/app/api/v1/contacts/route");

    prisma = dbModule.prisma;
    POST = routeModule.POST;

    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        id: "contact-user",
        email: "contact-user@example.com",
        phoneNumber: "+15550000001",
        password: "hashed-password",
      },
    });
  });

  it("creates a primary emergency contact for the current user", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: "Avery",
          lastName: "Stone",
          phoneNumber: "+15550000099",
          email: "avery@example.com",
          relationship: "SPOUSE",
          isPrimary: true,
        }),
      })
    );

    expect(response.status).toBe(201);

    const payload = await response.json();
    expect(payload.firstName).toBe("Avery");
    expect(payload.lastName).toBe("Stone");
    expect(payload.userId).toBe("contact-user");
    expect(payload.isPrimary).toBe(true);

    const saved = await prisma.emergencyContact.findFirst({
      where: { userId: "contact-user" },
      orderBy: { createdAt: "desc" },
    });

    expect(saved?.firstName).toBe("Avery");
    expect(saved?.phoneNumber).toBe("+15550000099");
  });
});

// Verification for POST flow:
// pnpm vitest run tests/integration/contact-create.test.ts