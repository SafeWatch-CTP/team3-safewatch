import { describe, expect, it } from "vitest";
import { relativeTime } from "../../apps/web/app/alerts/relative-time";

// A fixed instant, so every case is a difference rather than a clock reading.
const NOW = new Date("2026-11-17T12:00:00.000Z");

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** An ISO timestamp `ms` milliseconds before NOW. */
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("relativeTime", () => {
  it("calls anything under a minute 'just now'", () => {
    expect(relativeTime(ago(0), NOW)).toBe("just now");
    expect(relativeTime(ago(30 * SECOND), NOW)).toBe("just now");
    expect(relativeTime(ago(MINUTE - SECOND), NOW)).toBe("just now");
  });

  it("switches to minutes at exactly one minute, and counts whole minutes", () => {
    expect(relativeTime(ago(MINUTE), NOW)).toBe("1m ago");
    expect(relativeTime(ago(8 * MINUTE), NOW)).toBe("8m ago");
    // Rounds down: 8m59s is still 8m, not 9m.
    expect(relativeTime(ago(8 * MINUTE + 59 * SECOND), NOW)).toBe("8m ago");
  });

  it("switches to hours at exactly one hour, never showing '60m ago'", () => {
    expect(relativeTime(ago(HOUR - SECOND), NOW)).toBe("59m ago");
    expect(relativeTime(ago(HOUR), NOW)).toBe("1h ago");
    expect(relativeTime(ago(3 * HOUR), NOW)).toBe("3h ago");
  });

  it("switches to days at exactly 24 hours, never showing '24h ago'", () => {
    expect(relativeTime(ago(DAY - MINUTE), NOW)).toBe("23h ago");
    expect(relativeTime(ago(DAY), NOW)).toBe("1d ago");
    expect(relativeTime(ago(9 * DAY), NOW)).toBe("9d ago");
  });

  it("does not count up from a timestamp in the future", () => {
    // A phone's clock running ahead of the server's is ordinary, and an alert
    // "in 3m" would be worse than one that reads as having just arrived.
    expect(relativeTime(ago(-3 * MINUTE), NOW)).toBe("just now");
  });

  it("reads the row's timestamp as an instant, not as local wall-clock time", () => {
    // The same moment written in a different offset is the same moment: the
    // label must not shift by the offset's hours.
    const sameInstant = new Date(NOW.getTime() - 2 * HOUR);
    const asUtc = sameInstant.toISOString();
    const asOffset = sameInstant.toISOString().replace("Z", "+00:00");

    expect(relativeTime(asUtc, NOW)).toBe("2h ago");
    expect(relativeTime(asOffset, NOW)).toBe("2h ago");
  });
});
