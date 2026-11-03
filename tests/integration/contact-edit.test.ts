import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../packages/auth/src/auth", () => ({
  auth: async () => ({ user: { id: "contact-owner" } }),
}));

// Ownership rules from docs/specs/contact-management.md: a contact belonging
// to another user is indistinguishable from one that does not exist — 404 for
// both PUT and DELETE, never 403.
describe("editing one emergency contact", () => {
  let prisma: typeof import("@project/db").prisma;
  let route: typeof import("../../apps/web/app/api/v1/contacts/[id]/route");

  const valid = {
    firstName: "Avery",
    lastName: "Stone",
    phoneNumber: "+15550000099",
    email: "avery@example.com",
    relationship: "SPOUSE" as const,
    isPrimary: false,
  };

  const put = (id: string, body: unknown) =>
    route.PUT(
      new Request(`http://localhost/api/v1/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  const del = (id: string) =>
    route.DELETE(
      new Request(`http://localhost/api/v1/contacts/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    prisma = (await import("@project/db")).prisma;
    route = await import("../../apps/web/app/api/v1/contacts/[id]/route");
  });

  beforeEach(async () => {
    await prisma.emergencyContact.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.createMany({
      data: [
        { id: "contact-owner", email: "owner@example.com", phoneNumber: "+15550000001" },
        { id: "other-user", email: "other@example.com", phoneNumber: "+15550000002" },
      ],
    });
  });

  const giveContact = (userId: string) =>
    prisma.emergencyContact.create({
      data: { ...valid, userId },
    });

  it("replaces the fields of the caller's own contact", async () => {
    const contact = await giveContact("contact-owner");

    const response = await put(contact.id, { ...valid, firstName: "Rowan", isPrimary: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: contact.id,
      firstName: "Rowan",
      isPrimary: true,
    });
  });

  it("returns 404 for another user's contact and leaves it untouched", async () => {
    const foreign = await giveContact("other-user");

    const response = await put(foreign.id, { ...valid, firstName: "Taken" });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
    expect(await prisma.emergencyContact.findUnique({ where: { id: foreign.id } })).toMatchObject({
      firstName: "Avery",
      userId: "other-user",
    });
  });

  it("returns 404 for an id that matches no contact", async () => {
    const response = await put("no-such-contact", valid);

    expect(response.status).toBe(404);
  });

  it("rejects an invalid update with 400 and changes nothing", async () => {
    const contact = await giveContact("contact-owner");

    const response = await put(contact.id, { ...valid, firstName: "" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
    expect(await prisma.emergencyContact.findUnique({ where: { id: contact.id } })).toMatchObject({
      firstName: "Avery",
    });
  });

  it("deletes the caller's own contact and returns 204 with no body", async () => {
    const contact = await giveContact("contact-owner");

    const response = await del(contact.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(await prisma.emergencyContact.count()).toBe(0);
  });

  it("returns 404 when deleting another user's contact, which survives", async () => {
    const foreign = await giveContact("other-user");

    const response = await del(foreign.id);

    expect(response.status).toBe(404);
    expect(await prisma.emergencyContact.count({ where: { id: foreign.id } })).toBe(1);
  });
});
