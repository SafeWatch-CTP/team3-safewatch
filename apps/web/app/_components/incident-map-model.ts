// Pure helpers for the incident map: severity styling, accessible pin names,
// and the initial view. No Leaflet import, so the server-rendered key and the
// unit tests can use it. Behavior: docs/specs/incidents/incident-map.md.
import type { IncidentListItem } from "@project/domain";

export type MapIncident = Pick<
  IncidentListItem,
  "id" | "title" | "severity" | "category" | "address" | "latitude" | "longitude"
>;

type Severity = IncidentListItem["severity"];

// Feed order (most severe first). Each color keeps at least 4.5:1 contrast
// with the white letter on the pin; the letter means severity is never
// conveyed by color alone.
export const SEVERITY_PIN: Record<Severity, { label: string; letter: string; color: string }> = {
  CRITICAL: { label: "Critical", letter: "C", color: "#991b1b" },
  HIGH: { label: "High", letter: "H", color: "#c2410c" },
  MEDIUM: { label: "Medium", letter: "M", color: "#854d0e" },
  LOW: { label: "Low", letter: "L", color: "#1d4ed8" },
};

export const SEVERITY_ORDER = Object.keys(SEVERITY_PIN) as Severity[];

// The pin's accessible name. Leads with severity so a screen-reader user
// tabbing through pins hears the most important thing first.
export function pinName(incident: Pick<MapIncident, "severity" | "title">): string {
  return `${SEVERITY_PIN[incident.severity].label} severity: ${incident.title}`;
}

// "SEVERE_WEATHER" -> "Severe weather", so screen readers don't spell out
// the underscore.
export function categoryLabel(category: MapIncident["category"]): string {
  const words = category.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function incidentAnchorId(id: string): string {
  return `incident-${id}`;
}

export function mapSummary(count: number): string {
  if (count === 0) return "No active incidents to show right now.";
  return count === 1
    ? "1 active incident is pinned on this map."
    : `${count} active incidents are pinned on this map.`;
}

export const DEFAULT_CENTER: [number, number] = [40.7128, -74.006]; // New York City
export const DEFAULT_ZOOM = 11;
export const MAX_FIT_ZOOM = 15;

export type InitialView =
  | { kind: "center"; center: [number, number]; zoom: number }
  | { kind: "bounds"; bounds: [[number, number], [number, number]] };

// Fit every pin; with nothing to show, fall back to the city.
export function initialView(incidents: Pick<MapIncident, "latitude" | "longitude">[]): InitialView {
  if (incidents.length === 0) {
    return { kind: "center", center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  }
  const lats = incidents.map((i) => i.latitude);
  const lngs = incidents.map((i) => i.longitude);
  return {
    kind: "bounds",
    bounds: [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ],
  };
}
