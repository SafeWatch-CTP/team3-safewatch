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
  // Boundary coverage for the phone rule. The letters cases are the reason the
  // rule checks the character set before counting digits: stripping non-digits
  // first turns "abc5551234567" into ten digits, which used to pass.
  const phoneCases: {phone: string; status: number; why: string}[] = [
    {phone: "5613093489", status: 201, why: "ten bare digits"},
    {phone: "(561) 309-3489", status: 201, why: "punctuation people type"},
    {phone: "561.309.3489", status: 201, why: "dots"},
    {phone: "+1 (555) 000-0099", status: 201, why: "eleven digits led by the US 1"},
    {phone: "abc5551234567", status: 400, why: "letters padding ten digits"},
    {phone: "561-309-3489 ext 4", status: 400, why: "an extension is not a number"},
    {phone: "123", status: 400, why: "too few digits"},
    {phone: "55512345678", status: 400, why: "eleven digits not led by 1"},
    {phone: "+44 555 000 0099", status: 400, why: "not a US number"},
    {phone: "561-309-3489-561-309-3489", status: 400, why: "over twenty characters"},
  ];

  it.each(phoneCases)("$phone -> $status ($why)", async ({phone, status}) => {
    const response = await POST(
      new Request("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({firstName: "Pat", lastName: "Lee", phoneNumber: phone}),
      })
    );

    expect(response.status).toBe(status);

    if (status === 400) {
      const payload = await response.json();
      expect(payload.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

// Verification for POST flow:
// pnpm vitest run tests/integration/contact-create.test.ts