export type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function getVerifiedGitHubEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub email lookup failed with status ${response.status}`);
  }

  const emails: unknown = await response.json();
  if (!Array.isArray(emails)) {
    throw new Error("GitHub returned an invalid email list");
  }

  const primaryVerifiedEmail = emails.find(
    (email): email is GitHubEmail =>
      typeof email === "object" &&
      email !== null &&
      "email" in email &&
      typeof email.email === "string" &&
      "primary" in email &&
      email.primary === true &&
      "verified" in email &&
      email.verified === true
  );

  if (!primaryVerifiedEmail) {
    throw new Error("GitHub account has no verified primary email");
  }

  return primaryVerifiedEmail.email;
}
