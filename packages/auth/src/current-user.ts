export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function currentUserId(): Promise<string> {
  // Dynamic, not a top-level import: every route imports this seam, and it
  // must stay loadable without next-auth, next/headers or AUTH_SECRET
  // present. See docs/specs/auth.md.
  const { auth } = await import("./auth");
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationRequiredError();
  }
  return session.user.id;
}