export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function currentUserId(): Promise<string> {
  const { auth } = await import("./auth");
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationRequiredError();
  }
  return session.user.id;
}