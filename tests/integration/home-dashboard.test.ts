import { describe, expect, it } from "vitest";
import {
  calculateMarkerPosition,
  fallbackDashboardIncidents,
  resolveDashboardIncidents,
  resolveSelectedIncidentId,
} from "../../apps/web/lib/home-dashboard";

describe("home dashboard", () => {
  it("maps lat/lng to a stable percentage within the visible bounds", () => {
    const position = calculateMarkerPosition({ latitude: 40.7128, longitude: -74.006 });

    expect(position.left).toBeGreaterThanOrEqual(0);
    expect(position.left).toBeLessThanOrEqual(100);
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.top).toBeLessThanOrEqual(100);
    expect(position.left).toBeCloseTo(29.44, 1);
    expect(position.top).toBeCloseTo(27.38, 1);
  });

  it("keeps the active incident in sync with the selected id", () => {
    const incidents = [
      { id: "a", title: "Westside fire", severity: "HIGH" },
      { id: "b", title: "Downtown theft", severity: "MEDIUM" },
      { id: "c", title: "Harbor medical", severity: "CRITICAL" },
    ] as const;

    expect(resolveSelectedIncidentId(incidents, "b")).toBe("b");
    expect(resolveSelectedIncidentId(incidents, "missing")).toBe("a");
  });

  it("falls back to demo incidents when live queries are unavailable", async () => {
    const result = await resolveDashboardIncidents({
      userId: "demo-user",
      getNearby: async () => {
        throw new Error("redis unavailable");
      },
      getActive: async () => {
        throw new Error("db unavailable");
      },
    });

    expect(result).toEqual(fallbackDashboardIncidents);
  });
});
