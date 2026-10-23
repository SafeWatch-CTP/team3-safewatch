import { describe, expect, it } from "vitest";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  SEVERITY_ORDER,
  SEVERITY_PIN,
  categoryLabel,
  initialView,
  mapSummary,
  pinName,
} from "../../apps/web/app/_components/incident-map-model";

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("severity pins", () => {
  it("cover every severity, most severe first", () => {
    expect(SEVERITY_ORDER).toEqual(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
  });

  it("never rely on color alone: letters and colors are all distinct", () => {
    const pins = Object.values(SEVERITY_PIN);
    expect(new Set(pins.map((p) => p.letter)).size).toBe(pins.length);
    expect(new Set(pins.map((p) => p.color)).size).toBe(pins.length);
  });

  it.each(SEVERITY_ORDER)("%s keeps at least 4.5:1 contrast with its white letter", (severity) => {
    expect(contrast(SEVERITY_PIN[severity].color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pinName", () => {
  it("leads with severity so it is heard first", () => {
    expect(pinName({ severity: "CRITICAL", title: "Building fire" })).toBe(
      "Critical severity: Building fire"
    );
  });
});

describe("categoryLabel", () => {
  it.each([
    ["SEVERE_WEATHER", "Severe weather"],
    ["TRAFFIC_HAZARD", "Traffic hazard"],
    ["FIRE", "Fire"],
  ] as const)("%s reads as %s", (category, label) => {
    expect(categoryLabel(category)).toBe(label);
  });
});

describe("mapSummary", () => {
  it.each([
    [0, "No active incidents to show right now."],
    [1, "1 active incident is pinned on this map."],
    [3, "3 active incidents are pinned on this map."],
  ])("%i incidents", (count, text) => {
    expect(mapSummary(count)).toBe(text);
  });
});

describe("initialView", () => {
  it("falls back to the city when there is nothing to show", () => {
    expect(initialView([])).toEqual({ kind: "center", center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  });

  it("fits a box around every pin", () => {
    const view = initialView([
      { latitude: 40.7, longitude: -74.0 },
      { latitude: 40.8, longitude: -73.9 },
      { latitude: 40.6, longitude: -74.1 },
    ]);
    expect(view).toEqual({
      kind: "bounds",
      bounds: [
        [40.6, -74.1],
        [40.8, -73.9],
      ],
    });
  });

  it("uses a zero-size box for a single pin (the zoom cap stops it zooming to the max)", () => {
    expect(initialView([{ latitude: 40.7, longitude: -74.0 }])).toEqual({
      kind: "bounds",
      bounds: [
        [40.7, -74.0],
        [40.7, -74.0],
      ],
    });
  });
});
