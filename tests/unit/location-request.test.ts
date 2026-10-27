import { afterEach, describe, expect, it, vi } from "vitest";
import { putLocation } from "../../apps/web/app/_components/location-request";

const NYC = { latitude: 40.7128, longitude: -74.006 };

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("putLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the saved location on 200", async () => {
    stubFetch(async () => Response.json(NYC));

    await expect(putLocation(NYC)).resolves.toEqual({ ok: true, location: NYC });
  });

  it("turns a request that never answers into an error instead of waiting forever", async () => {
    // Never settles on its own; only the abort signal can end it.
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    );

    await expect(putLocation(NYC, 20)).resolves.toEqual({
      ok: false,
      message: "The server took too long to answer. Try again.",
    });
  });

  it("reports a network failure as unreachable", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(putLocation(NYC)).resolves.toEqual({
      ok: false,
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  });

  it("shows the server's error message and nothing raw", async () => {
    stubFetch(async () =>
      Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Latitude must be between -90 and 90." } },
        { status: 400 }
      )
    );

    await expect(putLocation({ latitude: 91, longitude: 0 })).resolves.toEqual({
      ok: false,
      message: "Latitude must be between -90 and 90.",
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    stubFetch(async () => new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    await expect(putLocation(NYC)).resolves.toEqual({
      ok: false,
      message: "Something went wrong. Try again.",
    });
  });
});
