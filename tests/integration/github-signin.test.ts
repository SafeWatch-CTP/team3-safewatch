import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../support/next-headers";

type GitHubProfileFn = (
  profile: Record<string, unknown>,
  tokens: { access_token?: string },
) => Promise<{ id: string; email: string; name: string | null; emailVerified: Date }>;

describe("GitHub sign-in", () => {
  let authConfig: typeof import("../../packages/auth/src/auth").authConfig;
  let signIn: typeof import("../../packages/auth/src/auth").signIn;

  const githubProfile = () =>
    ((authConfig.providers[0] as any).options ?? authConfig.providers[0]).profile as GitHubProfileFn;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long-xx";
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.AUTH_TRUST_HOST = "true";
    process.env.GITHUB_ID = "test-client-id";
    process.env.GITHUB_SECRET = "test-client-secret";

    ({ authConfig, signIn } = await import("../../packages/auth/src/auth"));
  });

  beforeEach(() => {
    request.cookie = "";
    request.written = [];
    vi.unstubAllGlobals();
  });

  it("sends the user to GitHub asking only for their profile and email", async () => {
    const url = new URL(await signIn("github", { redirect: false }));

    expect(`${url.origin}${url.pathname}`).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
  });

  it("stores the PKCE verifier it will check when GitHub calls back", async () => {
    await signIn("github", { redirect: false });

    // The verifier never reaches the browser's JavaScript and expires in 15
    // minutes: a callback cannot be replayed with someone else's code.
    const verifier = request.written.find((cookie) =>
      cookie.name.includes("pkce.code_verifier"),
    );
    expect(verifier?.value).toBeTruthy();
    expect(verifier?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  });

  it("builds the account from GitHub's verified primary email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([
          { email: "unverified@example.com", primary: false, verified: false },
          { email: "dev@example.com", primary: true, verified: true },
        ]),
      ),
    );

    const user = await githubProfile()(
      { id: 42, login: "dev", name: "Dev Eloper", avatar_url: "https://example.com/a.png" },
      { access_token: "gho_test" },
    );

    expect(user).toMatchObject({ id: "42", email: "dev@example.com", name: "Dev Eloper" });
    expect(user.emailVerified).toBeInstanceOf(Date);
  });

  it("refuses to build an account when GitHub returns no access token", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("the email lookup must not be attempted");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(githubProfile()({ id: 42, login: "dev" }, {})).rejects.toThrow(
      /access token/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
