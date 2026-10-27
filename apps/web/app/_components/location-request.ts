import type { Coordinates } from "./device-location";

export type SaveResult = { ok: true; location: Coordinates } | { ok: false; message: string };

export const SAVE_TIMEOUT_MS = 10_000;

// Every outcome, including a request that never answers, resolves to a
// SaveResult, so the picker can't be left saving forever.
export async function putLocation(
  coordinates: Coordinates,
  timeoutMs = SAVE_TIMEOUT_MS
): Promise<SaveResult> {
  let response: Response;
  try {
    response = await fetch("/api/v1/location", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coordinates),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, message: "The server took too long to answer. Try again." };
    }
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }

  const body = await response.json().catch(() => null);
  if (response.ok && body) {
    return { ok: true, location: body };
  }
  return { ok: false, message: body?.error?.message ?? "Something went wrong. Try again." };
}
