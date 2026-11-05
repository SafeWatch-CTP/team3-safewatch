import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Returns no session: every case here is a signed-out caller.
const authMock = vi.fn(async () => null);

vi.mock("../../packages/auth/src/auth", () => ({ auth: authMock }));

describe("protected routes without a session", () => {
  let prisma: typeof import("@project/db").prisma;
  let alerts: typeof import("../../apps/web/app/api/v1/alerts/route");
  let contacts: typeof import("../../apps/web/app/api/v1/contacts/route");
  let contact: typeof import("../../apps/web/app/api/v1/contacts/[id]/route");

  const post = (url: string, body: unknown) =>
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    prisma = (await import("@project/db")).prisma;
    alerts = await import("../../apps/web/app/api/v1/alerts/route");
    contacts = await import("../../apps/web/app/api/v1/contacts/route");
    contact = await import("../../apps/web/app/api/v1/contacts/[id]/route");
  });

  beforeEach(async () => {
    await prisma.alert.deleteMany();
    await prisma.user.deleteMany();
    authMock.mockClear();
  });

  const expectUnauthorized = async (response: Response) => {
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "UNAUTHORIZED", message: expect.any(String) } });
  };

  it("refuses an SOS and writes nothing", async () => {
    const response = await alerts.POST(
      post("http://localhost/api/v1/alerts", { latitude: 40.7128, longitude: -74.006 }),
    );

    await expectUnauthorized(response);
    expect(await prisma.alert.count()).toBe(0);
  });

  it("refuses to list emergency contacts", async () => {
    await expectUnauthorized(await contacts.GET());
  });

  it("refuses to create an emergency contact and writes nothing", async () => {
    const response = await contacts.POST(
      post("http://localhost/api/v1/contacts", {
        firstName: "Not",
        lastName: "Mine",
        phoneNumber: "+15550000099",
      }),
    );

    await expectUnauthorized(response);
    expect(await prisma.emergencyContact.count()).toBe(0);
  });

  it("refuses to update someone's emergency contact", async () => {
    const response = await contact.PUT(
      new Request("http://localhost/api/v1/contacts/any-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Taken", lastName: "Over" }),
      }),
      { params: Promise.resolve({ id: "any-id" }) },
    );

    await expectUnauthorized(response);
  });

  it("refuses to delete someone's emergency contact", async () => {
    const response = await contact.DELETE(
      new Request("http://localhost/api/v1/contacts/any-id", { method: "DELETE" }),
      { params: Promise.resolve({ id: "any-id" }) },
    );

    await expectUnauthorized(response);
  });
});
