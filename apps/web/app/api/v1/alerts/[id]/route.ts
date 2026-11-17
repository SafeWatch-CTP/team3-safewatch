/*
 * ONE ALERT IN THE CALLER'S FEED
 * Endpoint: /api/v1/alerts/[id]   ([id] is an AlertLog id, not an Alert id)
 *
 * PATCH { read?: true, dismissed?: true }
 *  - read marks the alert seen; it stays in the feed, without its unread dot.
 *  - dismissed clears it out of the feed, and marks it read on the way.
 *  - Both flags are one-way. There is no screen for un-reading an alert, so
 *    the schema does not accept `false`.
 *  - 204 no body | 400 invalid body | 404 not the caller's | 401 no session
 *
 * Ownership: the id comes from the URL, so it is never trusted alone. The
 * update filters on both the id and currentUserId(), so a foreign or unknown
 * id touches zero rows and answers 404 — never 403, which would confirm the
 * alert exists.
 */
import { AuthenticationRequiredError, currentUserId } from "@project/auth";
import { AlertLogNotFoundError, alertLogUpdateSchema, updateAlertLogState } from "@project/domain";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await currentUserId();

    const body = await request.json().catch(() => null);
    const parsed = alertLogUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid alert update.",
          },
        },
        { status: 400 }
      );
    }

    await updateAlertLogState(userId, id, parsed.data);

    return new Response(null, { status: 204 });
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

    console.error("alert-update-error", error);

    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}
