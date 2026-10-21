import { describe, expect, it } from "vitest";
import { profileCompletionRedirect } from "../../apps/web/app/_components/profile-access";

describe("profile access routing", () => {
  it("routes users without a phone number to profile completion", () => {
    expect(profileCompletionRedirect(null)).toBe("/signup");
    expect(profileCompletionRedirect(undefined)).toBe("/signup");
    expect(profileCompletionRedirect("  ")).toBe("/signup");
  });

  it("allows users with a phone number to continue to the dashboard", () => {
    expect(profileCompletionRedirect("+15550000001")).toBeNull();
  });
});
