import { beforeEach, describe, expect, it, vi } from "vitest";

const getHandler = vi.fn();

vi.mock("../../packages/auth/src/auth", () => ({
  handlers: {
    GET: getHandler,
    POST: vi.fn(),
  },
}));

describe("GitHub OAuth callback", () => {
  beforeEach(() => {
    getHandler.mockReset();
  });

  it("marks a provider access denial for the landing-page cancellation notice", async () => {
    getHandler.mockResolvedValue(
      Response.redirect("http://localhost:3000/?error=OAuthCallbackError", 302),
    );
    const { GET } = await import("../../apps/web/app/api/auth/[...nextauth]/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/callback/github?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?error=OAuthAccessDenied",
    );
  });

  it("preserves cookies while rewriting the provider denial redirect", async () => {
    getHandler.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: "/?error=OAuthCallbackError",
          "set-cookie": "authjs.state=; Path=/; HttpOnly",
        },
      }),
    );
    const { GET } = await import("../../apps/web/app/api/auth/[...nextauth]/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/callback/github?error=access_denied"),
    );

    expect(response.headers.get("set-cookie")).toContain("authjs.state=");
  });

  it("does not rewrite other callback errors", async () => {
    getHandler.mockResolvedValue(
      Response.redirect("http://localhost:3000/?error=OAuthCallbackError", 302),
    );
    const { GET } = await import("../../apps/web/app/api/auth/[...nextauth]/route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/callback/github?error=server_error"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?error=OAuthCallbackError",
    );
  });

  it("checks GitHub's issuer and removes it before Auth.js validates the callback", async () => {
    getHandler.mockResolvedValue(
      Response.redirect("http://localhost:3000/?", 302),
    );
    const { GET } = await import("../../apps/web/app/api/auth/[...nextauth]/route");

    await GET(
      new Request(
        "http://localhost:3000/api/auth/callback/github?code=valid-code&iss=https%3A%2F%2Fgithub.com%2Flogin%2Foauth",
      ),
    );

    const authRequest = getHandler.mock.calls[0][0] as Request;
    expect(new URL(authRequest.url).searchParams.has("iss")).toBe(false);
    expect(new URL(authRequest.url).searchParams.get("code")).toBe("valid-code");
  });

  it("rejects a callback with an unexpected issuer", async () => {
    const { GET } = await import("../../apps/web/app/api/auth/[...nextauth]/route");

    const response = await GET(
      new Request(
        "http://localhost:3000/api/auth/callback/github?code=invalid-code&iss=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?error=OAuthCallbackError",
    );
    expect(getHandler).not.toHaveBeenCalled();
  });
});
