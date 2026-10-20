import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("../../packages/auth/src/auth", () => ({
  auth: authMock,
}));

describe("user profile completion", () => {
  let prisma: any;
  let PATCH: any;

  const updateProfile = (body: unknown) =>
    PATCH(
      new Request("http://localhost/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    const dbModule = await import("@project/db");
    const routeModule = await import("../../apps/web/app/api/user/profile/route");

    prisma = dbModule.prisma;
    PATCH = routeModule.PATCH;
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        id: "profile-user",
        email: "profile-user@example.com",
        name: "GitHub Name",
      },
    });
    await prisma.user.create({
      data: {
        id: "other-profile-user",
        email: "other-profile-user@example.com",
        phoneNumber: "+15550000002",
      },
    });
    authMock.mockResolvedValue({ user: { id: "profile-user" } });
  });

  it("updates only the signed-in user's profile", async () => {
    const response = await updateProfile({
      name: "Updated Name",
      phoneNumber: "+15550000003",
      userId: "other-profile-user",
    });

    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: "profile-user" } })).toMatchObject({
      name: "Updated Name",
      phoneNumber: "+15550000003",
    });
    expect(await prisma.user.findUnique({ where: { id: "other-profile-user" } })).toMatchObject({
      name: null,
      phoneNumber: "+15550000002",
    });
  });

  it("returns a conflict without changing the user when the phone is taken", async () => {
    const response = await updateProfile({
      name: "Updated Name",
      phoneNumber: "+15550000002",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "CONFLICT" },
    });
    expect(await prisma.user.findUnique({ where: { id: "profile-user" } })).toMatchObject({
      name: "GitHub Name",
      phoneNumber: null,
    });
  });

  it("rejects invalid profile data", async () => {
    const response = await updateProfile({ name: "", phoneNumber: "abc" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("requires a session", async () => {
    authMock.mockResolvedValueOnce(null);

    const response = await updateProfile({
      name: "Updated Name",
      phoneNumber: "+15550000003",
    });

    expect(response.status).toBe(401);
    expect(await prisma.user.findUnique({ where: { id: "profile-user" } })).toMatchObject({
      name: "GitHub Name",
      phoneNumber: null,
    });
  });

  it("returns not found if the session user no longer exists", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "deleted-user" } });

    const response = await updateProfile({
      name: "Updated Name",
      phoneNumber: "+15550000003",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
