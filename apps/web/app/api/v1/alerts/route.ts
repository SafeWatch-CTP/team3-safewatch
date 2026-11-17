/*
 * ALERTS ROUTE
 * Endpoint: /api/v1/alerts
 *
 *  1. GET  — the caller's own alert feed, newest first, one page at a time.
 *            Query: window (24h | 7d), limit (1-50), cursor (an AlertLog id).
 *            200 { alerts, nextCursor } | 400 bad query | 404 foreign cursor
 *  2. POST — raises an SOS; see docs/specs/alerts/trigger-sos.md.
 *
 * Ownership: the user comes from currentUserId(), never from the request. A
 * cursor is matched on both its id and that user id, so another user's cursor
 * is 404 — never 403, which would confirm the row exists.
 */
import { AuthenticationRequiredError, currentUserId } from "@project/auth";
import {
  AlertLogNotFoundError,
  NoEmergencyContactsError,
  alertFeedQuerySchema,
  listAlertFeed,
  triggerSosAlert,
  triggerSosAlertSchema,
} from "@project/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await currentUserId();

    const { searchParams } = new URL(request.url);
    const parsed = alertFeedQuerySchema.safeParse({
      // undefined rather than null, so each field falls back to its default.
      window: searchParams.get("window") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid feed query.",
          },
        },
        { status: 400 }
      );
    }

    return Response.json(await listAlertFeed(userId, parsed.data), { status: 200 });
  } catch (error) {
    if (error instanceof AlertLogNotFoundError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: 404 }
      );
    }

    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
        { status: 401 }
      );
    }

    console.error("alert-feed-error", error);

    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await currentUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON." } },
        { status: 400 }
      );
    }

    const parsed = triggerSosAlertSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid SOS payload.",
          },
        },
        { status: 400 }
      );
    }

    const alert = await triggerSosAlert(userId, parsed.data);
    return Response.json(alert, { status: 201 });
  } catch (error) {
    if (error instanceof NoEmergencyContactsError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: 409 }
      );
    }

    console.error("sos-trigger-error", error);

    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
        { status: 401 }
      );
    }

    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}
