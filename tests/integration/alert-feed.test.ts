import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../packages/auth/src/auth", () => ({
  auth: async () => ({ user: { id: "feed-owner" } }),
}));

// Ownership and windowing rules from docs/specs/alerts/alert-feed.md: a user
// sees only AlertLog rows addressed to them, inside the selected window, and
// a cursor that is not theirs is 404 rather than a readable position in
// someone else's feed.
describe("the alert feed", () => {
  let prisma: typeof import("@project/db").prisma;
  let route: typeof import("../../apps/web/app/api/v1/alerts/route");

  const get = (query = "") =>
    route.GET(new Request(`http://localhost/api/v1/alerts${query}`));

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const daysAgo = (days: number) => minutesAgo(days * 24 * 60);

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    prisma = (await import("@project/db")).prisma;
    route = await import("../../apps/web/app/api/v1/alerts/route");
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

  /** One alert addressed to one user, arriving at a given time. */
  const giveAlert = async (
    userId: string,
    { title = "Flash flood warning", sentAt = minutesAgo(5), readAt = null as Date | null } = {},
  ) => {
    const alert = await prisma.alert.create({
      data: { title, body: "Body text.", severity: "WARNING", audience: "GEOFENCED_ZONE" },
    });

    return prisma.alertLog.create({
      data: { alertId: alert.id, userId, channel: "IN_APP", status: "DELIVERED", sentAt, readAt },
    });
  };

  it("returns only the caller's own alerts", async () => {
    await giveAlert("feed-owner", { title: "Mine" });
    await giveAlert("other-user", { title: "Theirs" });

    const body = await (await get()).json();

    expect(body.alerts.map((a: { title: string }) => a.title)).toEqual(["Mine"]);
  });

  it("leaves out an alert that arrived before the window", async () => {
    await giveAlert("feed-owner", { title: "Inside", sentAt: minutesAgo(30) });
    await giveAlert("feed-owner", { title: "Outside", sentAt: daysAgo(3) });

    const day = await (await get("?window=24h")).json();
    expect(day.alerts.map((a: { title: string }) => a.title)).toEqual(["Inside"]);

    const week = await (await get("?window=7d")).json();
    expect(week.alerts.map((a: { title: string }) => a.title)).toEqual(["Inside", "Outside"]);
  });

  it("pages with a cursor without repeating or skipping a row", async () => {
    for (let i = 0; i < 9; i++) {
      await giveAlert("feed-owner", { title: `Alert ${i}`, sentAt: minutesAgo(i + 1) });
    }

    const first = await (await get("?limit=5")).json();
    expect(first.alerts).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();

    const second = await (await get(`?limit=5&cursor=${first.nextCursor}`)).json();
    expect(second.alerts).toHaveLength(4);
    expect(second.nextCursor).toBeNull();

    const seen = [...first.alerts, ...second.alerts].map((a: { id: string }) => a.id);
    expect(new Set(seen).size).toBe(9);
  });

  it("hides a dismissed alert", async () => {
    const log = await giveAlert("feed-owner", { title: "Dismissed" });
    await prisma.alertLog.update({ where: { id: log.id }, data: { dismissedAt: new Date() } });

    expect((await (await get()).json()).alerts).toEqual([]);
  });

  it("marks an unread alert unread, and a read one not", async () => {
    await giveAlert("feed-owner", { title: "Unread" });
    await giveAlert("feed-owner", { title: "Read", sentAt: minutesAgo(9), readAt: minutesAgo(8) });

    const body = await (await get()).json();

    expect(body.alerts).toMatchObject([{ title: "Unread", unread: true }, { title: "Read", unread: false }]);
  });

  it("rejects a window it does not recognise instead of serving the default", async () => {
    const response = await get("?window=30d");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("returns 404 for a cursor belonging to another user", async () => {
    const foreign = await giveAlert("other-user");

    const response = await get(`?cursor=${foreign.id}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
