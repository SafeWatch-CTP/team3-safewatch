import { afterEach, describe, expect, it, vi } from "vitest";
import { getVerifiedGitHubEmail } from "../../packages/auth/src/github-email";

describe("verified GitHub email lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns only the verified primary email", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json([
        { email: "secondary@example.com", primary: false, verified: true },
        { email: "unverified@example.com", primary: true, verified: false },
        { email: "primary@example.com", primary: true, verified: true },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getVerifiedGitHubEmail("github-token")).resolves.toBe(
      "primary@example.com",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer github-token",
        }),
      }),
    );
  });

  it("rejects accounts without a verified primary email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          { email: "secondary@example.com", primary: false, verified: true },
          { email: "unverified@example.com", primary: true, verified: false },
        ]),
      ),
    );

    await expect(getVerifiedGitHubEmail("github-token")).rejects.toThrow(
      "GitHub account has no verified primary email",
    );
  });

  it("surfaces GitHub API failures without accepting an unverified fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(getVerifiedGitHubEmail("github-token")).rejects.toThrow(
      "GitHub email lookup failed with status 403",
    );
  });

  it("rejects malformed email-list responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));

    await expect(getVerifiedGitHubEmail("github-token")).rejects.toThrow(
      "GitHub returned an invalid email list",
    );
  });
});
