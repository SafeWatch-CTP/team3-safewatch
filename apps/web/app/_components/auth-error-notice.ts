export function getAuthErrorNotice(error: string | string[] | undefined) {
  const code = Array.isArray(error) ? error[0] : error;

  if (!code) return null;
  if (code === "OAuthAccessDenied") {
    return "GitHub authorization was canceled. You can try signing in again whenever you're ready.";
  }

  return "GitHub sign-in could not be completed. Please try again.";
}
