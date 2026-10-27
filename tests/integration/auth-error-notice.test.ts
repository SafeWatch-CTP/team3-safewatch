import { describe, expect, it } from "vitest";
import { getAuthErrorNotice } from "../../apps/web/app/_components/auth-error-notice";

describe("GitHub sign-in notices", () => {
  it("explains that authorization was canceled", () => {
    expect(getAuthErrorNotice("OAuthAccessDenied")).toContain("authorization was canceled");
  });

  it("shows a generic message for other callback errors", () => {
    const notice = getAuthErrorNotice("OAuthCallbackError");

    expect(notice).toContain("could not be completed");
    expect(notice).not.toContain("OAuthCallbackError");
  });

  it("does not show a notice when there is no error", () => {
    expect(getAuthErrorNotice(undefined)).toBeNull();
  });
});
