import { AuthenticationRequiredError, currentUserId } from "@project/auth";
import { redirect } from "next/navigation";

// Signed out, or a session that has expired since the page was opened, goes
// to the landing page where signing in happens (same as /contacts).
export async function requireSignedIn() {
  try {
    await currentUserId();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/");
    throw error;
  }
}
