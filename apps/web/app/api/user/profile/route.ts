import { AuthenticationRequiredError, currentUserId } from "@project/auth";
import {
  CompleteUserProfileSchema,
  completeUserProfile,
} from "@project/domain";

export async function PATCH(request: Request) {
  try {
    const userId = await currentUserId();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
        { status: 400 },
      );
    }

    const parsed = CompleteUserProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid profile.",
          },
        },
        { status: 400 },
      );
    }

    const updated = await completeUserProfile(userId, parsed.data);
    if (!updated) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
        { status: 401 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "Phone number is already registered.",
          },
        },
        { status: 409 },
      );
    }

    console.error("user-profile-update-error", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
      { status: 500 },
    );
  }
}
