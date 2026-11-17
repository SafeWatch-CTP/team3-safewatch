import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../packages/auth/src/auth", () => ({
  auth: async () => ({ user: { id: "feed-owner" } }),
}));

// Read and dismiss rules from docs/specs/alerts/alert-feed.md: both are
// one-way, dismissing implies reading, and another user's alert is 404.
describe("marking an alert read or dismissed", () => {
  let prisma: typeof import("@project/db").prisma;
  let route: typeof import("../../apps/web/app/api/v1/alerts/[id]/route");

  const patch = (id: string, body: unknown) =>
    route.PATCH(
      new Request(`http://localhost/api/v1/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    prisma = (await import("@project/db")).prisma;
    route = await import("../../apps/web/app/api/v1/alerts/[id]/route");
  });

  beforeEach(async () => {
    await prisma.alertLog.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.createMany({
      data: [
        { id: "feed-owner", email: "owner@example.com", phoneNumber: "+15550000001" },
        { id: "other-user", email: "other@example.com", phoneNumber: "+15550000002" },
      ],
    });
  });

  const giveAlert = async (userId: string) => {
    const alert = await prisma.alert.create({
      data: { title: "Flash flood warning", body: "Body.", severity: "WARNING" },
    });

    return prisma.alertLog.create({
      data: { alertId: alert.id, userId, channel: "IN_APP", status: "DELIVERED" },
    });
  };

  it("marks the caller's own alert read and leaves it in the feed", async () => {
    const log = await giveAlert("feed-owner");

    const response = await patch(log.id, { read: true });
    expect(response.status).toBe(204);

    const after = await prisma.alertLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(after.readAt).not.toBeNull();
    expect(after.dismissedAt).toBeNull();
  });

  it("marks a dismissed alert read on the way out", async () => {
    const log = await giveAlert("feed-owner");

    expect((await patch(log.id, { dismissed: true })).status).toBe(204);

    const after = await prisma.alertLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(after.dismissedAt).not.toBeNull();
    expect(after.readAt).not.toBeNull();
  });

  it("returns 404 for another user's alert and changes nothing", async () => {
    const foreign = await giveAlert("other-user");

    const response = await patch(foreign.id, { dismissed: true });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });

    const after = await prisma.alertLog.findUniqueOrThrow({ where: { id: foreign.id } });
    expect(after.dismissedAt).toBeNull();
    expect(after.readAt).toBeNull();
  });

  it("rejects a body that asks for nothing", async () => {
    const log = await giveAlert("feed-owner");

    const response = await patch(log.id, {});

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("refuses to un-read an alert", async () => {
    const log = await giveAlert("feed-owner");

    expect((await patch(log.id, { read: false })).status).toBe(400);
  });
});
