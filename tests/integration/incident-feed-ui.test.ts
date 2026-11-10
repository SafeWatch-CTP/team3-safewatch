import { describe, expect, it } from "vitest";
import { IncidentCategory } from "@project/db";
import { CATEGORY_LABELS } from "../../apps/web/app/incident_feed/labels";
import { formatRelativeTime } from "../../apps/web/app/incident_feed/relative-time";

describe("Feed tab relative time", () => {
  const now = new Date("2025-03-10T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;

  it("reads under a minute as just now", () => {
    expect(formatRelativeTime(ago(0), now)).toBe("Just now");
    expect(formatRelativeTime(ago(59_000), now)).toBe("Just now");
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime(ago(5 * MIN), now)).toBe("5 mins ago");
    expect(formatRelativeTime(ago(2 * 60 * MIN), now)).toBe("2 hrs ago");
    expect(formatRelativeTime(ago(3 * 24 * 60 * MIN), now)).toBe("3 days ago");
  });

  it("uses the singular for one", () => {
    expect(formatRelativeTime(ago(MIN), now)).toBe("1 min ago");
    expect(formatRelativeTime(ago(60 * MIN), now)).toBe("1 hr ago");
    expect(formatRelativeTime(ago(24 * 60 * MIN), now)).toBe("1 day ago");
  });

  it("switches unit at the boundary", () => {
    expect(formatRelativeTime(ago(59 * MIN), now)).toBe("59 mins ago");
    expect(formatRelativeTime(ago(23 * 60 * MIN + 59 * MIN), now)).toBe("23 hrs ago");
  });

  it("treats a time in the future as just now", () => {
    expect(formatRelativeTime(ago(-10 * MIN), now)).toBe("Just now");
  });
});

describe("Feed tab category labels", () => {
  it("has a label for every category in the schema, and no others", () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(Object.values(IncidentCategory).sort());
  });
});
