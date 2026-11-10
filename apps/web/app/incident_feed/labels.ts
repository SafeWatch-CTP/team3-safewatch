// Plain text for the incident enums. Keys mirror IncidentCategory in the
// database schema; tests/integration/incident-feed.test.ts keeps them in sync.
export const CATEGORY_LABELS: Record<string, string> = {
  CRIME: "Crime",
  FIRE: "Fire",
  MEDICAL: "Medical",
  SEVERE_WEATHER: "Severe weather",
  TRAFFIC_HAZARD: "Traffic hazard",
  CIVIL_UNREST: "Civil unrest",
  OTHER: "Other",
  UNCATEGORIZED: "Uncategorized",
};

export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INVESTIGATING: "Investigating",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const categoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;
